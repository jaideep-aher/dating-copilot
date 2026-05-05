-- Stage 3: billing (Stripe linkage), abuse reports, processed webhook ids

alter table public.profiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'pro')),
  add column if not exists subscription_status text,
  add column if not exists subscription_current_period_end timestamptz;

create index profiles_stripe_customer_idx on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create table public.stripe_events (
  id text primary key,
  received_at timestamptz not null default now ()
);

-- Service role inserts only — no RLS (use private schema pattern). Lock down via granting to service_role only.
alter table public.stripe_events enable row level security;

-- No policies for anon/authenticated — webhook uses service_role which bypasses RLS

create table public.abuse_reports (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  generation_id uuid references public.generations (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  category text not null default 'generation_output',
  detail text,
  created_at timestamptz not null default now ()
);

create index abuse_reports_user_idx on public.abuse_reports (user_id, created_at desc);

alter table public.abuse_reports enable row level security;

create policy abuse_reports_insert_own
  on public.abuse_reports for insert to authenticated
  with check (auth.uid () = user_id);

create policy abuse_reports_select_own
  on public.abuse_reports for select to authenticated
  using (auth.uid () = user_id);
