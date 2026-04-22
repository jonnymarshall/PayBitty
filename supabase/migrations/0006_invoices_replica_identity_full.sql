-- Supabase Realtime needs REPLICA IDENTITY FULL so that UPDATE events carry
-- all column values (not just the PK and changed columns). Without this,
-- postgres_changes events can deliver payloads missing fields that downstream
-- filters or RLS checks depend on.
alter table public.invoices replica identity full;
