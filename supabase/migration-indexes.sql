-- ============================================================
-- KTUS — Index tăng tốc lọc/sắp xếp/tìm kiếm
-- An toàn: chỉ TẠO index, không sửa dữ liệu. Chạy 1 lần trong SQL Editor.
-- ============================================================

-- Sổ luôn sắp theo ngày giảm dần + lọc theo công ty/trạng thái
create index if not exists idx_tx_ngay        on transactions (ngay desc);
create index if not exists idx_tx_company_ngay on transactions (company, ngay desc);
create index if not exists idx_tx_status       on transactions (trang_thai);
create index if not exists idx_tx_rc_jm_no     on transactions (rc_jm_no);
create index if not exists idx_tx_old_receipt  on transactions (old_receipt_no);

-- Join con của trang chi tiết
create index if not exists idx_line_items_tx on line_items (transaction_id);
create index if not exists idx_payments_tx   on payments (transaction_id);

-- Sao kê ngân hàng
create index if not exists idx_bank_company_ngay on bank_statements (company, ngay desc);

-- Tìm kiếm văn bản (RC#, khách, diễn giải) — dùng trigram cho ilike '%...%'
create extension if not exists pg_trgm;
create index if not exists idx_tx_khach_trgm     on transactions using gin (khach gin_trgm_ops);
create index if not exists idx_tx_diengiai_trgm  on transactions using gin (dien_giai gin_trgm_ops);
create index if not exists idx_tx_rcjm_trgm      on transactions using gin (rc_jm_no gin_trgm_ops);

-- Kiểm chứng:
-- select indexname from pg_indexes where tablename = 'transactions';
