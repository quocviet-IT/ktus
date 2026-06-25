# BACKLOG — việc làm sau

## [ ] Balance Account: lọc số dư theo NGÀY / TUẦN / THÁNG / NĂM ra ĐÚNG
**Mục tiêu:** người dùng chọn ngày/tháng → mỗi tài khoản hiện số dư đúng như sheet Excel BALANCE ACCOUNT (cột theo ngày của tháng đang chọn).

**Vì sao chưa làm được ngay:** số dư theo ngày trong Excel tính từ **toàn bộ Journal Entries** (sheet `JE - US Accts. Jan-Jun` / `July-Dec`) của tất cả tài khoản (gồm thẻ/loan/chuyển nội bộ), không phải chỉ từ giao dịch RC. App chưa có dữ liệu nguồn này nên tính ra sai. Hiện đã **gỡ** cột "số dư đến ngày" + biểu đồ để tránh hiển thị số sai; chỉ giữ Beginning/Ending thật.

**2 hướng triển khai sau:**
1. **Import snapshot theo ngày/tháng** từ sheet BALANCE ACCOUNT: trích đúng các cột ngày (vd June có giá trị thật) → bảng `account_balances (account_id, ngay, balance)`; lọc = đọc thẳng. Nhanh, đúng 100% theo số Excel.
2. **Import Journal Entries (JE)** → bảng `journal_entries (account, ngay, debit/credit)`; số dư theo ngày = beginning + cộng dồn JE tới ngày đó. Đúng & "sống", nhưng việc lớn hơn.

**Cần từ người dùng:** xác nhận sheet lưu được bao nhiêu tháng có số ngày thật, và chọn hướng 1 hay 2.

**Liên quan code (khi làm lại):** `src/lib/balance-daily.ts`, `src/components/mini-line-chart.tsx` (đang để sẵn, chưa dùng), `src/app/usbc101/page.tsx` (BalanceView).
