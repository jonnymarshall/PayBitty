-- Invoice number
alter table invoices add column if not exists invoice_number text;

-- Replace tax_fiat with tax_percent (keep tax_fiat as computed column)
alter table invoices add column if not exists tax_percent numeric(5, 2) not null default 0;

-- Sender fields
alter table invoices add column if not exists your_name text;
alter table invoices add column if not exists your_email text;
alter table invoices add column if not exists your_company text;
alter table invoices add column if not exists your_address text;
alter table invoices add column if not exists your_tax_id text;

-- Extended client fields
alter table invoices add column if not exists client_company text;
alter table invoices add column if not exists client_address text;
alter table invoices add column if not exists client_tax_id text;

-- Bitcoin opt-in
alter table invoices add column if not exists accepts_bitcoin boolean not null default false;

-- Make btc_address and access_code explicitly nullable (already nullable, but clarifying intent)
-- access_code is now user-set or null (no access required)
-- btc_address is null when accepts_bitcoin is false

-- Update the uniqueness index to also guard against null btc_address conflicts
-- (existing index already has btc_address is not null condition — no change needed)
