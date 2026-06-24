-- =====================================================================
-- KTUS — Seed dữ liệu mẫu (chạy sau schema.sql)
-- Lấy theo dữ liệu thật trong file gốc + ví dụ đơn Travis
-- =====================================================================

-- Công ty
insert into companies(code, name) values
  ('PC49','PC49'), ('Trans','Trans / TFJ'), ('HPLLC','HPLLC'),
  ('3NVY','3NVY'), ('Other','Other'), ('TDW','TDW')
on conflict (code) do nothing;

-- Danh mục lookups
insert into lookups(grp, code, label, sort) values
  ('source','WI','Walk-in',1),('source','TEL','Telephone',2),('source','FB','Facebook',3),
  ('source','IG-APPT','Instagram Appt',4),('source','RF-APPT','Referral Appt',5),
  ('source','RC','RC',6),('source','VIP','VIP',7),
  ('bell_code','RC1','Rung chuông 1',1),('bell_code','RC2','Rung chuông 2',2),
  ('bell_code','RC3','Rung chuông 3',3),('bell_code','SBO1','Sales online',4),
  ('account','TRANS CASH','Trans Cash',1),('account','TRANS BANK','Trans Bank',2),
  ('account','PC49 CASH','PC49 Cash',3),('account','PC49 BANK','PC49 Bank',4)
on conflict (grp, code) do nothing;

-- Sales
insert into sales_people(ten, kind) values
  ('T.Vân','counter'),('B.Khanh','counter'),('S.Mai','counter'),
  ('N.Ý','counter'),('T.Quỳnh','counter'),
  ('Văn Vương US','online'),('Mạnh Thắng US','online'),
  ('Trà My US','online'),('Kim Thanh US','online');

-- Khách hàng
insert into customers(ten, sdt, nguon) values
  ('Travis & Jasmin','251-442-1392','RF-APPT'),
  ('Chị Thủy Cù',null,'WI'),
  ('Nhung Cai',null,'TEL'),
  ('Thi Nguyen',null,null),
  ('Lizanne','408-802-5834','WI');

-- ---------- Ví dụ đơn Travis: ĐẶT CỌC (mã 9000) ----------
insert into transactions(ngay, company_id, type, dien_giai, customer_id,
  rc_jm_no, so_no, appt_id, source_1, trang_thai,
  tt_dau_ngay, tt_dau_so_tien, tt_dau_hinh_thuc, chu_thich_thanh_toan, note)
values (
  date '2025-02-10',
  (select id from companies where code='Trans'),
  'deposit',
  'Đặt cọc nhẫn KC 3.04ct + ổ 18K Hidden Halo',
  (select id from customers where ten='Travis & Jasmin'),
  '9000025890', '25.8903', 'AP-20250221-001', 'RF-APPT', 'dang_order',
  date '2025-02-10', 25.00, 'zelle',
  '2025-02-27 $700 Card; 2025-03-20 $510 Zelle; 2025-05-27 $371 Zelle; 2025-07-19 $500 Zelle; 2025-07-19 -$100 OFF refer-a-friend; 2025-09-04 $1200 Zelle; 2026-01-12 $700 Zelle; 2026-01-22 $1119 Zelle',
  'KThy confirmed OK. Tổng đơn $5,200');

-- Dòng hàng của đơn Travis (2 dòng — gộp & tự tính)
insert into line_items(transaction_id, mo_ta, gia_no, so_luong, don_gia) values
  ((select id from transactions where rc_jm_no='9000025890'),
   'Lab Diamond 3.04ct Radiant, H/VS1', '627473694', 1, 3700.00),
  ((select id from transactions where rc_jm_no='9000025890'),
   '18K Hidden Halo Engagement Ring Setting', null, 1, 1400.00);

-- Các đợt thanh toán (đợt đầu + các đợt sau)
insert into payments(transaction_id, ngay, so_tien, hinh_thuc, nguoi_xac_nhan, is_dau, ghi_chu) values
  ((select id from transactions where rc_jm_no='9000025890'), '2025-02-10', 25.00, 'zelle', null, true, 'Đợt đầu'),
  ((select id from transactions where rc_jm_no='9000025890'), '2025-02-27', 700.00, 'card', 'KThy', false, null),
  ((select id from transactions where rc_jm_no='9000025890'), '2025-03-20', 510.00, 'zelle', null, false, null),
  ((select id from transactions where rc_jm_no='9000025890'), '2025-05-27', 371.00, 'zelle', null, false, null),
  ((select id from transactions where rc_jm_no='9000025890'), '2025-07-19', 500.00, 'zelle', null, false, null),
  ((select id from transactions where rc_jm_no='9000025890'), '2025-07-19', -100.00, null, null, false, 'OFF refer-a-friend'),
  ((select id from transactions where rc_jm_no='9000025890'), '2025-09-04', 1200.00, 'zelle', null, false, null),
  ((select id from transactions where rc_jm_no='9000025890'), '2026-01-12', 700.00, 'zelle', null, false, null),
  ((select id from transactions where rc_jm_no='9000025890'), '2026-01-22', 1119.00, 'zelle', null, false, null);

-- Sales chia đơn (HA/KThy/TV)
insert into transaction_sales(transaction_id, sale_id, vai_tro, ty_le_pct) values
  ((select id from transactions where rc_jm_no='9000025890'),
   (select id from sales_people where ten='T.Vân' limit 1), '#1', 50),
  ((select id from transactions where rc_jm_no='9000025890'),
   (select id from sales_people where ten='B.Khanh' limit 1), '#2', 50);

-- ---------- Travis: PICKUP (mã 1000, nối đơn cọc) ----------
insert into transactions(ngay, company_id, type, dien_giai, customer_id,
  rc_jm_no, source_1, old_receipt_no, deposit_date, bell_code, trang_thai,
  ar_zelle)
values (
  date '2026-03-04',
  (select id from companies where code='Trans'),
  'pick_up',
  'Pickup nhẫn KC 3.04ct (đơn 25.8903)',
  (select id from customers where ten='Travis & Jasmin'),
  '1000083600', 'RF-APPT', '9000025890', date '2025-02-10', 'RC2', 'hoan_tat',
  1844.00);

-- ---------- PC49: bán lẻ vàng miếng ----------
insert into transactions(ngay, company_id, type, dien_giai, customer_id,
  rc_jm_no, source_1, trang_thai, ar_cash)
values
 (date '2026-06-22', (select id from companies where code='PC49'), 'receipt',
  'Khách mua 1L VRP', (select id from customers where ten='Chị Thủy Cù'),
  '1000012438', 'WI', 'hoan_tat', 5310.00),
 (date '2026-06-21', (select id from companies where code='PC49'), 'receipt',
  'Khách mua 1L VRP', (select id from customers where ten='Thi Nguyen'),
  '1000012395', null, 'hoan_tat', 5770.00);   -- thiếu nguồn (source_1 null)

insert into line_items(transaction_id, mo_ta, so_luong, don_gia) values
 ((select id from transactions where rc_jm_no='1000012438'), 'Vàng ròng VRP 1 lượng', 1, 5310.00),
 ((select id from transactions where rc_jm_no='1000012395'), 'Vàng ròng VRP 1 lượng', 1, 5770.00);

-- Kiểm tra nhanh: select rc_jm_no, type, receipt, deposit, return_po, tong_cong from transactions;
