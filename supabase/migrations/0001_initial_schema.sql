-- Invoice status enum
create type invoice_status as enum (
  'draft',
  'pending',
  'payment_detected',
  'paid',
  'overdue'
);

-- Invoices table
create table invoices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  client_name     text not null,
  client_email    text not null,
  -- line_items shape: [{ description: string, quantity: number, unit_price: number }]
  line_items      jsonb not null default '[]',
  subtotal_fiat   numeric(12, 2) not null default 0,
  tax_fiat        numeric(12, 2) not null default 0,
  total_fiat      numeric(12, 2) not null default 0,
  currency        text not null default 'USD',
  btc_address     text,
  status          invoice_status not null default 'draft',
  access_code     text,
  due_date        date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Prevent BTC address reuse across non-draft invoices (any user)
create unique index invoices_btc_address_active_idx
  on invoices (btc_address)
  where status != 'draft' and btc_address is not null;

-- Row-level security
alter table invoices enable row level security;

-- Users can only read/write their own invoices
create policy "owner_all" on invoices
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger invoices_updated_at
  before update on invoices
  for each row execute procedure set_updated_at();
