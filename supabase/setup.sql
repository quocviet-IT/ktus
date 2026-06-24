-- =====================================================================
-- KTUS — setup.sql  (DÁN VÀO Supabase → SQL Editor → RUN)
-- Tạo bảng (mô hình đơn giản khớp app) + RLS (GĐ1) + dữ liệu seed.
-- Cột Receipt/Deposit/Return-PO/Tổng cộng & thành tiền = GENERATED (BR-01/02/07).
-- =====================================================================
create extension if not exists "pgcrypto";

drop table if exists payments cascade;
drop table if exists line_items cascade;
drop table if exists transactions cascade;

-- ---------- GIAO DỊCH / RC ----------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  ngay date not null,
  company text not null,                 -- PC49 / Trans / HPLLC / 3NVY / Other / TDW
  type text not null,                    -- receipt|deposit|pick_up|extra_deposit|po|return|exchange|transfer|repair
  ma_sku text,
  dien_giai text,
  khach text not null,
  contact text,

  expense numeric(14,2) not null default 0,
  ar_cash numeric(14,2) not null default 0,
  ar_bankwire numeric(14,2) not null default 0,
  ar_zelle numeric(14,2) not null default 0,
  ar_check numeric(14,2) not null default 0,

  receipt numeric(14,2) generated always as (
    case when type in ('receipt','pick_up','repair') then ar_cash+ar_bankwire+ar_zelle+ar_check else 0 end) stored,
  deposit numeric(14,2) generated always as (
    case when type in ('deposit','extra_deposit') then ar_cash+ar_bankwire+ar_zelle+ar_check else 0 end) stored,
  return_po numeric(14,2) generated always as (
    case when type in ('po','return','exchange') then expense else 0 end) stored,
  tong_cong numeric(14,2) generated always as (
    (case when type in ('receipt','pick_up','repair') then ar_cash+ar_bankwire+ar_zelle+ar_check else 0 end)
   +(case when type in ('deposit','extra_deposit') then ar_cash+ar_bankwire+ar_zelle+ar_check else 0 end)
   -(case when type in ('po','return','exchange') then expense else 0 end)) stored,

  rc_jm_no text unique,
  so_no text, appt_id text,
  source_1 text, source_2 text,
  sale_1 text, sale_online text,
  transaction_value text,
  pct_support numeric(5,2),
  old_receipt_no text,
  deposit_date date,
  bell_code text,
  trang_thai text not null default 'moi',
  note text,
  tt_dau_ngay date, tt_dau_so_tien numeric(14,2), tt_dau_hinh_thuc text,
  chu_thich_thanh_toan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on transactions (ngay);
create index on transactions (company, ngay);
create index on transactions (trang_thai);

create table line_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  mo_ta text, sku text, gia_no text,
  so_luong numeric(14,3) default 0,
  don_gia numeric(14,2) default 0,
  thanh_tien numeric(14,2) generated always as (coalesce(so_luong,0)*coalesce(don_gia,0)) stored
);
create index on line_items (transaction_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  ngay date not null,
  so_tien numeric(14,2) not null,
  hinh_thuc text,
  nguoi_xac_nhan text,
  ghi_chu text,
  is_dau boolean not null default false
);
create index on payments (transaction_id);

-- updated_at tự cập nhật
create or replace function fn_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end$$;
create trigger trg_touch before update on transactions for each row execute function fn_touch();

-- ---------- RLS ----------
-- ⚠️ GĐ1 chỉ 1 người dùng nội bộ: tạm cho 'anon' (publishable key) toàn quyền.
--    KHI có Auth: siết lại còn 'authenticated' và bỏ quyền anon.
alter table transactions enable row level security;
alter table line_items   enable row level security;
alter table payments     enable row level security;
do $$
declare t text;
begin
  foreach t in array array['transactions','line_items','payments'] loop
    execute format('drop policy if exists %I_all on %I;', t, t);
    execute format('create policy %I_all on %I for all to anon, authenticated using (true) with check (true);', t, t);
  end loop;
end$$;

-- =====================================================================
-- SEED (giống dữ liệu Excel)
-- =====================================================================
-- 1) Travis — ĐẶT CỌC (9000)
insert into transactions (id, ngay, company, type, ma_sku, dien_giai, khach, contact,
  ar_zelle, rc_jm_no, so_no, appt_id, source_1, sale_1, trang_thai, note,
  tt_dau_ngay, tt_dau_so_tien, tt_dau_hinh_thuc, chu_thich_thanh_toan)
values ('11111111-0000-0000-0000-000000000001','2025-02-10','Trans','deposit','DRIMT',
  'Đặt cọc nhẫn KC 3.04ct + ổ 18K Hidden Halo','Travis & Jasmin','251-442-1392',
  25,'9000025890','25.8903','AP-20250221-001','RF-APPT','T.Vân','dang_order','KThy confirmed OK. Tổng đơn $5,200',
  '2025-02-10',25,'zelle','2025-02-27 $700 Card; 2025-03-20 $510 Zelle; 2025-05-27 $371 Zelle; 2025-07-19 $500 Zelle; 2025-07-19 -$100 OFF; 2025-09-04 $1200 Zelle; 2026-01-12 $700 Zelle; 2026-01-22 $1119 Zelle');
insert into line_items (transaction_id, mo_ta, gia_no, so_luong, don_gia) values
  ('11111111-0000-0000-0000-000000000001','Lab Diamond 3.04ct Radiant, H/VS1','627473694',1,3700),
  ('11111111-0000-0000-0000-000000000001','18K Hidden Halo Engagement Ring Setting',null,1,1400);
insert into payments (transaction_id, ngay, so_tien, hinh_thuc, nguoi_xac_nhan, is_dau, ghi_chu) values
  ('11111111-0000-0000-0000-000000000001','2025-02-10',25,'zelle',null,true,'Đợt đầu'),
  ('11111111-0000-0000-0000-000000000001','2025-02-27',700,'card','KThy',false,null),
  ('11111111-0000-0000-0000-000000000001','2025-03-20',510,'zelle',null,false,null),
  ('11111111-0000-0000-0000-000000000001','2025-05-27',371,'zelle',null,false,null),
  ('11111111-0000-0000-0000-000000000001','2025-07-19',500,'zelle',null,false,null),
  ('11111111-0000-0000-0000-000000000001','2025-07-19',-100,null,null,false,'OFF refer-a-friend'),
  ('11111111-0000-0000-0000-000000000001','2025-09-04',1200,'zelle',null,false,null),
  ('11111111-0000-0000-0000-000000000001','2026-01-12',700,'zelle',null,false,null),
  ('11111111-0000-0000-0000-000000000001','2026-01-22',1119,'zelle',null,false,null);

-- 2) Travis — PICKUP (1000)
insert into transactions (id, ngay, company, type, ma_sku, dien_giai, khach, contact,
  ar_zelle, rc_jm_no, source_1, sale_1, old_receipt_no, deposit_date, bell_code, trang_thai)
values ('11111111-0000-0000-0000-000000000002','2026-03-04','Trans','pick_up','DRIMT',
  'Pickup nhẫn KC 3.04ct (đơn 25.8903)','Travis & Jasmin','251-442-1392',
  1844,'1000083600','RF-APPT','T.Vân','9000025890','2025-02-10','RC2','hoan_tat');

-- 3) PC49 — bán 1L VRP
insert into transactions (id, ngay, company, type, ma_sku, dien_giai, khach,
  ar_cash, rc_jm_no, source_1, sale_1, bell_code, trang_thai)
values ('22222222-0000-0000-0000-000000000003','2026-06-22','PC49','receipt','VRP',
  'Khách mua 1L VRP','Chị Thủy Cù',5310,'1000012438','WI','S.Mai','RC2','hoan_tat');
insert into line_items (transaction_id, mo_ta, so_luong, don_gia) values
  ('22222222-0000-0000-0000-000000000003','Vàng ròng VRP 1 lượng',1,5310);
insert into payments (transaction_id, ngay, so_tien, hinh_thuc, is_dau) values
  ('22222222-0000-0000-0000-000000000003','2026-06-22',5310,'cash',true);

-- 4) PC49 — bán 3L VRP (online)
insert into transactions (id, ngay, company, type, ma_sku, dien_giai, khach,
  ar_bankwire, rc_jm_no, source_1, sale_1, sale_online, transaction_value, pct_support, bell_code, trang_thai)
values ('22222222-0000-0000-0000-000000000004','2026-06-21','PC49','receipt','VRP',
  'Khách mua 3L VRP','Nhung Cai',16935,'1000012394','TEL','N.Ý','Văn Vương US','3 lượng',0.8,'SBO1','hoan_tat');
insert into line_items (transaction_id, mo_ta, so_luong, don_gia) values
  ('22222222-0000-0000-0000-000000000004','Vàng ròng VRP 3 lượng',3,5645);

-- 5) PC49 — thiếu nguồn
insert into transactions (id, ngay, company, type, ma_sku, dien_giai, khach,
  ar_cash, rc_jm_no, source_1, sale_1, bell_code, trang_thai)
values ('22222222-0000-0000-0000-000000000005','2026-06-21','PC49','receipt','VRP',
  'Khách mua 1L VRP','Thi Nguyen',5770,'1000012395','','T.Vân','RC2','hoan_tat');

-- 6) PC49 — mua vào PO
insert into transactions (id, ngay, company, type, ma_sku, dien_giai, khach,
  expense, source_1, sale_1, trang_thai)
values ('22222222-0000-0000-0000-000000000006','2026-06-20','PC49','po','16k',
  'Mua vào 6.5gr vàng 16k','Chị Loan',425,'WI','S.Mai','hoan_tat');

-- 7) Trans — đặt cọc thiếu nguồn
insert into transactions (id, ngay, company, type, ma_sku, dien_giai, khach, contact,
  ar_cash, rc_jm_no, source_1, sale_1, trang_thai)
values ('33333333-0000-0000-0000-000000000007','2026-06-23','Trans','deposit','24KRI',
  'Khách đặt cọc 01 (24KRI) nhẫn trơn 24K','Chi Hanh','669-321-9393',546,'90014223','','B.Khanh','dat_coc');

-- 8) Trans — đơn cancel demo
insert into transactions (id, ngay, company, type, ma_sku, dien_giai, khach,
  rc_jm_no, source_1, sale_1, trang_thai)
values ('33333333-0000-0000-0000-000000000008','2026-06-19','Trans','exchange','18KRI',
  'Khách đổi 01 (18KRI) — đơn cancel demo','Anh Khoa','1000083700','FB','T.Quỳnh','cancel');
