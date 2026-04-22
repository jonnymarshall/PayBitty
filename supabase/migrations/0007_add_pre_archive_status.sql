-- Add a nullable column to remember an invoice's status before it was archived,
-- so unarchive can restore the original status (paid stays paid, overdue stays overdue, etc.).
-- NULL for rows that have never been archived (and for currently-active rows).

alter table invoices
  add column pre_archive_status text;
