-- ============================================================
-- KTUS REDESIGN — Bước 7: Báo cáo = VIEWS đọc từ rc_entries (không sao chép dữ liệu).
-- v_rc_entry: view phẳng (pivot entry_payments → cột tiền theo hình thức) + tên công ty/khách/sale.
-- Các view báo cáo dùng lại v_rc_entry. Chạy sau 01-core + 02-backfill.
-- ============================================================

-- Cột trạng thái chuyển tiếp (giữ tương thích báo cáo cũ) + backfill từ transactions
alter table rc_entries add column if not exists status text;
update rc_entries e set status = t.trang_thai
from transactions t where t.id = e.id and e.status is null;

-- ---------- VIEW PHẲNG: 1 dòng/RC, đủ cột như sổ cũ ----------
create or replace view v_rc_entry as
select
  e.id,
  e.entry_date                                   as ngay,
  co.code                                        as company,
  e.company_id,
  e.type_code                                    as type,
  tt.label                                       as type_label,
  tt.condition_bucket,
  e.sku_raw                                      as ma_sku,
  e.description                                  as dien_giai,
  e.customer_id,
  cu.ten                                         as khach,
  coalesce(e.contact_raw, cu.phone_raw)          as contact,
  e.expense,
  -- A/R theo hình thức (pivot)
  coalesce(sum(p.amount) filter (where p.direction='ar' and p.method_code='cash'),0)     as ar_cash,
  coalesce(sum(p.amount) filter (where p.direction='ar' and p.method_code='bankwire'),0) as ar_bankwire,
  coalesce(sum(p.amount) filter (where p.direction='ar' and p.method_code='zelle'),0)    as ar_zelle,
  coalesce(sum(p.amount) filter (where p.direction='ar' and p.method_code='check'),0)    as ar_check,
  coalesce(sum(p.amount) filter (where p.direction='ar' and p.method_code not in ('cash','bankwire','zelle','check')),0) as ar_other,
  -- A/P theo hình thức (pivot)
  coalesce(sum(p.amount) filter (where p.direction='ap' and p.method_code='cash'),0)     as ap_cash,
  coalesce(sum(p.amount) filter (where p.direction='ap' and p.method_code='bankwire'),0) as ap_bankwire,
  coalesce(sum(p.amount) filter (where p.direction='ap' and p.method_code='zelle'),0)    as ap_zelle,
  coalesce(sum(p.amount) filter (where p.direction='ap' and p.method_code='check'),0)    as ap_check,
  coalesce(sum(p.amount) filter (where p.direction='ap' and p.method_code not in ('cash','bankwire','zelle','check')),0) as ap_other,
  e.ar_total, e.ap_total,
  e.receipt, e.deposit, e.return_po, e.total,          -- CONDITION (generated)
  e.jm_receipt_no                                as rc_jm_no,
  e.jm_kind,
  e.source1_id                                   as source_1,
  e.source2_id                                   as source_2,
  e.transaction_value,
  e.pct_support,
  e.old_receipt_no,
  e.deal_id,
  d.opened_date                                  as deposit_date,   -- thay DEPOSIT DATE #REF!
  d.status                                       as deal_status,
  e.status                                       as trang_thai,
  e.bell_code,
  e.note,
  e.created_at,
  -- Sale theo vị trí (counter 1/2/3, online 1/2/3)
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

-- ---------- BÁO CÁO ----------

-- Sales Daily / Sổ RC: lọc theo company + ngày trên v_rc_entry (app tự lọc)
create or replace view v_sales_daily as
select * from v_rc_entry;

-- RC thiếu nguồn: type cần source nhưng source1 trống
create or replace view v_missing_source as
select v.* from v_rc_entry v
join transaction_types tt on tt.code = v.type
where tt.requires_source and v.source_1 is null;

-- Rung chuông: có bell_code, ĐẾM 1 LẦN / deal (BR-BELL) — pickup trùng bị loại
create or replace view v_bell as
select distinct on (coalesce(v.deal_id::text, v.id::text))
  v.id, v.ngay, v.company, v.khach, v.sale_1, v.bell_code,
  coalesce(nullif(v.receipt,0), v.deposit) as so_tien, v.deal_id
from v_rc_entry v
where v.bell_code is not null
order by coalesce(v.deal_id::text, v.id::text), v.ngay;

-- Sales Online: có ít nhất 1 sale online
create or replace view v_sales_online as
select v.* from v_rc_entry v
where exists (select 1 from entry_sales es where es.rc_entry_id = v.id and es.channel = 'online');

-- Kiểm chứng (so với sổ cũ):
-- select ngay, company, type, khach, ar_cash, ar_bankwire, ar_zelle, ar_check, receipt, deposit, total
--   from v_rc_entry order by ngay desc limit 20;
-- select count(*) from v_missing_source;
-- select bell_code, count(*) from v_bell group by bell_code;
-- select count(*) from v_sales_online;
