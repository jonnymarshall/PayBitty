-- Public payer page Realtime subscription (v1.4.2).
--
-- The /invoice/[id] page is unauthenticated — the payer subscribes to Supabase
-- Realtime with the anon key so cron-driven status transitions appear without a
-- refresh. Realtime applies RLS to the underlying table; without an anon SELECT
-- policy, postgres_changes events are silently dropped.
--
-- We expose only non-draft invoices to anon. Draft invoices remain owner-only.
-- The invoice id is a UUID and is itself the URL-level secret used by the
-- existing public page (which fetches via the service-role admin client).
-- access_code (when set) is enforced at the page level via cookie gating before
-- the client subscribes, so this policy does not need to re-check it.
create policy "anon_select_non_draft" on invoices
  for select
  to anon
  using (status != 'draft');
