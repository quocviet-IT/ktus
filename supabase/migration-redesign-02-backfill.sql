-- ============================================================
-- KTUS REDESIGN — Bước 8 (sớm): Backfill `transactions` cũ → mô hình mới.
-- Nguồn: bảng `transactions` đang chạy. Đích: rc_entries / entry_payments /
-- rc_line_items / entry_sales / deals / customers / sales_people.
-- AN TOÀN: không xoá `transactions`; rc_entries.id = transactions.id để idempotent
-- (chạy lại không nhân đôi). Yêu cầu: đã chạy migration-redesign-01-core.sql.
-- ============================================================

-- 0) Nới rộng cột % cho dữ liệu cũ (lưu 80/100 thay vì 0.8) → tránh numeric overflow.
alter table rc_entries  alter column pct_support type numeric(7,4);
alter table entry_sales alter column pct        type numeric(7,4);

-- 1) Khách hàng: tạo từ tên (chuẩn hoá phone), bỏ qua nếu đã có theo tên
insert into customers (ten, phone_raw, phone_normalized)
select distinct on (lower(trim(t.khach)))
       t.khach, t.contact,
       nullif(regexp_replace(coalesce(t.contact,''), '\D', '', 'g'), '')
from transactions t
where t.khach is not null and trim(t.khach) <> ''
  and not exists (select 1 from customers c where lower(trim(c.ten)) = lower(trim(t.khach)))
order by lower(trim(t.khach)), t.contact nulls last;

-- 2) Nhân viên sale: counter (sale_1/2/3) + online (sale_online/2/3)
insert into sales_people (ten, kind)
select distinct nm, 'counter' from (
  select sale_1 nm from transactions
  union select sale_2 from transactions
  union select sale_3 from transactions) s
where nm is not null and trim(nm) <> ''
  and not exists (select 1 from sales_people sp where lower(trim(sp.ten)) = lower(trim(s.nm)));

insert into sales_people (ten, kind)
select distinct nm, 'online' from (
  select sale_online nm from transactions
  union select sale_online_2 from transactions
  union select sale_online_3 from transactions) s
where nm is not null and trim(nm) <> ''
  and not exists (select 1 from sales_people sp where lower(trim(sp.ten)) = lower(trim(s.nm)));

-- 3) rc_entries (giữ nguyên id + ngày gốc). company không khớp → Other. source/bell chỉ set khi có trong danh mục.
insert into rc_entries (id, company_id, entry_date, type_code, description, customer_id,
  contact_raw, sku_raw, bell_code, expense, jm_receipt_no, source1_id, source2_id,
  transaction_value, pct_support, old_receipt_no, note, created_at)
select t.id,
  coalesce((select id from companies where code = t.company),
           (select id from companies where code = 'Other')),
  t.ngay,
  coalesce((select code from transaction_types tt where tt.code = t.type), 'receipt'),
  t.dien_giai,
  (select c.id from customers c where lower(trim(c.ten)) = lower(trim(t.khach)) limit 1),
  t.contact, t.ma_sku,
  (select bc.code from bell_codes bc where bc.code = t.bell_code),
  coalesce(t.expense, 0),
  t.rc_jm_no,
  (select s.code from sources s where s.code = t.source_1),
  (select s.code from sources s where s.code = t.source_2),
  t.transaction_value, t.pct_support, t.old_receipt_no, t.note, t.created_at
from transactions t
on conflict (id) do nothing;

-- 4) entry_payments: tách A/R + A/P theo từng hình thức (trigger tự cộng ar_total/ap_total)
insert into entry_payments (rc_entry_id, direction, method_code, amount)
select id,'ar','cash',ar_cash         from transactions where coalesce(ar_cash,0)<>0
union all select id,'ar','bankwire',ar_bankwire from transactions where coalesce(ar_bankwire,0)<>0
union all select id,'ar','zelle',ar_zelle       from transactions where coalesce(ar_zelle,0)<>0
union all select id,'ar','check',ar_check       from transactions where coalesce(ar_check,0)<>0
union all select id,'ap','cash',ap_cash         from transactions where coalesce(ap_cash,0)<>0
union all select id,'ap','bankwire',ap_bankwire from transactions where coalesce(ap_bankwire,0)<>0
union all select id,'ap','zelle',ap_zelle       from transactions where coalesce(ap_zelle,0)<>0
union all select id,'ap','check',ap_check       from transactions where coalesce(ap_check,0)<>0
on conflict (rc_entry_id, direction, method_code) do nothing;

-- 5) rc_line_items từ line_items cũ (chỉ khi entry chưa có dòng nào → idempotent)
insert into rc_line_items (rc_entry_id, line_no, description, sku, gia_no, qty, unit_price)
select li.transaction_id,
       row_number() over (partition by li.transaction_id order by li.id),
       li.mo_ta, li.sku, li.gia_no, li.so_luong, li.don_gia
from line_items li
where exists (select 1 from rc_entries e where e.id = li.transaction_id)
  and not exists (select 1 from rc_line_items r where r.rc_entry_id = li.transaction_id);

-- 6) entry_sales từ tên phẳng (counter 1/2/3 + online 1/2/3)
insert into entry_sales (rc_entry_id, salesperson_id, channel, position, pct)
select t.id, sp.id, 'counter', 1, t.sale_1_pct from transactions t
  join sales_people sp on lower(trim(sp.ten)) = lower(trim(t.sale_1))
  where coalesce(trim(t.sale_1),'') <> ''
on conflict (rc_entry_id, channel, position) do nothing;
insert into entry_sales (rc_entry_id, salesperson_id, channel, position, pct)
select t.id, sp.id, 'counter', 2, t.sale_2_pct from transactions t
  join sales_people sp on lower(trim(sp.ten)) = lower(trim(t.sale_2))
  where coalesce(trim(t.sale_2),'') <> ''
on conflict (rc_entry_id, channel, position) do nothing;
insert into entry_sales (rc_entry_id, salesperson_id, channel, position, pct)
select t.id, sp.id, 'counter', 3, t.sale_3_pct from transactions t
  join sales_people sp on lower(trim(sp.ten)) = lower(trim(t.sale_3))
  where coalesce(trim(t.sale_3),'') <> ''
on conflict (rc_entry_id, channel, position) do nothing;
insert into entry_sales (rc_entry_id, salesperson_id, channel, position, pct)
select t.id, sp.id, 'online', 1, t.pct_support from transactions t
  join sales_people sp on lower(trim(sp.ten)) = lower(trim(t.sale_online))
  where coalesce(trim(t.sale_online),'') <> ''
on conflict (rc_entry_id, channel, position) do nothing;
insert into entry_sales (rc_entry_id, salesperson_id, channel, position, pct)
select t.id, sp.id, 'online', 2, null from transactions t
  join sales_people sp on lower(trim(sp.ten)) = lower(trim(t.sale_online_2))
  where coalesce(trim(t.sale_online_2),'') <> ''
on conflict (rc_entry_id, channel, position) do nothing;
insert into entry_sales (rc_entry_id, salesperson_id, channel, position, pct)
select t.id, sp.id, 'online', 3, null from transactions t
  join sales_people sp on lower(trim(sp.ten)) = lower(trim(t.sale_online_3))
  where coalesce(trim(t.sale_online_3),'') <> ''
on conflict (rc_entry_id, channel, position) do nothing;

-- 7) deals: tạo 1 deal cho mỗi đơn cọc (anchor), rồi nối pickup/return/cancel theo old_receipt_no
insert into deals (company_id, customer_id, opened_date, anchor_entry_id, status)
select e.company_id, e.customer_id, e.entry_date, e.id, 'open'
from rc_entries e
where e.type_code in ('deposit','extra_deposit')
  and not exists (select 1 from deals d where d.anchor_entry_id = e.id);

update rc_entries e set deal_id = d.id
from deals d where d.anchor_entry_id = e.id and e.deal_id is null;

update rc_entries e set deal_id = d.id
from rc_entries dep
  join deals d on d.anchor_entry_id = dep.id
where e.deal_id is null
  and coalesce(e.old_receipt_no,'') <> ''
  and e.old_receipt_no = dep.jm_receipt_no;

-- Kiểm chứng:
-- select count(*) tx from transactions; select count(*) rc from rc_entries;
-- select e.entry_date, e.type_code, e.ar_total, e.receipt, e.deposit, e.return_po, e.total
--   from rc_entries e order by e.entry_date desc limit 20;
-- select count(*) deals from deals; select count(*) pays from entry_payments; select count(*) sales from entry_sales;
