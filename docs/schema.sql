-- =====================================================================
-- KTUS — Phân hệ 1 (Theo dõi RC) — PostgreSQL / Supabase schema
-- Nguồn: BRD §16 (Data Dictionary) & §13 (Business Rules)
-- Quy ước: snake_case, tiền tệ USD (numeric(14,2)), thời gian timestamptz
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------- ENUMS ----------
create type transaction_type as enum
  ('receipt','deposit','pick_up','extra_deposit','po','return','exchange','transfer','repair');

create type transaction_status as enum
  ('moi','dat_coc','dang_order','cho_giao','hoan_tat','cancel','return','exchange');

create type payment_method as enum
  ('cash','bank_wire','zelle','check','card');

create type sales_kind as enum ('counter','online');

-- ---------- DANH MỤC (FR-CAT) ----------
create table companies (
  id   smallint generated always as identity primary key,
  code text not null unique,           -- PC49, Trans, HPLLC, 3NVY, Other, TDW
  name text not null,
  active boolean not null default true
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  ten   text not null,
  sdt   text,
  nguon text,                          -- nguồn mặc định (tham chiếu lookups group='source')
  note  text,
  created_at timestamptz not null default now()
);
create index on customers (sdt);

create table sales_people (
  id uuid primary key default gen_random_uuid(),
  ten  text not null,
  kind sales_kind not null default 'counter',
  active boolean not null default true
);

-- Danh mục dùng chung có thể tự thêm/sửa: source, account, bell_code, ...
create table lookups (
  id uuid primary key default gen_random_uuid(),
  grp   text not null,                 -- 'source' | 'account' | 'bell_code' | 'payment' ...
  code  text not null,
  label text not null,
  sort  int default 0,
  active boolean not null default true,
  unique (grp, code)
);

-- ---------- GIAO DỊCH / RC (bảng trung tâm) ----------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  ngay date not null,                              -- DATE
  company_id smallint not null references companies(id),
  type transaction_type not null,                 -- TYPE
  ma_sku text,                                     -- MÃ SKU
  dien_giai text,                                  -- DECRIPTION
  customer_id uuid references customers(id),       -- Cust. Name
  contact text,

  -- Tiền A/R nhập tay (EXPENSE + 4 hình thức)
  expense       numeric(14,2) not null default 0, -- EXPENSE/Purchase/Trade In (cho PO/Return)
  ar_cash       numeric(14,2) not null default 0,
  ar_bankwire   numeric(14,2) not null default 0,
  ar_zelle      numeric(14,2) not null default 0,
  ar_check      numeric(14,2) not null default 0,

  -- CONDITION (BR-01) — TỰ TÍNH, không nhập tay
  receipt   numeric(14,2) generated always as (
    case when type in ('receipt','pick_up','repair')
         then ar_cash + ar_bankwire + ar_zelle + ar_check else 0 end) stored,
  deposit   numeric(14,2) generated always as (
    case when type in ('deposit','extra_deposit')
         then ar_cash + ar_bankwire + ar_zelle + ar_check else 0 end) stored,
  return_po numeric(14,2) generated always as (
    case when type in ('po','return','exchange') then expense else 0 end) stored,
  -- TỔNG CỘNG (BR-02)
  tong_cong numeric(14,2) generated always as (
    (case when type in ('receipt','pick_up','repair') then ar_cash+ar_bankwire+ar_zelle+ar_check else 0 end)
  + (case when type in ('deposit','extra_deposit')     then ar_cash+ar_bankwire+ar_zelle+ar_check else 0 end)
  - (case when type in ('po','return','exchange')      then expense else 0 end)) stored,

  -- Thông tin JM (nhập bước 2)
  rc_jm_no text unique,                            -- 9000…=cọc, 1000…=bán/pickup (BR-05)
  so_no   text,                                    -- SO#
  appt_id text,                                    -- Root Appt ID
  source_1 text,
  source_2 text,
  transaction_value text,                          -- TRANSACTION VALUE
  pct_support numeric(5,2),                         -- % SUPPORT

  -- Liên kết cọc → pickup
  old_receipt_no text,                             -- OLD RECEIPT NUMBER (trỏ tới rc_jm_no đơn cọc)
  deposit_date date,                               -- DEPOSIT DATE (app điền từ đơn cọc liên kết)

  bell_code text,                                  -- RC1/RC2/RC3/SBO1
  trang_thai transaction_status not null default 'moi',
  note text,

  -- Thanh toán: đợt đầu (BR-06) — các đợt sau ở bảng payments
  tt_dau_ngay date,
  tt_dau_so_tien numeric(14,2),
  tt_dau_hinh_thuc payment_method,
  chu_thich_thanh_toan text,                       -- ghi nhanh các đợt sau (đồng bộ payments)

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create index on transactions (ngay);
create index on transactions (company_id, ngay);
create index on transactions (trang_thai);
create index on transactions (customer_id);
create index on transactions (old_receipt_no);
-- Cảnh báo "thiếu nguồn": source_1 null/rỗng và chưa hoàn tất (BR-03) → lọc ở app/view

-- ---------- DÒNG HÀNG (BR-07: nhiều dòng, gộp khi lưu) ----------
create table line_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  mo_ta text,                                      -- vd "Lab Diamond 3.04ct Radiant"
  sku text,
  gia_no text,                                     -- GIA# (kim cương)
  so_luong numeric(14,3),
  don_gia  numeric(14,2),
  thanh_tien numeric(14,2) generated always as (coalesce(so_luong,0)*coalesce(don_gia,0)) stored
);
create index on line_items (transaction_id);

-- ---------- THANH TOÁN (1 đơn nhiều đợt, BR-06) ----------
create table payments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  ngay date not null,
  so_tien numeric(14,2) not null,
  hinh_thuc payment_method,
  nguoi_xac_nhan text,                             -- "KThy confirmed OK"
  ghi_chu text,                                    -- khuyến mãi / refer-a-friend (BR-09)
  is_dau boolean not null default false,           -- đợt đầu?
  created_at timestamptz not null default now()
);
create index on payments (transaction_id);

-- ---------- SALES CHIA ĐƠN (BR: nhiều sales + %) ----------
create table transaction_sales (
  transaction_id uuid not null references transactions(id) on delete cascade,
  sale_id uuid not null references sales_people(id),
  vai_tro text,                                    -- '#1' | '#2' | '#3' | 'online#1'...
  ty_le_pct numeric(5,2),
  primary key (transaction_id, sale_id, vai_tro)
);

-- ---------- AUDIT LOG (FR-SEC-02) ----------
create table audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  action text not null,                            -- INSERT | UPDATE | DELETE
  changed_by uuid,
  changed_at timestamptz not null default now(),
  diff jsonb
);

create or replace function fn_audit() returns trigger language plpgsql as $$
begin
  insert into audit_log(table_name, record_id, action, changed_by, diff)
  values (tg_table_name,
          coalesce(new.id::text, old.id::text),
          tg_op,
          auth.uid(),
          case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end);
  return coalesce(new, old);
end$$;

create trigger trg_audit_tx     after insert or update or delete on transactions for each row execute function fn_audit();
create trigger trg_audit_pay    after insert or update or delete on payments     for each row execute function fn_audit();
create trigger trg_audit_line   after insert or update or delete on line_items   for each row execute function fn_audit();

-- updated_at tự cập nhật
create or replace function fn_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end$$;
create trigger trg_touch_tx before update on transactions for each row execute function fn_touch();

-- ---------- VIEW: tổng đã thu / còn thiếu ----------
create or replace view v_transaction_paid as
select t.id as transaction_id,
       t.tong_cong,
       coalesce(t.tt_dau_so_tien,0) + coalesce((select sum(p.so_tien) from payments p
                                                 where p.transaction_id=t.id and p.is_dau=false),0) as tong_da_thu,
       t.tong_cong - (coalesce(t.tt_dau_so_tien,0) + coalesce((select sum(p.so_tien) from payments p
                                                 where p.transaction_id=t.id and p.is_dau=false),0)) as con_thieu
from transactions t;

-- ---------- VIEW: RC thiếu nguồn (BR-03) ----------
create or replace view v_rc_thieu_nguon as
select * from transactions
where (source_1 is null or source_1 = '' or source_1 = 'Không có source')
  and trang_thai <> 'cancel';

-- ---------- RLS (GĐ1: 1 người dùng — cho authenticated full access) ----------
alter table transactions      enable row level security;
alter table line_items        enable row level security;
alter table payments          enable row level security;
alter table transaction_sales enable row level security;
alter table customers         enable row level security;
alter table sales_people      enable row level security;
alter table lookups           enable row level security;
alter table companies         enable row level security;

-- GĐ1: mọi người đã đăng nhập được toàn quyền (mở rộng phân quyền sau)
do $$
declare t text;
begin
  foreach t in array array['transactions','line_items','payments','transaction_sales',
                           'customers','sales_people','lookups','companies'] loop
    execute format('create policy %I_auth_all on %I for all to authenticated using (true) with check (true);', t, t);
  end loop;
end$$;
