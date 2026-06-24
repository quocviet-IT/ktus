# Stack & Kiến trúc — Hệ thống KTUS (Phân hệ 1: Theo dõi RC)

## 1. Công nghệ đã chốt
| Lớp | Công nghệ |
|---|---|
| Frontend | **Next.js** (App Router) + **React** + **TypeScript** |
| Backend | **TypeScript** — Next.js Route Handlers / Server Actions (full-stack trong 1 repo) |
| Database | **PostgreSQL** trên **Supabase** |
| Auth | **Supabase Auth** (email/password) |
| Hosting | **Vercel** (web) — mã nguồn trên **GitHub**; DB trên **Supabase** |

## 2. Thư viện đề xuất (phù hợp dự án)
| Mục đích | Thư viện |
|---|---|
| Kết nối Supabase | `@supabase/supabase-js`, `@supabase/ssr` |
| ORM / migration (type-safe) | **Drizzle ORM** + `drizzle-kit` (hợp TypeScript + Postgres/Supabase) |
| UI | **Tailwind CSS** + **shadcn/ui** (Radix) — bảng & form đẹp, nhanh |
| Form + validation | **react-hook-form** + **zod** |
| Bảng dữ liệu (sổ giao dịch, báo cáo) | **TanStack Table** |
| Truy vấn dữ liệu | **TanStack Query** (hoặc Server Actions) |
| Ngày tháng | **date-fns** |
| Xuất Excel (báo cáo giống file gốc) | **SheetJS (xlsx)** hoặc **exceljs** |
| In/PDF | `react-to-print` hoặc `@react-pdf/renderer` |
| Biểu đồ (dashboard) | **Recharts** |
| Đa ngôn ngữ VN/EN (nếu cần) | **next-intl** |
| Lint/format | ESLint + Prettier |
| Test | **Vitest** (unit) + **Playwright** (e2e/UAT) |

## 3. Cấu trúc thư mục đề xuất
```
ktus-app/
├─ docs/                      # BRD, ERD, schema, user-stories, seed (tài liệu AI đọc)
│  ├─ BRD-QuyTrinh-RC-KTUS.md
│  ├─ ERD.md
│  ├─ schema.sql
│  ├─ user-stories.md
│  └─ mockup.html             # bản mockup tham chiếu UI
├─ src/
│  ├─ app/                    # Next.js App Router
│  │  ├─ (dashboard)/         # M01 Bảng điều khiển
│  │  ├─ rc/                  # M02 Tạo/Sửa RC, M03 Sổ giao dịch, M04 Chi tiết
│  │  ├─ reports/             # M05 Bán hàng ngày, M06 Online, M07 Rung chuông
│  │  ├─ missing-source/      # M08 RC thiếu nguồn
│  │  ├─ catalog/             # M09 Danh mục
│  │  └─ api/                 # Route Handlers (nếu cần REST)
│  ├─ components/             # UI dùng chung (shadcn)
│  ├─ db/                     # Drizzle schema + client
│  │  ├─ schema.ts
│  │  └─ index.ts
│  ├─ lib/                    # business rules (BR-01..10), helpers, excel export
│  └─ types/
├─ supabase/                  # migrations, RLS policies, seed
├─ .env.local                 # SUPABASE_URL, SUPABASE_ANON_KEY, ...
├─ CLAUDE.md                  # brief cho AI coding (đặt ở gốc repo)
└─ package.json
```

## 4. Nguyên tắc kiến trúc
- **1 repo full-stack Next.js** trên Vercel; DB Supabase tách riêng.
- **Business rules (BR-01..10) viết trong `src/lib/rules`** + một phần ràng buộc ngay ở DB (generated columns, constraints) để không sai (xem `schema.sql`).
- **Type-safe end-to-end:** Drizzle schema → types dùng chung FE/BE; zod validate input.
- **RLS (Row Level Security)** bật trên Supabase; GĐ1 1 người dùng nhưng vẫn cấu trúc sẵn cho đa người dùng.
- **Báo cáo phải khớp cột Excel** (mục 12 BRD) — render bảng đúng tiêu đề, xuất xlsx.
- **Audit log** mọi thao tác sửa (trigger DB hoặc tầng app).

## 5. Biến môi trường (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # chỉ dùng phía server
DATABASE_URL=postgresql://...        # cho Drizzle migrate
```
