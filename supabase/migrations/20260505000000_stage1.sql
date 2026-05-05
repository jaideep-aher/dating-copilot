-- Stage 1 schema: profiles, contacts, timeline, pins, generations, storage policies
-- Run via Supabase SQL editor or: supabase db push (when linked)

create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  default_tone text not null default 'neutral'
    check (default_tone in ('playful', 'neutral', 'direct')),
  generations_used integer not null default 0,
  generation_period_start timestamptz not null default now (),
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using (auth.uid () = id);

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (auth.uid () = id)
  with check (auth.uid () = id);

create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- If CREATE TRIGGER fails, try: for each row execute procedure public.handle_new_user ();
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user ();

-- Contacts
create table public.contacts (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  name_confirmed boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create index contacts_user_active_idx on public.contacts (user_id)
  where archived_at is null;

alter table public.contacts enable row level security;

create policy contacts_select_own
  on public.contacts for select to authenticated
  using (auth.uid () = user_id);

create policy contacts_insert_own
  on public.contacts for insert to authenticated
  with check (auth.uid () = user_id);

create policy contacts_update_own
  on public.contacts for update to authenticated
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

create policy contacts_delete_own
  on public.contacts for delete to authenticated
  using (auth.uid () = user_id);

-- Timeline
create table public.timeline_items (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  kind text not null check (kind in ('note', 'screenshots')),
  note_text text,
  ocr_preview text,
  created_at timestamptz not null default now ()
);

create index timeline_items_contact_idx on public.timeline_items (contact_id, created_at desc);

alter table public.timeline_items enable row level security;

create policy timeline_select_own
  on public.timeline_items for select to authenticated
  using (auth.uid () = user_id);

create policy timeline_insert_own
  on public.timeline_items for insert to authenticated
  with check (auth.uid () = user_id);

create policy timeline_update_own
  on public.timeline_items for update to authenticated
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

create policy timeline_delete_own
  on public.timeline_items for delete to authenticated
  using (auth.uid () = user_id);

create table public.timeline_item_files (
  id uuid primary key default gen_random_uuid (),
  timeline_item_id uuid not null references public.timeline_items (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  mime text,
  created_at timestamptz not null default now ()
);

create index timeline_item_files_item_idx on public.timeline_item_files (timeline_item_id);

alter table public.timeline_item_files enable row level security;

create policy timeline_files_select_via_item
  on public.timeline_item_files for select to authenticated
  using (
    exists (
      select 1 from public.timeline_items ti
      where ti.id = timeline_item_id and ti.user_id = auth.uid ()
    )
  );

create policy timeline_files_insert_via_item
  on public.timeline_item_files for insert to authenticated
  with check (
    exists (
      select 1 from public.timeline_items ti
      where ti.id = timeline_item_id and ti.user_id = auth.uid ()
    )
  );

create policy timeline_files_delete_via_item
  on public.timeline_item_files for delete to authenticated
  using (
    exists (
      select 1 from public.timeline_items ti
      where ti.id = timeline_item_id and ti.user_id = auth.uid ()
    )
  );

-- Pinned facts
create table public.pinned_facts (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  body text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now ()
);

create index pinned_facts_contact_idx on public.pinned_facts (contact_id);

alter table public.pinned_facts enable row level security;

create policy pinned_facts_all_own
  on public.pinned_facts for all to authenticated
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

-- Generation log (+ feedback)
create table public.generations (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  timeline_item_ids uuid[] not null default '{}',
  pinned_fact_ids uuid[] not null default '{}',
  instruction text,
  response jsonb not null,
  feedback smallint check (feedback is null or feedback in (-1, 1)),
  created_at timestamptz not null default now ()
);

create index generations_contact_idx on public.generations (contact_id, created_at desc);

alter table public.generations enable row level security;

create policy generations_select_own
  on public.generations for select to authenticated
  using (auth.uid () = user_id);

create policy generations_insert_own
  on public.generations for insert to authenticated
  with check (auth.uid () = user_id);

create policy generations_update_own
  on public.generations for update to authenticated
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('timeline-uploads', 'timeline-uploads', false)
on conflict (id) do nothing;

create policy timeline_uploads_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'timeline-uploads'
    and split_part(name, '/', 1) = auth.uid ()::text
  );

create policy timeline_uploads_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'timeline-uploads'
    and split_part(name, '/', 1) = auth.uid ()::text
  );

create policy timeline_uploads_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'timeline-uploads'
    and split_part(name, '/', 1) = auth.uid ()::text
  );

create policy timeline_uploads_update_own
  on storage.objects for update to authenticated
  using (
    bucket_id = 'timeline-uploads'
    and split_part(name, '/', 1) = auth.uid ()::text
  )
  with check (
    bucket_id = 'timeline-uploads'
    and split_part(name, '/', 1) = auth.uid ()::text
  );
