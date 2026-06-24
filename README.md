# KTUS — Web app theo dõi RC (Phân hệ 1)

Next.js (App Router) + TypeScript + Tailwind + Supabase/Drizzle. Tài liệu: `docs/` (BRD, ERD, schema, user-stories, ui-ux-skill, mockup).

## Chạy nhanh (demo — không cần DB)
```bash
cd ktus-app
pnpm install        # hoặc npm install / yarn
pnpm dev            # mở http://localhost:3000
```
Mặc định `USE_DB=false` → app dùng **dữ liệu mẫu giống Excel** trong bộ nhớ (`src/lib/store.ts`). Thêm/sửa/đổi trạng thái hoạt động ngay trong phiên dev.

## Màn hình
| Đường dẫn | Màn (BRD) |
|---|---|
| `/` | M01 Bảng điều khiển |
| `/rc/new` | M02 Nhập RC (2 bước, nhiều dòng, tự tính tổng) |
| `/rc` | M03 Sổ giao dịch (list — không lưới Excel) |
| `/rc/[id]` | M04 Chi tiết đơn (dòng hàng, thanh toán, cọc↔pickup) |
| `/reports/sales-daily` | M05 Báo cáo bán hàng ngày (**bảng đúng cột Excel**) |
| `/reports/sales-online` | M06 Sales Online (bảng đúng cột Excel) |
| `/reports/bell` | M07 Rung chuông (thẻ mã + cảnh báo trùng) |
| `/missing-source` | M08 RC thiếu nguồn (vòng xử lý) |
| `/catalog` | M09 Danh mục (Validation List) |
| `/inventory` | ② Tồn kho PC49 — đối chiếu KT↔US |

## Quy tắc nghiệp vụ đã cài (BR)
- **BR-01/02**: Receipt/Deposit/Return-PO & TỔNG CỘNG **tự tính** (`src/lib/rules.ts`, và generated columns trong `docs/schema.sql`).
- **BR-05**: mã JM 9000=cọc / 1000=bán·pickup.
- **BR-06**: thanh toán đợt đầu + chú thích, tự cộng "đã thu / còn thiếu".
- **BR-07**: 1 RC nhiều dòng → gộp & tính tổng khi lưu.
- **BR-10**: đơn Cancel vẫn hiển thị theo ngày gốc.

## Bật Supabase thật (3 bước)
App truy cập DB qua **supabase-js (HTTPS, dùng publishable key)** — không cần mở cổng 5432, chạy tốt trên Vercel.

1. **Tạo bảng + seed:** mở **Supabase → SQL Editor**, dán toàn bộ **`supabase/setup.sql`** → **Run**.
2. **Bật cờ:** trong `.env.local` đổi `USE_DB=false` → **`USE_DB=true`** (URL + publishable key đã có sẵn).
3. **Khởi động lại** `pnpm dev`. Giờ mọi thêm/sửa/đổi trạng thái lưu thẳng vào Supabase.

Lớp dữ liệu: `src/lib/data.ts` (facade) → `src/lib/db-repo.ts` (supabase-js) khi `USE_DB=true`, hoặc `src/lib/store.ts` (bộ nhớ) khi `false`.

> ⚠️ **Bảo mật:** `setup.sql` đang mở quyền cho `anon` (GĐ1, 1 người dùng nội bộ). Khi thêm Đăng nhập (Supabase Auth) → siết RLS còn `authenticated`. **Đổi mật khẩu DB** vì đã lộ trong chat.
> Drizzle (`src/db/`) + `DATABASE_URL` chỉ cần cho migration; runtime dùng supabase-js nên không bắt buộc.

## Cấu trúc
```
src/app        # các màn (App Router) + actions.ts (server actions)
src/components # sidebar, page-header, rc-row, status-badge, legend-bar
src/lib        # types, rules (BR), format, store (seed Excel), supabase
src/db         # Drizzle schema + client
docs           # tài liệu nghiệp vụ & thiết kế
```

## TODO tiếp theo
- Nối Auth + RLS chặt hơn + audit log.
- Tồn kho: lấy số dư tiền PC49 từ USBC101 (BALANCE ACCOUNT).
- Chốt các điểm `[cần chốt]` trong BRD §22 (ngưỡng rung chuông, chia % sales, JM API…).
