# CLAUDE.md — Hướng dẫn cho AI coding (đặt ở GỐC repo)

> File này AI đọc mỗi phiên. Mục tiêu: code đúng nghiệp vụ KTUS, đúng stack, đúng quy ước.

## Dự án
Hệ thống quản lý **theo dõi RC (phiếu thu/giao dịch) mỗi ngày** cho phòng Kế toán US (HPUS-KT210), thay cho hệ thống Excel/Google Sheets. **Phân hệ 1 (MVP)** — xem `docs/BRD-QuyTrinh-RC-KTUS.md` (đọc TRƯỚC khi code).

## Tài liệu phải đọc (theo thứ tự)
1. `docs/BRD-QuyTrinh-RC-KTUS.md` — yêu cầu nghiệp vụ, FR, BR, use case.
2. `docs/ERD.md` + `docs/schema.sql` — mô hình dữ liệu (nguồn chân lý cho DB).
3. `docs/user-stories.md` — đơn vị công việc + tiêu chí chấp nhận. **Làm từng story một.**
4. `docs/mockup.html` — wireframe UI (mở bằng trình duyệt để xem màn M01–M09).
5. `docs/ui-ux-skill.md` — **skill UI/UX**: tokens, layout, list-first, form, màu trạng thái, copy. Đọc TRƯỚC khi code bất kỳ giao diện nào.

## Stack (KHÔNG đổi nếu không được yêu cầu)
- Next.js (App Router) + React + TypeScript
- Supabase (PostgreSQL + Auth) · Drizzle ORM + drizzle-kit
- Tailwind + shadcn/ui · react-hook-form + zod · TanStack Table/Query · date-fns · SheetJS (xuất Excel)
- Deploy: Vercel (web) + GitHub; DB: Supabase
- Test: Vitest + Playwright

## Quy ước
- **TypeScript strict**; không dùng `any` trừ khi bắt buộc.
- Type dữ liệu lấy từ **Drizzle schema** (`src/db/schema.ts`) — không tự định nghĩa lại.
- Validate mọi input bằng **zod**; form bằng **react-hook-form**.
- Business rules để trong `src/lib/rules/` (mỗi BR 1 hàm, đặt tên `brXX_*`), có unit test.
- Đặt tên trường DB theo `docs/schema.sql` (snake_case); component React PascalCase.
- Tiền tệ **USD**; ngày dùng `date-fns`, lưu DB kiểu `date`/`timestamptz`.
- Mọi thao tác sửa/xoá → ghi **audit_log**.

## Quy tắc nghiệp vụ TUYỆT ĐỐI đúng (chi tiết ở BRD §13)
- **BR-01 CONDITION:** `receipt` = SUM(tiền A/R) khi type ∈ {receipt, pick_up, repair}; `deposit` khi {deposit, extra_deposit}; `return_po` khi {return, exchange}. (Đã làm sẵn ở DB bằng generated columns — KHÔNG nhập tay.)
- **BR-02:** TỔNG CỘNG = receipt + deposit − return_po.
- **BR-05 Mã JM:** `9000…` = đơn đặt cọc; `1000…` = đơn bán hàng / pickup. Số RC JM duy nhất.
- **BR-06 Thanh toán nhiều lần:** ghi đợt đầu ở field riêng; các đợt sau lưu bảng `payments`, UI hiển thị dạng "đợt đầu + cột chú thích"; tự cộng dồn.
- **BR-07 Nhiều dòng sản phẩm:** nhập riêng từng dòng (`line_items`), khi lưu **gộp & tự tính tổng**.
- **BR-10 Cancel & lọc theo ngày:** đổi trạng thái KHÔNG xoá bản ghi; đơn vẫn hiển thị ở ngày giao dịch gốc với trạng thái hiện tại. (VD: đặt 20/06, cancel 23/06 → lọc 20/06 vẫn thấy đơn ở trạng thái Cancel.)
- **Nhập 2 bước, 1 bản ghi:** (1) theo scan US → (2) bổ sung theo JM. KHÔNG tạo 2 bản ghi.
- **Báo cáo phải khớp cột Excel** (BRD §12) — đúng tên & thứ tự cột.

## Cách làm việc mong muốn
- Trước khi code 1 story: tóm tắt hiểu biết + kế hoạch ngắn, rồi mới code.
- Mỗi story: code + test (Vitest cho rule, Playwright cho luồng) + cập nhật migration nếu đổi schema.
- Migration qua **drizzle-kit**; không sửa DB tay trên Supabase.
- Không hard-code danh mục (Type/Source/Sales/Account) — đọc từ bảng danh mục.

## Lệnh (điền sau khi khởi tạo)
```
pnpm dev            # chạy local
pnpm drizzle-kit generate / migrate   # migration
pnpm test           # Vitest
pnpm exec playwright test             # e2e
```

## Trạng thái & câu còn mở (BRD §22)
Một số quy tắc còn `[cần chốt]` (ngưỡng rung chuông, cách chia % sales, JM có API?…). Khi gặp, **hỏi lại / để TODO**, không tự bịa logic.
