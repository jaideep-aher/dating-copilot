-- Stage 2: date events, debriefs, reminders, timeline payload

alter table public.profiles
  add column if not exists timezone text not null default 'UTC';

alter table public.timeline_items
  add column if not exists payload jsonb default '{}'::jsonb;

alter table public.timeline_items drop constraint if exists timeline_items_kind_check;

alter table public.timeline_items
  add constraint timeline_items_kind_check
  check (kind in ('note', 'screenshots', 'date_event', 'debrief'));

create table public.reminders (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  title text not null,
  note text,
  remind_at timestamptz not null,
  timezone text not null default 'UTC',
  channel text not null default 'email',
  sent_at timestamptz,
  email_error text,
  created_at timestamptz not null default now ()
);

create index reminders_due_pending_idx on public.reminders (remind_at)
  where sent_at is null;

create index reminders_user_idx on public.reminders (user_id, remind_at desc);

alter table public.reminders enable row level security;

create policy reminders_select_own
  on public.reminders for select to authenticated
  using (auth.uid () = user_id);

create policy reminders_insert_own
  on public.reminders for insert to authenticated
  with check (auth.uid () = user_id);

create policy reminders_delete_own
  on public.reminders for delete to authenticated
  using (auth.uid () = user_id);

create policy reminders_update_own
  on public.reminders for update to authenticated
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);
