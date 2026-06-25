-- =====================================================================
-- PHASE 2/3 — Quan hệ FK đầy đủ + đọc/đối chiếu theo FK.
-- CHẠY trong Supabase SQL Editor sau migration-phase1.sql.
-- An toàn: chỉ THÊM bảng/cột/view/trigger, KHÔNG xoá cột text cũ.
-- =====================================================================

create extension if not exists "pgcrypto";

-- 1) Danh mục dùng chung: source, bell_code, payment, type...
create table if not exists lookups (
  id uuid primary key default gen_random_uuid(),
  grp text not null,
  code text not null,
  label text not null,
  sort int default 0,
  active boolean not null default true,
  unique (grp, code)
);

alter table lookups enable row level security;
drop policy if exists lookups_all on lookups;
create policy lookups_all on lookups for all to anon, authenticated using (true) with check (true);

insert into lookups(grp, code, label, sort) values
  ('source','WI','WI',1),
  ('source','TEL','TEL',2),
  ('source','FB','FB',3),
  ('source','IG-APPT','IG-APPT',4),
  ('source','RF-APPT','RF-APPT',5),
  ('source','RC','RC',6),
  ('source','VIP','VIP',7),
  ('bell_code','RC1','RC1',1),
  ('bell_code','RC2','RC2',2),
  ('bell_code','RC3','RC3',3),
  ('bell_code','SBO1','SBO1',4)
on conflict (grp, code) do update set label = excluded.label, sort = excluded.sort, active = true;

-- 2) Chuẩn hoá công ty: Trans/TFJ cùng trỏ về companies.code='TRANS'
create table if not exists company_aliases (
  alias text primary key,
  company_id smallint not null references companies(id)
);

insert into company_aliases(alias, company_id)
select v.alias, c.id
from (
  values
    ('PC49','PC49'), ('TRANS','TRANS'), ('TRANS / TFJ','TRANS'), ('TRANS/TFJ','TRANS'), ('TFJ','TRANS'), ('TDW','TDW'),
    ('HPLLC','HPLLC'), ('3NVY','3NVY'), ('OTHER','OTHER'), ('ADM','ADM'), ('CL','CL'), ('AH','AH'),
    ('TL','TL'), ('TPM','TPM'), ('TWT','TWT')
) as v(alias, code)
join companies c on c.code = v.code
on conflict (alias) do update set company_id = excluded.company_id;

create or replace function fn_company_id(p_raw text) returns smallint language plpgsql as $$
declare v_id smallint; v_code text;
begin
  v_code := upper(nullif(trim(coalesce(p_raw, '')), ''));
  if v_code is null then return null; end if;

  select company_id into v_id from company_aliases where upper(alias) = v_code limit 1;
  if v_id is not null then return v_id; end if;

  select id into v_id from companies where code = v_code limit 1;
  return v_id;
end $$;

create or replace function fn_lookup_id(p_grp text, p_raw text) returns uuid language plpgsql as $$
declare v_id uuid; v_label text; v_code text;
begin
  v_label := nullif(trim(coalesce(p_raw, '')), '');
  if v_label is null or lower(v_label) = 'không có source' then return null; end if;
  v_code := upper(v_label);

  insert into lookups(grp, code, label)
  values (p_grp, v_code, v_label)
  on conflict (grp, code) do update set label = excluded.label, active = true
  returning id into v_id;

  return v_id;
end $$;

-- 3) Cột FK mới, nullable để không phá app cũ
alter table transactions add column if not exists source1_lookup_id uuid references lookups(id);
alter table transactions add column if not exists source2_lookup_id uuid references lookups(id);
alter table transactions add column if not exists bell_code_lookup_id uuid references lookups(id);
alter table payments     add column if not exists account_id uuid references accounts(id);
alter table bank_statements add column if not exists company_id smallint references companies(id);

create index if not exists idx_tx_source1_lookup on transactions(source1_lookup_id);
create index if not exists idx_tx_source2_lookup on transactions(source2_lookup_id);
create index if not exists idx_tx_bell_lookup on transactions(bell_code_lookup_id);
create index if not exists idx_payments_account on payments(account_id);
create index if not exists idx_bank_company_id on bank_statements(company_id);

-- 4) Junction nhiều sales + %
create table if not exists transaction_sales (
  transaction_id uuid not null references transactions(id) on delete cascade,
  sale_id uuid not null references sales_people(id),
  vai_tro text not null default 'sale#1',
  ty_le_pct numeric(5,2),
  created_at timestamptz not null default now(),
  primary key (transaction_id, sale_id, vai_tro)
);

alter table transaction_sales enable row level security;
drop policy if exists transaction_sales_all on transaction_sales;
create policy transaction_sales_all on transaction_sales for all to anon, authenticated using (true) with check (true);

-- 5) Backfill danh mục từ text hiện có
with vals as (
  select 'source'::text as grp, source_1 as label from transactions where source_1 is not null and trim(source_1) <> ''
  union
  select 'source'::text as grp, source_2 as label from transactions where source_2 is not null and trim(source_2) <> ''
  union
  select 'bell_code'::text as grp, bell_code as label from transactions where bell_code is not null and trim(bell_code) <> ''
)
insert into lookups(grp, code, label)
select grp, upper(trim(label)), trim(label)
from vals
where lower(trim(label)) <> 'không có source'
on conflict (grp, code) do update set label = excluded.label, active = true;

update accounts a
set company_id = fn_company_id(a.entity)
where a.company_id is null and fn_company_id(a.entity) is not null;

update transactions t
set company_id = fn_company_id(t.company)
where fn_company_id(t.company) is not null
  and (t.company_id is null or t.company_id <> fn_company_id(t.company));

update bank_statements b
set company_id = fn_company_id(b.company)
where fn_company_id(b.company) is not null
  and (b.company_id is null or b.company_id <> fn_company_id(b.company));

update transactions
set source1_lookup_id = fn_lookup_id('source', source_1)
where source1_lookup_id is null and source_1 is not null and trim(source_1) <> '';

update transactions
set source2_lookup_id = fn_lookup_id('source', source_2)
where source2_lookup_id is null and source_2 is not null and trim(source_2) <> '';

update transactions
set bell_code_lookup_id = fn_lookup_id('bell_code', bell_code)
where bell_code_lookup_id is null and bell_code is not null and trim(bell_code) <> '';

insert into sales_people(ten, kind)
select distinct trim(sale_1), 'counter'
from transactions
where sale_1 is not null and trim(sale_1) <> ''
on conflict (ten) do nothing;

insert into sales_people(ten, kind)
select distinct trim(sale_online), 'online'
from transactions
where sale_online is not null and trim(sale_online) <> ''
on conflict (ten) do nothing;

insert into transaction_sales(transaction_id, sale_id, vai_tro, ty_le_pct)
select t.id, sp.id, 'sale#1', null
from transactions t
join sales_people sp on sp.ten = trim(t.sale_1)
where t.sale_1 is not null and trim(t.sale_1) <> ''
on conflict (transaction_id, sale_id, vai_tro) do nothing;

insert into transaction_sales(transaction_id, sale_id, vai_tro, ty_le_pct)
select t.id, sp.id, 'online#1', nullif(t.pct_support, 0)
from transactions t
join sales_people sp on sp.ten = trim(t.sale_online)
where t.sale_online is not null and trim(t.sale_online) <> ''
on conflict (transaction_id, sale_id, vai_tro) do update set ty_le_pct = excluded.ty_le_pct;

update payments p
set account_id = t.account_id
from transactions t
where p.transaction_id = t.id and p.account_id is null and t.account_id is not null;

-- 6) Trigger FK text -> quan hệ thật
create or replace function fn_link_transaction() returns trigger language plpgsql as $$
declare cid smallint; cuid uuid; aid uuid; pid uuid;
begin
  cid := fn_company_id(new.company);
  if cid is not null then new.company_id := cid; end if;

  if new.khach is not null and trim(new.khach) <> '' then
    insert into customers(ten) values (trim(new.khach)) on conflict (ten) do nothing;
    select id into cuid from customers where ten = trim(new.khach) limit 1;
    new.customer_id := cuid;
  end if;

  if new.company_account is not null and trim(new.company_account) <> '' then
    select id into aid from accounts where upper(name) = upper(trim(new.company_account)) limit 1;
    if aid is null and lower(trim(new.company_account)) like '% cash' then
      select id into aid
      from accounts
      where company_id = cid and lower(coalesce(account_type, '')) like '%cash%'
      order by sort nulls last, name
      limit 1;
    end if;
    new.account_id := aid;
  end if;

  if new.old_receipt_no is not null and trim(new.old_receipt_no) <> '' then
    select id into pid from transactions where rc_jm_no = trim(new.old_receipt_no) and id <> new.id limit 1;
    new.parent_id := pid;
  end if;

  new.source1_lookup_id := fn_lookup_id('source', new.source_1);
  new.source2_lookup_id := fn_lookup_id('source', new.source_2);
  new.bell_code_lookup_id := fn_lookup_id('bell_code', new.bell_code);
  return new;
end $$;

drop trigger if exists trg_link_tx on transactions;
create trigger trg_link_tx before insert or update on transactions for each row execute function fn_link_transaction();

create or replace function fn_sync_transaction_sales() returns trigger language plpgsql as $$
declare sid uuid;
begin
  delete from transaction_sales where transaction_id = new.id and vai_tro in ('sale#1', 'online#1');

  if new.sale_1 is not null and trim(new.sale_1) <> '' then
    insert into sales_people(ten, kind) values (trim(new.sale_1), 'counter') on conflict (ten) do nothing;
    select id into sid from sales_people where ten = trim(new.sale_1) limit 1;
    insert into transaction_sales(transaction_id, sale_id, vai_tro, ty_le_pct)
    values (new.id, sid, 'sale#1', null)
    on conflict (transaction_id, sale_id, vai_tro) do nothing;
  end if;

  if new.sale_online is not null and trim(new.sale_online) <> '' then
    insert into sales_people(ten, kind) values (trim(new.sale_online), 'online') on conflict (ten) do nothing;
    select id into sid from sales_people where ten = trim(new.sale_online) limit 1;
    insert into transaction_sales(transaction_id, sale_id, vai_tro, ty_le_pct)
    values (new.id, sid, 'online#1', nullif(new.pct_support, 0))
    on conflict (transaction_id, sale_id, vai_tro) do update set ty_le_pct = excluded.ty_le_pct;
  end if;

  return new;
end $$;

drop trigger if exists trg_sync_tx_sales on transactions;
create trigger trg_sync_tx_sales
after insert or update of sale_1, sale_online, pct_support on transactions
for each row execute function fn_sync_transaction_sales();

create or replace function fn_link_payment() returns trigger language plpgsql as $$
begin
  if new.account_id is null then
    select account_id into new.account_id from transactions where id = new.transaction_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_link_payment on payments;
create trigger trg_link_payment before insert or update of transaction_id, account_id on payments
for each row execute function fn_link_payment();

create or replace function fn_link_bank() returns trigger language plpgsql as $$
declare cid smallint; aid uuid;
begin
  cid := fn_company_id(new.company);
  if cid is not null then new.company_id := cid; end if;

  if new.bank_account is not null and trim(new.bank_account) <> '' then
    select id into aid from accounts where upper(name) = upper(trim(new.bank_account)) limit 1;
    new.account_id := aid;
  end if;
  return new;
end $$;

drop trigger if exists trg_link_bank on bank_statements;
create trigger trg_link_bank before insert or update on bank_statements for each row execute function fn_link_bank();

-- 7) Views cho Phase 3: app/report có thể đọc theo FK.
create or replace view v_transactions_enriched as
select
  t.*,
  c.code as company_code,
  c.name as company_name,
  cu.ten as customer_name,
  cu.sdt as customer_phone,
  a.name as account_name,
  a.account_type,
  s1.code as source1_code,
  s1.label as source1_label,
  s2.code as source2_code,
  s2.label as source2_label,
  bell.code as bell_code_norm,
  bell.label as bell_code_label,
  parent.rc_jm_no as parent_rc_jm_no,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'sale_id', sp.id,
      'ten', sp.ten,
      'kind', sp.kind,
      'vai_tro', ts.vai_tro,
      'ty_le_pct', ts.ty_le_pct
    ) order by ts.vai_tro, sp.ten)
    from transaction_sales ts
    join sales_people sp on sp.id = ts.sale_id
    where ts.transaction_id = t.id
  ), '[]'::jsonb) as sales
from transactions t
left join companies c on c.id = t.company_id
left join customers cu on cu.id = t.customer_id
left join accounts a on a.id = t.account_id
left join lookups s1 on s1.id = t.source1_lookup_id
left join lookups s2 on s2.id = t.source2_lookup_id
left join lookups bell on bell.id = t.bell_code_lookup_id
left join transactions parent on parent.id = t.parent_id;

create or replace view v_account_movements as
select
  b.account_id,
  b.ngay,
  b.amount,
  'bank_statement'::text as source_type,
  b.id::text as source_id,
  b.description as description
from bank_statements b
where b.account_id is not null
union all
select
  t.account_id,
  t.ngay,
  coalesce(t.ar_cash,0) + coalesce(t.ar_bankwire,0) + coalesce(t.ar_zelle,0) + coalesce(t.ar_check,0)
    - coalesce(t.ap_cash,0) - coalesce(t.ap_bankwire,0) - coalesce(t.ap_zelle,0) - coalesce(t.ap_check,0)
    - case when coalesce(t.ap_cash,0) + coalesce(t.ap_bankwire,0) + coalesce(t.ap_zelle,0) + coalesce(t.ap_check,0) = 0
             and t.type in ('po','return','exchange')
           then coalesce(t.expense,0) else 0 end as amount,
  'transaction'::text as source_type,
  t.id::text as source_id,
  t.dien_giai as description
from transactions t
where t.account_id is not null and t.trang_thai <> 'cancel';

-- Kiểm chứng nhanh:
--   select count(*) total, count(source1_lookup_id) co_source, count(bell_code_lookup_id) co_bell from transactions;
--   select count(*) from transaction_sales;
--   select account_id, sum(amount) from v_account_movements group by account_id order by 2 desc;
