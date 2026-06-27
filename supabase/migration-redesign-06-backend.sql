-- ============================================================
-- KTUS REDESIGN — Bước backend hoá 3 việc:
--   (A) Trigger DB tự nối deal (pickup→cọc) + tự tạo deal cho đơn cọc
--   (B) FK account_id → accounts (nếu accounts.id là uuid)
--   (C) Cột thuế lưu ở DB (order_total, tax_rate, tax_amount) + đưa vào view
-- Idempotent. Chạy sau 01..05.
-- ============================================================

-- ---------- (C) Cột thuế / tổng đơn lưu trên rc_entries ----------
alter table rc_entries add column if not exists order_total numeric(14,2);
alter table rc_entries add column if not exists tax_rate    numeric(7,4);
alter table rc_entries add column if not exists tax_amount  numeric(14,2);

-- ---------- (B) FK account_id → accounts (chỉ khi accounts.id là uuid) ----------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'accounts' and column_name = 'id' and data_type = 'uuid'
  ) then
    if not exists (select 1 from pg_constraint where conname = 'rc_entries_account_fk') then
      alter table rc_entries add constraint rc_entries_account_fk
        foreign key (account_id) references accounts(id);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'bank_tx_account_fk') then
      alter table bank_transactions add constraint bank_tx_account_fk
        foreign key (account_id) references accounts(id);
    end if;
  else
    raise notice 'accounts.id khong phai uuid -> bo qua FK account_id (chuan hoa accounts truoc).';
  end if;
end $$;

-- ---------- (A) Trigger nối/tạo Deal ở DB ----------
-- BEFORE: pickup/return/cancel có old_receipt_no → tự gán deal_id từ đơn cọc cùng số JM
create or replace function fn_rc_link_deal() returns trigger as $$
declare _did uuid;
begin
  if coalesce(new.old_receipt_no,'') <> '' and new.deal_id is null then
    select deal_id into _did from rc_entries
      where jm_receipt_no = new.old_receipt_no and deal_id is not null
      limit 1;
    if _did is not null then new.deal_id := _did; end if;
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_rc_link_deal on rc_entries;
create trigger trg_rc_link_deal before insert or update on rc_entries
  for each row execute function fn_rc_link_deal();

-- AFTER INSERT: đơn cọc chưa có deal → tự tạo deal + gán anchor
create or replace function fn_rc_make_deal() returns trigger as $$
declare _did uuid;
begin
  if new.type_code in ('deposit','extra_deposit') and new.deal_id is null then
    insert into deals (company_id, customer_id, opened_date, anchor_entry_id, status)
      values (new.company_id, new.customer_id, new.entry_date, new.id, 'open')
      returning id into _did;
    update rc_entries set deal_id = _did where id = new.id;
  end if;
  return null;
end $$ language plpgsql;

drop trigger if exists trg_rc_make_deal on rc_entries;
create trigger trg_rc_make_deal after insert on rc_entries
  for each row execute function fn_rc_make_deal();

-- ---------- Recreate views (đưa thêm order_total/tax_rate/tax_amount) ----------
drop view if exists v_sales_daily cascade;
drop view if exists v_missing_source cascade;
drop view if exists v_bell cascade;
drop view if exists v_sales_online cascade;
drop view if exists v_rc_entry cascade;

create view v_rc_entry as
select
  e.id, e.entry_date as ngay, co.code as company, e.company_id,
  e.type_code as type, tt.label as type_label, tt.condition_bucket,
  e.sku_raw as ma_sku, e.description as dien_giai,
  e.customer_id, cu.ten as khach, coalesce(e.contact_raw, cu.phone_raw) as contact,
  e.expense,
  coalesce(sum(p.amount) filter (where p.direction='ar' and p.method_code='cash'),0)     as ar_cash,
  coalesce(sum(p.amount) filter (where p.direction='ar' and p.method_code='bankwire'),0) as ar_bankwire,
  coalesce(sum(p.amount) filter (where p.direction='ar' and p.method_code='zelle'),0)    as ar_zelle,
  coalesce(sum(p.amount) filter (where p.direction='ar' and p.method_code='check'),0)    as ar_check,
  coalesce(sum(p.amount) filter (where p.direction='ar' and p.method_code not in ('cash','bankwire','zelle','check')),0) as ar_other,
  coalesce(sum(p.amount) filter (where p.direction='ap' and p.method_code='cash'),0)     as ap_cash,
  coalesce(sum(p.amount) filter (where p.direction='ap' and p.method_code='bankwire'),0) as ap_bankwire,
  coalesce(sum(p.amount) filter (where p.direction='ap' and p.method_code='zelle'),0)    as ap_zelle,
  coalesce(sum(p.amount) filter (where p.direction='ap' and p.method_code='check'),0)    as ap_check,
  coalesce(sum(p.amount) filter (where p.direction='ap' and p.method_code not in ('cash','bankwire','zelle','check')),0) as ap_other,
  e.ar_total, e.ap_total,
  e.receipt, e.deposit, e.return_po, e.total,
  e.order_total, e.tax_rate, e.tax_amount,
  e.jm_receipt_no as rc_jm_no, e.jm_kind,
  e.source1_id as source_1, e.source2_id as source_2,
  e.transaction_value, e.pct_support, e.old_receipt_no,
  e.deal_id, d.opened_date as deposit_date, d.status as deal_status, e.status as trang_thai,
  e.bell_code, e.note, e.created_at,
  (select sp.ten from entry_sales es join sales_people sp on sp.id=es.salesperson_id where es.rc_entry_id=e.id and es.channel='counter' and es.position=1) as sale_1,
  (select sp.ten from entry_sales es join sales_people sp on sp.id=es.salesperson_id where es.rc_entry_id=e.id and es.channel='counter' and es.position=2) as sale_2,
  (select sp.ten from entry_sales es join sales_people sp on sp.id=es.salesperson_id where es.rc_entry_id=e.id and es.channel='counter' and es.position=3) as sale_3,
  (select sp.ten from entry_sales es join sales_people sp on sp.id=es.salesperson_id where es.rc_entry_id=e.id and es.channel='online' and es.position=1) as sale_online,
  (select sp.ten from entry_sales es join sales_people sp on sp.id=es.salesperson_id where es.rc_entry_id=e.id and es.channel='online' and es.position=2) as sale_online_2,
  (select sp.ten from entry_sales es join sales_people sp on sp.id=es.salesperson_id where es.rc_entry_id=e.id and es.channel='online' and es.position=3) as sale_online_3
from rc_entries e
left join companies co on co.id = e.company_id
left join transaction_types tt on tt.code = e.type_code
left join customers cu on cu.id = e.customer_id
left join deals d on d.id = e.deal_id
left join entry_payments p on p.rc_entry_id = e.id
group by e.id, co.code, tt.label, tt.condition_bucket, cu.ten, cu.phone_raw, d.opened_date, d.status;

create view v_sales_daily as select * from v_rc_entry;

create view v_missing_source as
select v.* from v_rc_entry v
join transaction_types tt on tt.code = v.type
where tt.requires_source and v.source_1 is null;

create view v_bell as
select distinct on (coalesce(v.deal_id::text, v.id::text))
  v.id, v.ngay, v.company, v.khach, v.sale_1, v.bell_code,
  coalesce(nullif(v.receipt,0), v.deposit) as so_tien, v.deal_id
from v_rc_entry v
where v.bell_code is not null
order by coalesce(v.deal_id::text, v.id::text), v.ngay;

create view v_sales_online as
select v.* from v_rc_entry v
where exists (select 1 from entry_sales es where es.rc_entry_id = v.id and es.channel = 'online');

-- Kiểm chứng:
-- select tgname from pg_trigger where tgrelid='rc_entries'::regclass and not tgisinternal;
-- select ngay, type, order_total, tax_rate, tax_amount, total from v_rc_entry order by ngay desc limit 10;
