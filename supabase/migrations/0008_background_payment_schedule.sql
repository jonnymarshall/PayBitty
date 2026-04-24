-- Background payment polling (v1.4.1).
-- A cron endpoint (/api/cron/payment-sweep) processes invoices on a tiered schedule
-- so payment detection works even when neither the payer nor the owner has a page open.
--
-- next_check_at IS NULL  => no polling (draft, paid, archived, or exhausted schedule).
-- mempool_seen_at IS NULL => never seen in mempool (pre-mempool cadence).
-- stage_attempt           => counter of polls performed within the current stage.

alter table invoices
  add column next_check_at timestamptz,
  add column mempool_seen_at timestamptz,
  add column stage_attempt integer not null default 0;

-- Partial index so the cron's `where next_check_at <= now()` lookup is cheap.
create index if not exists invoices_next_check_at_idx
  on invoices (next_check_at)
  where next_check_at is not null;

-- Backfill: existing pending / payment_detected rows pick up on the next cron tick.
update invoices
  set next_check_at = now() + interval '1 minute'
  where status in ('pending', 'payment_detected')
    and btc_address is not null;
