-- ============================================================
-- KTUS — Phase 2 (bổ sung trường nhập liệu theo feedback họp)
--   • Sale #2, #3 + tỷ lệ % phân bổ (PC49: 2 sale, TRANS: 3 sale)
--   • Sale Online #2, #3
--   • Tổng tiền đơn hàng (order_total) → tính "còn lại" qua nhiều đợt
-- An toàn: chỉ THÊM cột nullable, không sửa/không xoá dữ liệu cũ.
-- Chạy 1 lần trong Supabase SQL Editor.
-- ============================================================

alter table transactions add column if not exists sale_2          text;
alter table transactions add column if not exists sale_3          text;
alter table transactions add column if not exists sale_1_pct      numeric;
alter table transactions add column if not exists sale_2_pct      numeric;
alter table transactions add column if not exists sale_3_pct      numeric;
alter table transactions add column if not exists sale_online_2   text;
alter table transactions add column if not exists sale_online_3   text;
alter table transactions add column if not exists order_total     numeric;

-- Backfill order_total = tổng dòng hàng (nếu chưa có) cho các đơn đã nhập
update transactions t
set order_total = sub.tong
from (
  select transaction_id, sum(so_luong * don_gia) as tong
  from line_items group by transaction_id
) sub
where sub.transaction_id = t.id
  and t.order_total is null
  and sub.tong > 0;

-- Kiểm chứng
-- select id, sale_1, sale_1_pct, sale_2, sale_2_pct, sale_3, sale_3_pct, order_total from transactions limit 20;
