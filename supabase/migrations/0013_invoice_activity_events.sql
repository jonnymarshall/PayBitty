-- v1.4.10 — Invoice Activity Feed
--
-- Records manual state transitions on an invoice (mark-as-sent / mark-as-paid /
-- mark-as-overdue) so the activity card can show them alongside email events.
-- Owner-scoped via RLS; service-role inserts only.

create type invoice_event_type as enum (
  'marked_as_sent',
  'marked_as_paid',
  'marked_as_overdue'
);

create table invoice_events (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_type  invoice_event_type not null,
  created_at  timestamptz not null default now()
);

create index invoice_events_invoice_id_idx on invoice_events (invoice_id, created_at desc);

alter table invoice_events enable row level security;

create policy "owner can read own invoice events"
  on invoice_events for select
  using (auth.uid() = user_id);
-- Inserts only happen server-side via the service role key; no anon insert policy.
