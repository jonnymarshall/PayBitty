-- v1.4.14 — reconcile pre-v1.4.12 invoices that violate the
-- btc_address-required-when-published invariant introduced by 0018.
--
-- Context: when 0018 ran, its defensive audit found 24 invoices with
-- status != 'draft' AND btc_address IS NULL. These predate v1.4.12,
-- which made btc_address required at publish time at the action
-- layer; before that gate landed, the form allowed publishing without
-- one. All 24 inspected rows were test data: trivial totals, empty
-- client_name, invoice_numbers like "TESTY", "DRAFTY", "FailedEmail".
-- No real client data; no real bitcoin payments to preserve.
--
-- Reconciliation: delete them. Keeping them would require either
-- (a) demoting paid/overdue rows to draft (which scrubs payment
-- history and makes the data more confusing, not less), or
-- (b) hand-assigning a btc_address per row, which makes no sense for
-- abandoned test invoices.
--
-- Cascading deletes: email_events and invoice_events both reference
-- invoices(id) on delete cascade, so related rows are cleaned up
-- automatically.
--
-- Idempotency: after this migration runs, the v1.4.14 publish gate
-- (slice 2 in actions.ts) prevents any new row from entering this
-- state. So a subsequent run of this DELETE matches zero rows.

delete from invoices
 where status != 'draft' and btc_address is null;
