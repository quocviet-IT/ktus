-- ============================================================
-- KTUS REDESIGN — Bước 2: Schema lõi (Module 1 RC + Module 2 Cash/Bank + master data)
-- Theo design doc 2026-06-26. AN TOÀN: chỉ TẠO bảng mới + THÊM cột (không xoá bảng cũ
-- `transactions`/`accounts` đang chạy). Idempotent — chạy lại nhiều lần được.
-- Chạy 1 lần trong Supabase SQL Editor.
-- ============================================================
create extension if not exists pgcrypto;

-- ---------- TỰ NÂNG CẤP (nếu đã chạy bản CŨ có 4 cột ar_cash…) ----------
-- rc_entries bản cũ thiếu cột ar_total → drop các bảng redesign (đang rỗng) để tạo lại đúng cấu trúc.
-- KHÔNG đụng tới `transactions`/`accounts` cũ.
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'rc_entries')
     and not exists (select 1 from information_schema.columns
                     where table_name = 'rc_entries' and column_name = 'ar_total') then
    drop table if exists rc_entries cascade;   -- cascade xoá luôn entry_payments/entry_sales/rc_line_items
    drop table if exists deals cascade;
  end if;
end $$;

-- ---------- SHARED MASTER ----------

-- companies (đã có) — đảm bảo seed đủ 6 công ty
insert into companies (code, name) values
  ('Trans','Trans Fine Jewelry'), ('PC49','Pacific Four Nine'),
  ('TDW','TDW'), ('HPLLC','HP LLC'), ('3NVY','3NVY'), ('Other','Other')
on conflict (code) do nothing;

-- sources — mã nguồn khách (BR-SOURCE)
create table if not exists sources (
  code     text primary key,
  label    text not null,
  channel  text,                 -- online | in_store | marketing
  active   boolean not null default true
);
insert into sources (code, label, channel) values
  ('WI','Walk-in','in_store'), ('APPT','Appointment','in_store'),
  ('FB','Facebook','online'),  ('TEL','Telephone','in_store'),
  ('RF','Refer','marketing'),  ('RC','Return customer','in_store'),
  ('VIP','VIP','in_store'),    ('SOB','SOB','marketing'),
  ('ONLINE1','Online','online'), ('EBAY','eBay','online'),
  ('NONE','(không có source)',null)
on conflict (code) do nothing;

-- transaction_types — điều khiển CONDITION + hướng tiền (BR-01)
create table if not exists transaction_types (
  code             text primary key,
  label            text not null,
  condition_bucket text not null default 'none',  -- receipt | deposit | return_po | none
  money_direction  text not null default 'none',  -- in | out | none
  requires_source  boolean not null default false,
  requires_deal    boolean not null default false,
  definition       text
);
insert into transaction_types (code,label,condition_bucket,money_direction,requires_source,requires_deal) values
  ('deposit','Deposit','deposit','in',true,true),
  ('extra_deposit','Extra deposit','deposit','in',false,true),
  ('pick_up','Pick up','receipt','in',true,true),
  ('receipt','Receipt','receipt','in',true,false),
  ('exchange','Exchange','return_po','none',false,true),
  ('trade_in','Trade in','return_po','out',false,false),
  ('up_grade','Up grade','receipt','in',false,true),
  ('return','Return','return_po','out',false,true),
  ('cancel','Cancel','none','none',false,true),
  ('memo','Memo (ký gửi)','none','none',false,false),
  ('po','PO / Purchase','return_po','out',false,false),
  ('ra_rp','Ra RP (Grain→VRP)','none','none',false,false),
  ('transfer','Transfer','none','none',false,false),
  ('cash_report','Cash report','none','none',false,false),
  ('store_credit','Store credit','none','none',false,false),
  ('repair','Repair','receipt','in',false,false)
on conflict (code) do nothing;

-- bell_codes — ngưỡng rung chuông (BR-BELL)
create table if not exists bell_codes (
  code          text primary key,
  scope         text,            -- in_store | online_in | online_out
  min_value     numeric(14,2),
  max_value     numeric(14,2),
  fixed_value   numeric(14,2),
  per_day_limit int,
  is_team       boolean not null default false
);
insert into bell_codes (code,scope,min_value,max_value,fixed_value,per_day_limit,is_team) values
  ('RC1','in_store',null,null,5000,1,false),
  ('RC2','in_store',null,null,10000,1,false),
  ('RC3','in_store',null,null,50000,1,true),
  ('SBS1','online_in',1000,9999,null,null,false),
  ('SBS2','online_in',10000,19999,null,null,false),
  ('SBS3','online_in',20000,29999,null,null,false),
  ('SBS4','online_in',30000,49999,null,null,false),
  ('SBS5','online_in',50000,null,null,null,false),
  ('SBO1','online_out',1000,9999,null,null,false),
  ('SBO2','online_out',10000,19999,null,null,false),
  ('SBO3','online_out',20000,29999,null,null,false),
  ('SBO4','online_out',30000,49999,null,null,false),
  ('SBO5','online_out',50000,null,null,null,false)
on conflict (code) do nothing;

-- commission_tiers — Mức hoa hồng
create table if not exists commission_tiers (
  code     text primary key,
  position int not null,
  pct      numeric(5,4) not null
);
insert into commission_tiers (code,position,pct) values
  ('A1',1,1.0),
  ('B1',1,0.8),('B2',2,0.2),
  ('C1',1,0.7),('C2',2,0.3),
  ('D1',1,0.6),('D2',2,0.2),('D3',3,0.2),
  ('E1',1,0.5),('E2',2,0.25),('E3',3,0.25)
on conflict (code) do nothing;

-- salesperson_aliases — gom tên PC49 (viết tắt) ↔ Trans (đầy đủ)
create table if not exists salesperson_aliases (
  id             uuid primary key default gen_random_uuid(),
  salesperson_id uuid not null references sales_people(id) on delete cascade,
  alias          text not null unique
);

-- customers — bổ sung cột chuẩn hoá (P4), giữ nguyên cột cũ
alter table customers add column if not exists phone_raw         text;
alter table customers add column if not exists phone_normalized  text;
alter table customers add column if not exists facebook          text;
alter table customers add column if not exists default_source_id text references sources(code);
alter table customers add column if not exists first_company_id  smallint references companies(id);
alter table customers add column if not exists status            text;
alter table customers add column if not exists merged_into_id    uuid references customers(id);
create unique index if not exists uq_customers_phone on customers (phone_normalized) where phone_normalized is not null;

-- lookups: bổ sung nhóm payment_method + bank_category
insert into lookups (grp, code, label, sort) values
  ('payment_method','cash','Cash',1), ('payment_method','bankwire','Bank wire',2),
  ('payment_method','zelle','Zelle',3), ('payment_method','check','Check',4),
  ('payment_method','received','Received (cọc đã thu)',5), ('payment_method','card','Card',6),
  ('bank_category','bankcard','Bankcard deposit',1), ('bank_category','ach','ACH',2),
  ('bank_category','check','Check',3), ('bank_category','bankwire','Bank wire',4), ('bank_category','fee','Fee',5)
on conflict (grp, code) do nothing;

-- ---------- MODULE 1 — RC TRACKING ----------

-- deals — gom giao dịch nhiều bước (cọc → … → pickup)
create table if not exists deals (
  id              uuid primary key default gen_random_uuid(),
  company_id      smallint references companies(id),
  customer_id     uuid references customers(id),
  opened_date     date,                                   -- = ngày cọc gốc (thay DEPOSIT DATE #REF!)
  deal_value      numeric(14,2),
  status          text not null default 'open',           -- open|collecting|ready|completed|cancelled|returned
  anchor_entry_id uuid,                                    -- FK thêm sau khi có rc_entries
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid,
  updated_by      uuid
);

-- rc_entries — fact nguyên tử (1 dòng USBC101 / RC-JM)
create table if not exists rc_entries (
  id              uuid primary key default gen_random_uuid(),
  company_id      smallint not null references companies(id),
  account_id      uuid,                                    -- "Company account" (FK accounts nối ở bước sau)
  deal_id         uuid references deals(id),
  entry_date      date not null,                           -- ngày gốc — KHÔNG tự đổi (BR-10)
  type_code       text not null references transaction_types(code),
  condition_bucket text,                                   -- auto theo type (trigger) → dùng cho cột generated
  description     text,
  customer_id     uuid references customers(id),
  contact_raw     text,
  sku_raw         text,
  bell_code       text references bell_codes(code),
  -- tiền: hình thức TT ĐỘNG → chi tiết nằm ở bảng con entry_payments.
  -- ar_total/ap_total do trigger cộng dồn để cột CONDITION vẫn generated được.
  expense     numeric(14,2) not null default 0,
  ar_received numeric(14,2) not null default 0,            -- cọc trước áp vào lúc pickup (memo)
  ar_total    numeric(14,2) not null default 0,            -- = Σ entry_payments(direction='ar')
  ap_total    numeric(14,2) not null default 0,            -- = Σ entry_payments(direction='ap')
  -- CONDITION generated (BR-01/02) — chỉ tham chiếu cột cùng dòng
  receipt   numeric(14,2) generated always as (
    case when condition_bucket='receipt' then ar_total else 0 end) stored,
  deposit   numeric(14,2) generated always as (
    case when condition_bucket='deposit' then ar_total else 0 end) stored,
  return_po numeric(14,2) generated always as (
    case when condition_bucket='return_po' then expense else 0 end) stored,
  total     numeric(14,2) generated always as (
    (case when condition_bucket in ('receipt','deposit') then ar_total else 0 end)
    - (case when condition_bucket='return_po' then expense else 0 end)) stored,
  -- JM bước 2
  jm_receipt_no     text,
  jm_kind           text generated always as (
    case
      when jm_receipt_no is null then null
      when upper(jm_receipt_no) like 'OC NHAP%' then 'oc_nhap'
      when jm_receipt_no like '9000%' or jm_receipt_no like '900%' then 'deposit'
      when jm_receipt_no like '1000%' then 'sale_pickup'
      else 'other' end) stored,
  source1_id        text references sources(code),
  source2_id        text references sources(code),
  transaction_value text,
  pct_support       numeric(7,4),                          -- chứa cả 0.8 lẫn 80/100 (dữ liệu cũ)
  old_receipt_no    text,
  note              text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid
);

-- nối FK vòng deals.anchor_entry_id → rc_entries.id (sau khi cả 2 đã có)
do $$ begin
  if not exists (select 1 from information_schema.table_constraints
                 where constraint_name='deals_anchor_entry_fk') then
    alter table deals add constraint deals_anchor_entry_fk
      foreign key (anchor_entry_id) references rc_entries(id);
  end if;
end $$;

-- trigger: tự set condition_bucket từ transaction_types
create or replace function fn_rc_set_bucket() returns trigger as $$
begin
  select condition_bucket into new.condition_bucket
  from transaction_types where code = new.type_code;
  new.updated_at := now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_rc_set_bucket on rc_entries;
create trigger trg_rc_set_bucket before insert or update on rc_entries
  for each row execute function fn_rc_set_bucket();

create index if not exists idx_rc_company_date on rc_entries (company_id, entry_date);
create index if not exists idx_rc_date         on rc_entries (entry_date);
create index if not exists idx_rc_deal         on rc_entries (deal_id);
create index if not exists idx_rc_customer     on rc_entries (customer_id);
create index if not exists idx_rc_jm           on rc_entries (jm_receipt_no);
create index if not exists idx_rc_type         on rc_entries (type_code);
create index if not exists idx_rc_missing_src  on rc_entries (company_id, entry_date)
  where source1_id is null;

-- rc_line_items — 1 RC nhiều sản phẩm (tách riêng bảng line_items cũ của transactions)
create table if not exists rc_line_items (
  id           uuid primary key default gen_random_uuid(),
  rc_entry_id  uuid not null references rc_entries(id) on delete cascade,
  line_no      int,
  description  text,
  sku          text,
  gia_no       text,
  product_id      uuid,                                    -- Module 3 (nullable)
  gold_type_code  text,                                    -- Module 3 (nullable)
  qty          numeric(14,3),
  unit         text,
  unit_price   numeric(14,2),
  amount       numeric(14,2) generated always as (coalesce(qty,0)*coalesce(unit_price,0)) stored
);
create index if not exists idx_rcli_entry on rc_line_items (rc_entry_id);

-- entry_sales — chia hoa hồng (counter + online)
create table if not exists entry_sales (
  id             uuid primary key default gen_random_uuid(),
  rc_entry_id    uuid not null references rc_entries(id) on delete cascade,
  salesperson_id uuid references sales_people(id),
  channel        text not null,                            -- counter | online
  position       smallint not null,                        -- 1 | 2 | 3
  tier_code      text references commission_tiers(code),
  pct            numeric(7,4),                             -- tỷ lệ phân bổ (chứa 80/20 hoặc 0.8/0.2)
  unique (rc_entry_id, channel, position)
);
create index if not exists idx_es_entry on entry_sales (rc_entry_id);
create index if not exists idx_es_person on entry_sales (salesperson_id);

-- entry_payments — số tiền theo TỪNG hình thức thanh toán (ĐỘNG)
-- Thêm hình thức mới ở Danh mục (lookups grp='payment_method') → tự dùng được ở Nhập RC + báo cáo.
create table if not exists entry_payments (
  id          uuid primary key default gen_random_uuid(),
  rc_entry_id uuid not null references rc_entries(id) on delete cascade,
  direction   text not null,                  -- ar (thu vào) | ap (chi ra)
  method_code text not null,                  -- cash|bankwire|zelle|check|venmo|... (theo lookups)
  amount      numeric(14,2) not null default 0,
  unique (rc_entry_id, direction, method_code)
);
create index if not exists idx_ep_entry on entry_payments (rc_entry_id);

-- trigger: cộng dồn ar_total/ap_total lên rc_entries mỗi khi entry_payments đổi
create or replace function fn_ep_rollup() returns trigger as $$
declare _eid uuid;
begin
  _eid := coalesce(new.rc_entry_id, old.rc_entry_id);
  update rc_entries set
    ar_total = coalesce((select sum(amount) from entry_payments where rc_entry_id=_eid and direction='ar'),0),
    ap_total = coalesce((select sum(amount) from entry_payments where rc_entry_id=_eid and direction='ap'),0)
  where id = _eid;
  return null;
end $$ language plpgsql;

drop trigger if exists trg_ep_rollup on entry_payments;
create trigger trg_ep_rollup after insert or update or delete on entry_payments
  for each row execute function fn_ep_rollup();

-- ---------- MODULE 2 — CASH & BANK ----------

create table if not exists bank_import_batches (
  id          uuid primary key default gen_random_uuid(),
  imported_at timestamptz not null default now(),
  source      text default 'rocket',
  file_name   text,
  row_count   int,
  imported_by uuid,
  note        text
);

create table if not exists bank_transactions (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid,                                -- nối FK accounts ở bước Module 2
  company_id          smallint references companies(id),
  txn_date            date,
  original_date       date,
  description         text,
  category            text,
  payee               text,
  conf_no             text,
  amount_in           numeric(14,2) not null default 0,
  amount_out          numeric(14,2) not null default 0,
  raw_account_no      text,
  import_batch_id     uuid references bank_import_batches(id),
  reconciled          boolean not null default false,
  matched_rc_entry_id uuid references rc_entries(id),
  note                text,
  created_at          timestamptz not null default now()
);
create index if not exists idx_bank_company_date on bank_transactions (company_id, txn_date);
create index if not exists idx_bank_batch on bank_transactions (import_batch_id);

create table if not exists account_daily_balance (
  account_id   uuid not null,
  balance_date date not null,
  beginning    numeric(14,2) not null default 0,
  ending       numeric(14,2) not null default 0,
  primary key (account_id, balance_date)
);

create table if not exists reconciliations (
  id          uuid primary key default gen_random_uuid(),
  company_id  smallint references companies(id),
  account_id  uuid,
  recon_date  date,
  kt_balance  numeric(14,2),
  us_balance  numeric(14,2),
  difference  numeric(14,2) generated always as (coalesce(kt_balance,0)-coalesce(us_balance,0)) stored,
  reason      text,
  status      text not null default 'pending',             -- matched | pending | explained
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid
);

-- ---------- RLS (mở cho anon — giai đoạn 1 đơn người dùng) ----------
do $$
declare t text;
begin
  foreach t in array array[
    'sources','transaction_types','bell_codes','commission_tiers','salesperson_aliases',
    'deals','rc_entries','rc_line_items','entry_sales','entry_payments',
    'bank_import_batches','bank_transactions','account_daily_balance','reconciliations'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists p_all on %I', t);
    execute format('create policy p_all on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- Kiểm chứng:
-- select code,label,condition_bucket,requires_deal from transaction_types order by code;
-- select count(*) from rc_entries;
