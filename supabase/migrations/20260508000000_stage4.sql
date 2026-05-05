-- Stage 4: coaches (lite marketplace), scoped context packs, bookings, ratings

alter table public.profiles add column if not exists is_admin boolean not null default false;

create table public.coaches (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique,
  headline text not null,
  bio text not null default '',
  specialties text[] not null default '{}'::text[],
  languages text[] not null default '{}'::text[],
  timezone text not null default 'UTC',
  session_price_display text not null default 'See booking link',
  session_amount_cents integer not null default 0 check (session_amount_cents >= 0),
  currency text not null default 'usd',
  external_booking_url text,
  stripe_connect_account_id text,
  is_published boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  unique (user_id)
);

create index coaches_slug_idx on public.coaches (slug);

create index coaches_verified_live_idx on public.coaches (verified_at desc, slug)
where
  is_published = true
  and verified_at is not null;

alter table public.coaches enable row level security;

-- Directory: verified published profiles visible to everyone
create policy coaches_public_read_verified
  on public.coaches for select to anon, authenticated
  using (is_published and verified_at is not null);

-- Draft / own row
create policy coaches_owner_select
  on public.coaches for select to authenticated
  using (user_id = auth.uid ());

create policy coaches_owner_insert
  on public.coaches for insert to authenticated
  with check (user_id = auth.uid ());

create policy coaches_owner_update
  on public.coaches for update to authenticated
  using (user_id = auth.uid ())
  with check (user_id = auth.uid ());

create policy coaches_owner_delete
  on public.coaches for delete to authenticated
  using (user_id = auth.uid ());

create table public.context_packs (
  id uuid primary key default gen_random_uuid (),
  access_token uuid not null unique default gen_random_uuid (),
  client_user_id uuid not null references auth.users (id) on delete cascade,
  coach_id uuid references public.coaches (id) on delete set null,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  ttl_hours integer not null default 168 check (ttl_hours >= 1 and ttl_hours <= 720),
  expires_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now ()
);

create index context_packs_client_idx on public.context_packs (client_user_id, created_at desc);

create index context_packs_coach_idx on public.context_packs (coach_id, created_at desc);

alter table public.context_packs enable row level security;

create policy context_packs_client_all
  on public.context_packs for all to authenticated
  using (client_user_id = auth.uid ())
  with check (client_user_id = auth.uid ());

create policy context_packs_coach_read_assigned
  on public.context_packs for select to authenticated
  using (
    coach_id is not null
    and expires_at > now ()
    and exists (
      select 1 from public.coaches c
      where c.id = context_packs.coach_id
        and c.user_id = auth.uid ()
    )
  );

create table public.coach_bookings (
  id uuid primary key default gen_random_uuid (),
  client_user_id uuid not null references auth.users (id) on delete cascade,
  coach_id uuid not null references public.coaches (id) on delete restrict,
  context_pack_id uuid references public.context_packs (id) on delete set null,
  stripe_checkout_session_id text unique,
  amount_total_cents integer not null default 0,
  platform_fee_bps integer not null default 1500 check (
    platform_fee_bps >= 0
    and platform_fee_bps <= 8000
  ),
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'canceled', 'refunded', 'completed')),
  paid_at timestamptz,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create index coach_bookings_coach_idx on public.coach_bookings (coach_id, created_at desc);

create index coach_bookings_client_idx on public.coach_bookings (client_user_id, created_at desc);

alter table public.coach_bookings enable row level security;

create policy coach_bookings_select_client
  on public.coach_bookings for select to authenticated
  using (client_user_id = auth.uid ());

create policy coach_bookings_select_coach
  on public.coach_bookings for select to authenticated
  using (
    exists (
      select 1 from public.coaches c
      where c.id = coach_bookings.coach_id
        and c.user_id = auth.uid ()
    )
  );

create policy coach_bookings_insert_client
  on public.coach_bookings for insert to authenticated
  with check (client_user_id = auth.uid ());

create table public.booking_coach_notes (
  id uuid primary key default gen_random_uuid (),
  booking_id uuid not null references public.coach_bookings (id) on delete cascade,
  coach_user_id uuid not null references auth.users (id) on delete cascade,
  homework jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now ()
);

create index booking_coach_notes_booking_idx on public.booking_coach_notes (booking_id, created_at desc);

alter table public.booking_coach_notes enable row level security;

create policy booking_notes_insert_coach
  on public.booking_coach_notes for insert to authenticated
  with check (
    coach_user_id = auth.uid ()
    and exists (
      select 1
      from public.coach_bookings b
      join public.coaches c on c.id = b.coach_id
      where b.id = booking_id
        and c.user_id = auth.uid ()
    )
  );

create policy booking_notes_select_parties
  on public.booking_coach_notes for select to authenticated
  using (
    exists (
      select 1 from public.coach_bookings b
      where b.id = booking_id
        and b.client_user_id = auth.uid ()
    )
    or exists (
      select 1
      from public.coach_bookings b
      join public.coaches c on c.id = b.coach_id
      where b.id = booking_id
        and c.user_id = auth.uid ()
    )
  );

create table public.coach_ratings (
  id uuid primary key default gen_random_uuid (),
  booking_id uuid not null references public.coach_bookings (id) on delete cascade,
  client_user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now (),
  unique (booking_id)
);

alter table public.coach_ratings enable row level security;

create policy coach_ratings_insert_client
  on public.coach_ratings for insert to authenticated
  with check (
    client_user_id = auth.uid ()
    and exists (
      select 1 from public.coach_bookings b
      where b.id = booking_id
        and b.client_user_id = auth.uid ()
        and b.status in ('paid', 'completed')
    )
  );

create policy coach_ratings_select_parties
  on public.coach_ratings for select to authenticated
  using (
    client_user_id = auth.uid ()
    or exists (
      select 1
      from public.coach_bookings b
      join public.coaches c on c.id = b.coach_id
      where b.id = booking_id
        and c.user_id = auth.uid ()
    )
  );
