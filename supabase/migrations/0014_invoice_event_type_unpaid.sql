-- v1.4.10 (addendum) — add marked_as_unpaid to invoice_event_type.
--
-- markUnpaid (already shipped in v1.1.4) flips a paid invoice back to pending.
-- It was missing from v1.4.10's activity-feed enum, which made the action
-- invisible in the per-invoice Activity card. This adds the fourth value so
-- the card can show a row whenever an owner reverts a paid invoice.

alter type invoice_event_type add value if not exists 'marked_as_unpaid';
