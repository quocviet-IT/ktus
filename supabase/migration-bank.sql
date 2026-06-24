-- =====================================================================
-- Migration: Sao kê ngân hàng (THEO DÕI BANK)
-- Chạy trong Supabase → SQL Editor → Run.
-- =====================================================================
create table if not exists bank_statements (
  id uuid primary key default gen_random_uuid(),
  company text not null,                 -- PC49 / Trans / ...
  bank_account text,                     -- vd "004 - TFJ WF CK 7012"
  ngay date not null,
  description text,
  category text,                         -- CHECK / ACH / BANKCARD DEPOSIT ...
  amount numeric(14,2) not null default 0,  -- + nạp vào / − rút ra
  matched boolean not null default false,    -- đã đối chiếu với sổ cash
  note text,
  created_at timestamptz not null default now()
);
create index if not exists bank_statements_company_ngay on bank_statements (company, ngay);

alter table bank_statements enable row level security;
drop policy if exists bank_statements_all on bank_statements;
create policy bank_statements_all on bank_statements for all to anon, authenticated using (true) with check (true);
