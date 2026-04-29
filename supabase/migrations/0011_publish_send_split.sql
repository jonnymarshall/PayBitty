-- v1.4.8 — Publish vs Send-via-email split
--
-- Decouples publishing an invoice (creating its public URL) from sending it
-- via email. Three new columns capture delivery state without polluting the
-- payment-status enum (`pending → payment_detected → paid`).
--
--   sent_at            — non-null once the invoice has been "delivered"
--                        (manually OR via a successful email send)
--   send_method        — 'email' | 'manual'; non-null when sent_at is set
--   email_attempted_at — set the moment a Resend safeSend for
--                        type=invoice_published is fired, regardless of
--                        outcome. Used to gate the "Send via email" option.
--
-- Backfill: all existing non-draft invoices are treated as having been
-- delivered via email at create-time, since prior to v1.4.8 publishing
-- automatically fired the invoice_published email. Drafts are left NULL.

alter table invoices add column sent_at timestamptz;
alter table invoices add column send_method text
  check (send_method in ('email', 'manual'));
alter table invoices add column email_attempted_at timestamptz;

update invoices
   set sent_at            = created_at,
       send_method        = 'email',
       email_attempted_at = created_at
 where status <> 'draft';
