-- v1.4.9 — Invoice + last invoice_published email summary view
--
-- Joins each invoice to its most recent `invoice_published` row in
-- `email_events`, exposing three derived fields:
--
--   last_publish_email_status — most-recent attempt's status (or NULL if
--                               no publish email has been attempted yet)
--   last_publish_email_error  — error_message of that row (NULL on success
--                               or when no attempt exists)
--   last_publish_email_at     — timestamp of that row
--
-- Single source of truth for "did the last publish email fail?" — both the
-- detail page and the /invoices list read from this view instead of joining
-- in the app layer. RLS is inherited from the underlying tables (invoices
-- and email_events both already user-scoped).

create or replace view invoice_email_summary as
select
  i.*,
  e.status        as last_publish_email_status,
  e.error_message as last_publish_email_error,
  e.created_at    as last_publish_email_at
from invoices i
left join lateral (
  select status, error_message, created_at
    from email_events
   where invoice_id = i.id
     and email_type = 'invoice_published'
   order by created_at desc
   limit 1
) e on true;
