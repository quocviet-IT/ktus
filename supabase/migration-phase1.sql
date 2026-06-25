-- =====================================================================
-- PHASE 1 — Liên kết dữ liệu (relationships). CHẠY trong Supabase SQL Editor.
-- An toàn: chỉ THÊM bảng/cột (nullable) + backfill + trigger tự nối FK.
-- KHÔNG xoá cột text cũ → app đang chạy không gãy.
-- Yêu cầu: đã chạy migration-accounts.sql (bảng accounts). bank_statements nếu chưa có thì chạy migration-bank.sql trước.
-- =====================================================================

-- 1) Bảng danh mục thực thể / khách / sales
create table if not exists companies (
  id smallint generated always as identity primary key,
  code text unique not null, name text not null, active boolean not null default true
);
insert into companies(code, name) values
  ('PC49','PC49'), ('TRANS','Trans / TFJ'), ('TDW','TDW'), ('HPLLC','HPLLC'),
  ('3NVY','3NVY'), ('OTHER','Other'), ('ADM','ADM'), ('CL','CL'), ('AH','AH'),
  ('TL','TL'), ('TPM','TPM'), ('TWT','TWT')
on conflict (code) do nothing;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  ten text not null unique, sdt text, nguon text, created_at timestamptz not null default now()
);
create table if not exists sales_people (
  id uuid primary key default gen_random_uuid(),
  ten text not null unique, kind text not null default 'counter', active boolean not null default true
);
alter table customers     enable row level security;
alter table sales_people  enable row level security;
alter table companies     enable row level security;
do $$ declare t text; begin
  foreach t in array array['companies','customers','sales_people'] loop
    execute format('drop policy if exists %I_all on %I;', t, t);
    execute format('create policy %I_all on %I for all to anon, authenticated using (true) with check (true);', t, t);
  end loop;
end $$;

-- 2) Thêm cột FK (nullable) — không phá dữ liệu cũ
alter table accounts        add column if not exists company_id smallint references companies(id);
alter table transactions    add column if not exists company_id  smallint references companies(id);
alter table transactions    add column if not exists customer_id uuid     references customers(id);
alter table transactions    add column if not exists account_id  uuid     references accounts(id);
alter table transactions    add column if not exists parent_id   uuid     references transactions(id);
alter table bank_statements add column if not exists account_id  uuid     references accounts(id);

create index if not exists idx_tx_company  on transactions(company_id);
create index if not exists idx_tx_customer on transactions(customer_id);
create index if not exists idx_tx_account  on transactions(account_id);
create index if not exists idx_tx_parent   on transactions(parent_id);
create index if not exists idx_bank_account on bank_statements(account_id);

-- 3) Backfill từ dữ liệu hiện có
update accounts a set company_id = c.id from companies c
  where a.company_id is null and upper(a.entity) = c.code;

update transactions t set company_id = c.id from companies c
  where t.company_id is null and upper(t.company) = c.code;

insert into customers(ten) select distinct khach from transactions
  where khach is not null and khach <> '' on conflict (ten) do nothing;
update transactions t set customer_id = cu.id from customers cu
  where t.customer_id is null and t.khach = cu.ten;

insert into sales_people(ten) select distinct sale_1 from transactions
  where sale_1 is not null and sale_1 <> '' on conflict (ten) do nothing;
insert into sales_people(ten, kind) select distinct sale_online, 'online' from transactions
  where sale_online is not null and sale_online <> '' on conflict (ten) do nothing;

-- account_id: khớp company_account "PC49 cash" với tên TK "PC49 CASH" (cash khớp được; bank chung để null)
update transactions t set account_id = a.id from accounts a
  where t.account_id is null and t.company_account is not null and t.company_account <> ''
    and upper(a.name) = upper(t.company_account);

-- bank_statements: khớp số TK với tên tài khoản
update bank_statements b set account_id = a.id from accounts a
  where b.account_id is null and b.bank_account is not null and a.name = b.bank_account;

-- parent_id: đơn pickup → đơn cọc (old_receipt_no = rc_jm_no)
update transactions p set parent_id = d.id from transactions d
  where p.parent_id is null and p.old_receipt_no is not null and p.old_receipt_no <> ''
    and d.rc_jm_no = p.old_receipt_no and d.id <> p.id;

-- 4) Trigger tự duy trì FK khi INSERT/UPDATE (app vẫn ghi text, DB tự nối)
create or replace function fn_link_transaction() returns trigger language plpgsql as $$
declare cid smallint; cuid uuid; aid uuid; pid uuid;
begin
  if new.company is not null then
    select id into cid from companies where code = upper(new.company); new.company_id := cid;
  end if;
  if new.khach is not null and new.khach <> '' then
    insert into customers(ten) values (new.khach) on conflict (ten) do nothing;
    select id into cuid from customers where ten = new.khach; new.customer_id := cuid;
  end if;
  if new.company_account is not null and new.company_account <> '' then
    select id into aid from accounts where upper(name) = upper(new.company_account) limit 1; new.account_id := aid;
  end if;
  if new.old_receipt_no is not null and new.old_receipt_no <> '' then
    select id into pid from transactions where rc_jm_no = new.old_receipt_no and id <> new.id limit 1; new.parent_id := pid;
  end if;
  return new;
end $$;
drop trigger if exists trg_link_tx on transactions;
create trigger trg_link_tx before insert or update on transactions for each row execute function fn_link_transaction();

create or replace function fn_link_bank() returns trigger language plpgsql as $$
declare aid uuid;
begin
  if new.bank_account is not null then
    select id into aid from accounts where name = new.bank_account limit 1; new.account_id := aid;
  end if;
  return new;
end $$;
drop trigger if exists trg_link_bank on bank_statements;
create trigger trg_link_bank before insert or update on bank_statements for each row execute function fn_link_bank();

-- Kiểm chứng nhanh:
--   select count(*) total, count(company_id) co_company, count(customer_id) co_customer, count(account_id) co_account, count(parent_id) co_parent from transactions;
--   select count(*) from companies; select count(*) from customers;
