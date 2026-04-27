-- v1.4.3 — Email Event Log (DB-backed)
--
-- Records every transactional email the app attempts to send.
-- Owner-scoped via RLS; service-role inserts/updates only.

create type email_type as enum (
  'invoice_published',
  'payment_detected',
  'payment_confirmed'
);

create type email_event_status as enum (
  'queued',
  'sent',
  'failed',
  'skipped_no_api_key'
);

create table email_events (
  id                uuid primary key default gen_random_uuid(),
  invoice_id        uuid not null references invoices(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  email_type        email_type not null,
  recipient         text not null,
  status            email_event_status not null default 'queued',
  resend_message_id text,
  error_message     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index email_events_invoice_id_idx on email_events (invoice_id, created_at desc);
create index email_events_user_id_idx    on email_events (user_id, created_at desc);

alter table email_events enable row level security;

create policy "owner can read own email events"
  on email_events for select
  using (auth.uid() = user_id);
-- Inserts/updates only happen server-side via the service role key; no anon insert policy.
