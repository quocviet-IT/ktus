# User Stories & Tiêu chí chấp nhận — KTUS Phân hệ 1

Định dạng: **Là [vai trò], tôi muốn [chức năng] để [giá trị]**. Mỗi story có **Tiêu chí chấp nhận (AC)** kiểu Given/When/Then. Map tới màn (M0x), FR, BR trong BRD.
Vai trò GĐ1: **KT** (Kế toán US — người dùng duy nhất).

> Thứ tự đề xuất build: EPIC 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7.

---

## EPIC 0 — Nền tảng
**US-000** — Khởi tạo dự án & kết nối Supabase.
- AC: Next.js + TS chạy `dev`; kết nối Supabase OK; Drizzle migrate tạo bảng theo `schema.sql`; đăng nhập Supabase Auth (1 tài khoản KT).
- AC: Có seed danh mục (companies, sources, sales) từ `seed.sql`.

**US-001** — Quản lý danh mục (M09 / FR-CAT).
- AC: KT xem/thêm/sửa/ẩn các nhóm: Công ty, Source, Sales, Account, Mã rung chuông.
- AC: Dropdown ở các form lấy từ danh mục (không hard-code).

---

## EPIC 1 — Nhập RC (M02 / FR-RC)
**US-101** — Nhập RC bước 1 (theo scan US).
- *Là KT, tôi muốn nhập 1 RC với nhiều dòng sản phẩm để ghi nhận giao dịch.*
- AC (Given/When/Then):
  - Given form Nhập RC, When chọn Công ty + Type + Khách + nhập ≥1 dòng SP (mô tả/SL/đơn giá) + tiền A/R (Cash/Bankwire/Zelle/Check) + Lưu, Then tạo 1 transaction + line_items.
  - Then hệ thống **tự tính** receipt/deposit/return_po (BR-01) & tong_cong (BR-02) — người dùng KHÔNG nhập các cột này.
  - Then nhiều dòng SP được **gộp & tính tổng** (BR-07).
  - Then thiếu trường bắt buộc (Ngày/Công ty/Type/Khách/Số tiền) → chặn lưu, báo rõ.
- Map: FR-RC-01,02,03,05; BR-01,02,07.

**US-102** — Nhập RC bước 2 (theo JM) trên cùng đơn.
- AC: Mở lại đúng đơn → nhập rc_jm_no, source_1/2, sales(+%), sale_online, transaction_value, %support → Lưu (KHÔNG tạo bản ghi mới).
- AC: `rc_jm_no` trùng → cảnh báo & chặn (BR-05). Định dạng 9000=cọc / 1000=bán·pickup (gợi ý/cảnh báo nếu lệch Type).
- Map: FR-RC-06, FR-JM-01, FR-RC-08; BR-05.

**US-103** — Lưu nhiều mã định danh.
- AC: Lưu được so_no, appt_id; gia_no ở dòng hàng. Hiển thị ở chi tiết.
- Map: FR-RC-04.

---

## EPIC 2 — Cọc & Pickup (M04 / FR-JM-02)
**US-201** — Đơn đặt cọc + thanh toán nhiều đợt.
- AC: Tạo đơn Type=deposit (rc_jm_no `9000…`); ghi **đợt cọc đầu** (tt_dau_*).
- AC: Thêm các **đợt sau** → lưu `payments` (is_dau=false) và/hoặc cột chú thích; hệ thống **cộng dồn** (view `v_transaction_paid`): hiển thị tổng đã thu & còn thiếu (BR-06).
- Map: FR-RC-07; BR-06.

**US-202** — Pickup liên kết đơn cọc.
- AC: Tạo RC Type=pick_up, nhập `old_receipt_no` = rc_jm_no đơn cọc → hệ thống nối, lấy `deposit_date`, hiển thị số đã cọc.
- AC: `old_receipt_no` không tồn tại → cảnh báo. 1 đơn cọc có thể pickup nhiều lần.
- Map: FR-JM-02; BR-04.

---

## EPIC 3 — Trạng thái đơn (M03/M04 / FR-JM-03)
**US-301** — Đổi trạng thái & quy tắc lọc theo ngày.
- AC: Chuyển trạng thái (moi→dat_coc→dang_order→cho_giao→hoan_tat; hoặc cancel/return/exchange) — KHÔNG xoá bản ghi.
- AC (BR-10): đơn đặt 20/06, cancel 23/06 → khi lọc `ngay`=20/06 **vẫn thấy** đơn ở trạng thái Cancel.
- AC: Mọi đổi trạng thái ghi audit_log.
- Map: FR-JM-03; BR-10.

---

## EPIC 4 — Sổ giao dịch (M03)
**US-401** — Danh sách & tìm/lọc RC.
- AC: Lọc theo Công ty, khoảng Ngày, Trạng thái (gồm Cancel), Nguồn; tìm theo rc_jm_no/khách.
- AC: Bảng hiển thị cột chính; mở chi tiết (M04).
- AC: Nhật ký chỉnh sửa xem được ở chi tiết.
- Map: FR-JM, FR-SEC-02.

---

## EPIC 5 — Báo cáo (M05/M06/M07) — CỘT GIỐNG EXCEL
**US-501** — Báo cáo bán hàng ngày (PC49 & Trans).
- AC: Tự tổng hợp theo Ngày + Công ty; **đúng cột Excel** (BRD §12.1): STT, TYPE, DISCRIPTION, CUSTOMER, TỔNG CỘNG, PURCHASE/PO, RECEIPT/TOTAL RECEIPT, DEPOSIT, CASH/BANKWIRE/ZELLE/CHECK (RECEIVABLES & PAYABLES), COMPANY.
- AC: Chọn ngày (mỗi ngày 1 "sheet")/kỳ; tổng cộng cuối bảng; **xuất Excel** (SheetJS) đúng định dạng.
- Map: FR-SD-01,02,03; BR-02.

**US-502** — Báo cáo Sales Online (BRD §12.2).
- AC: Tự lọc RC có sale_online; đúng cột: NO., DATE, CUST.NAME, FACEBOOK, DECRIPTION, JM DEPOSIT#, JM RECEIPT#, SALE US, Sale Onl #1/#2/#3, %SUPPORT, TRANSACTION VALUE, LƯỢNG, CHECK.
- Map: FR-ON-01.

**US-503** — Báo cáo Rung chuông (BRD §12.3).
- AC: Tự gắn cờ đơn đạt ngưỡng [cần chốt]; thống kê theo mã RC1/RC2/RC3/SBO1; **cảnh báo nghi trùng** (cùng khách/công ty).
- Map: FR-BELL-01,02; BR-08.

---

## EPIC 6 — RC thiếu nguồn (M08 / FR-MISS)
**US-601** — Hàng đợi & vòng xử lý thiếu nguồn.
- AC: Tự lọc RC có source_1 rỗng/"Không có source" (view `v_rc_thieu_nguon`, BR-03).
- AC: Vòng trạng thái: Thiếu nguồn → Đã gửi US → US đã bổ sung (điền source + lý do) → Đã cập nhật JM (tick) → RC rời danh sách.
- AC: Cột đúng Excel (BRD §12.4): Stt, DATE, DECRIPTION, Cust., EXPENSE, RECEIPT, DEPOSIT, JM RECEIPT#, SOURCE 1, Giải thích lý do, Chọn nguồn JM.
- Map: FR-MISS-01,02; BR-03.

---

## EPIC 7 — Bảng điều khiển (M01)
**US-701** — Dashboard tổng quan.
- AC: KPI hôm nay (doanh thu Receipt, số RC, RC thiếu nguồn, …); danh sách việc cần xử lý; RC mới nhất.
- AC: Bấm vào nhạng mục → mở màn tương ứng.
- Map: FR-SD, FR-MISS.

---

## Định nghĩa "Done" (chung)
- Code TypeScript strict, không lỗi lint.
- Có test: Vitest cho business rules (BR-01,02,05,06,07,10); Playwright cho luồng chính của story.
- Migration cập nhật (drizzle-kit) nếu đổi schema.
- UI bám mockup (M0x) & cột bám Excel.
- Thao tác ghi audit_log.
