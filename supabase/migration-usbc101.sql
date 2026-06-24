-- =====================================================================
-- Migration USBC101 — thêm Company account + A/P (chi tiền)
-- Chạy 1 lần trong Supabase → SQL Editor → Run.
-- An toàn chạy lại (IF NOT EXISTS).
-- =====================================================================
alter table transactions add column if not exists company_account text;     -- "PC49 cash" / "PC49 bank" / "Trans cash" ...
alter table transactions add column if not exists ap_cash      numeric(14,2) not null default 0;
alter table transactions add column if not exists ap_bankwire  numeric(14,2) not null default 0;
alter table transactions add column if not exists ap_zelle     numeric(14,2) not null default 0;
alter table transactions add column if not exists ap_check     numeric(14,2) not null default 0;

-- Gợi ý điền company_account cho dữ liệu cũ (theo hình thức A/R đợt đầu):
update transactions
set company_account = company || case
  when ar_bankwire > 0 or ar_check > 0 then ' bank' else ' cash' end
where company_account is null;
