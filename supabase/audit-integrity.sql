-- ============================================================
-- KTUS — Kiểm tra tính ĐỒNG BỘ & LIÊN KẾT ở mức DATABASE (read-only).
-- Chạy trong Supabase SQL Editor. Mọi truy vấn chỉ ĐỌC, không sửa dữ liệu.
-- ============================================================

-- 1) Đối chiếu số lượng: transactions cũ vs rc_entries mới
select (select count(*) from transactions) as tx_cu,
       (select count(*) from rc_entries)   as rc_moi,
       (select count(*) from entry_payments) as payments,
       (select count(*) from entry_sales)  as sales,
       (select count(*) from deals)        as deals;

-- 2) FK đang tồn tại trên rc_entries (phải thấy company_id, type_code, customer_id, source1/2, bell_code, deal_id)
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'rc_entries'::regclass and contype = 'f'
order by conname;

-- 3) Trigger đang hoạt động (set bucket + rollup tiền)
select tgname, tgrelid::regclass as table_name
from pg_trigger
where not tgisinternal and tgrelid in ('rc_entries'::regclass, 'entry_payments'::regclass);

-- 4) ar_total/ap_total có khớp tổng entry_payments không (trigger đúng → lệch = 0 dòng)
select count(*) as so_dong_lech_tien
from rc_entries e
left join (
  select rc_entry_id,
         sum(amount) filter (where direction='ar') as ar,
         sum(amount) filter (where direction='ap') as ap
  from entry_payments group by rc_entry_id
) p on p.rc_entry_id = e.id
where coalesce(e.ar_total,0) <> coalesce(p.ar,0)
   or coalesce(e.ap_total,0) <> coalesce(p.ap,0);

-- 5) Cột generated CONDITION đúng công thức (total = receipt+deposit-return_po) → lệch = 0 dòng
select count(*) as so_dong_total_sai
from rc_entries
where coalesce(total,0) <> coalesce(receipt,0)+coalesce(deposit,0)-coalesce(return_po,0);

-- 6) Pickup chưa nối được Deal (old_receipt_no có nhưng deal_id null) — cần rà nếu > 0
select count(*) as pickup_chua_noi_deal
from rc_entries
where coalesce(old_receipt_no,'') <> '' and deal_id is null;

-- 7) Orphan check: entry_payments/line_items/entry_sales trỏ tới rc_entry không tồn tại
--    (FK + cascade phải đảm bảo = 0; nếu > 0 là dữ liệu lỗi)
select
  (select count(*) from entry_payments p where not exists (select 1 from rc_entries e where e.id=p.rc_entry_id)) as ep_orphan,
  (select count(*) from entry_sales s   where not exists (select 1 from rc_entries e where e.id=s.rc_entry_id)) as es_orphan,
  (select count(*) from rc_line_items l where not exists (select 1 from rc_entries e where e.id=l.rc_entry_id)) as li_orphan;

-- 8) rc_entries có khách nhưng customer_id null (chưa liên kết khách) — số lượng cần biết
select count(*) as rc_chua_noi_khach
from rc_entries where customer_id is null;
