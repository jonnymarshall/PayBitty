-- v1.4.16 — Invoice number 30-character cap.
--
-- The invoice_number field has been unbounded since v1.0. Long values blew
-- out the dashboard table column, wrapped awkwardly on the public payer
-- page, and produced ugly subject lines in invoice_published emails. This
-- migration enforces the cap at the DB layer; the form (`maxLength={30}`,
-- live counter) and the server actions (saveDraft, updateDraft guard) are
-- the user-facing layers.

-- 1. Reconcile any existing rows whose invoice_number exceeds 30 chars.
--    Per product decision: delete (not truncate). These can only come from
--    pre-v1.4.16 manual entry, and the realistic source is abandoned test
--    data — there is no expectation of legitimate production rows in this
--    state. Cascading FKs on email_events and invoice_events handle related
--    rows automatically. Self-healing pattern matches migration 0018.
do $$
declare
  offenders int;
begin
  select count(*) into offenders
    from invoices
   where char_length(invoice_number) > 30;
  if offenders > 0 then
    raise notice 'Migration 0020: deleting % invoice(s) with invoice_number > 30 chars', offenders;
    delete from invoices where char_length(invoice_number) > 30;
  end if;
end$$;

-- 2. Add the CHECK constraint. NULL values are allowed (the field is
--    optional); only over-length non-NULL values are rejected.
alter table invoices add constraint invoice_number_length
  check (invoice_number is null or char_length(invoice_number) <= 30);
