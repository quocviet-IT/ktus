import { pgTable, pgEnum, uuid, text, date, numeric, boolean, smallint, integer, timestamp, jsonb, bigserial, primaryKey, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ===== ENUMS (khớp BRD §16) =====
export const transactionType = pgEnum("transaction_type", [
  "receipt","deposit","pick_up","extra_deposit","po","return","exchange","transfer","repair",
]);
export const transactionStatus = pgEnum("transaction_status", [
  "moi","dat_coc","dang_order","cho_giao","hoan_tat","cancel","return","exchange",
]);
export const salesKind = pgEnum("sales_kind", ["counter","online"]);

// ===== DANH MỤC =====
export const companies = pgTable("companies", {
  id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  ten: text("ten").notNull(),
  sdt: text("sdt"),
  nguon: text("nguon"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salesPeople = pgTable("sales_people", {
  id: uuid("id").primaryKey().defaultRandom(),
  ten: text("ten").notNull(),
  kind: salesKind("kind").notNull().default("counter"),
  active: boolean("active").notNull().default(true),
});

export const lookups = pgTable("lookups", {
  id: uuid("id").primaryKey().defaultRandom(),
  grp: text("grp").notNull(),      // source | account | bell_code ...
  code: text("code").notNull(),
  label: text("label").notNull(),
  sort: integer("sort").default(0),
  active: boolean("active").notNull().default(true),
}, (t) => ({ uq: unique().on(t.grp, t.code) }));

// ===== GIAO DỊCH / RC =====
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  ngay: date("ngay").notNull(),                                   // DATE
  companyId: smallint("company_id").notNull().references(() => companies.id),
  type: transactionType("type").notNull(),                        // TYPE
  maSku: text("ma_sku"),                                          // MÃ SKU
  dienGiai: text("dien_giai"),                                    // DECRIPTION
  customerId: uuid("customer_id").references(() => customers.id), // Cust. Name
  contact: text("contact"),

  // Nhập tay (A/R)
  expense: numeric("expense", { precision: 14, scale: 2 }).notNull().default("0"),
  arCash: numeric("ar_cash", { precision: 14, scale: 2 }).notNull().default("0"),
  arBankwire: numeric("ar_bankwire", { precision: 14, scale: 2 }).notNull().default("0"),
  arZelle: numeric("ar_zelle", { precision: 14, scale: 2 }).notNull().default("0"),
  arCheck: numeric("ar_check", { precision: 14, scale: 2 }).notNull().default("0"),

  // CONDITION — TỰ TÍNH (BR-01/02)
  receipt: numeric("receipt", { precision: 14, scale: 2 }).generatedAlwaysAs(
    sql`case when type in ('receipt','pick_up','repair') then ar_cash+ar_bankwire+ar_zelle+ar_check else 0 end`),
  deposit: numeric("deposit", { precision: 14, scale: 2 }).generatedAlwaysAs(
    sql`case when type in ('deposit','extra_deposit') then ar_cash+ar_bankwire+ar_zelle+ar_check else 0 end`),
  returnPo: numeric("return_po", { precision: 14, scale: 2 }).generatedAlwaysAs(
    sql`case when type in ('po','return','exchange') then expense else 0 end`),
  tongCong: numeric("tong_cong", { precision: 14, scale: 2 }).generatedAlwaysAs(
    sql`(case when type in ('receipt','pick_up','repair') then ar_cash+ar_bankwire+ar_zelle+ar_check else 0 end)
       +(case when type in ('deposit','extra_deposit') then ar_cash+ar_bankwire+ar_zelle+ar_check else 0 end)
       -(case when type in ('po','return','exchange') then expense else 0 end)`),

  // JM (nhập bước 2)
  rcJmNo: text("rc_jm_no").unique(),       // 9000=cọc, 1000=bán/pickup (BR-05)
  soNo: text("so_no"),
  apptId: text("appt_id"),
  source1: text("source_1"),
  source2: text("source_2"),
  transactionValue: text("transaction_value"),
  pctSupport: numeric("pct_support", { precision: 5, scale: 2 }),

  oldReceiptNo: text("old_receipt_no"),    // pickup → cọc
  depositDate: date("deposit_date"),
  bellCode: text("bell_code"),             // RC1/RC2/RC3/SBO1
  trangThai: transactionStatus("trang_thai").notNull().default("moi"),
  note: text("note"),

  // Thanh toán đợt đầu (BR-06)
  ttDauNgay: date("tt_dau_ngay"),
  ttDauSoTien: numeric("tt_dau_so_tien", { precision: 14, scale: 2 }),
  ttDauHinhThuc: text("tt_dau_hinh_thuc"),
  chuThichThanhToan: text("chu_thich_thanh_toan"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
});

export const lineItems = pgTable("line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  moTa: text("mo_ta"),
  sku: text("sku"),
  giaNo: text("gia_no"),                                          // GIA#
  soLuong: numeric("so_luong", { precision: 14, scale: 3 }),
  donGia: numeric("don_gia", { precision: 14, scale: 2 }),
  thanhTien: numeric("thanh_tien", { precision: 14, scale: 2 }).generatedAlwaysAs(
    sql`coalesce(so_luong,0)*coalesce(don_gia,0)`),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  ngay: date("ngay").notNull(),
  soTien: numeric("so_tien", { precision: 14, scale: 2 }).notNull(),
  hinhThuc: text("hinh_thuc"),
  direction: text("direction").notNull().default("ar"),
  nguoiXacNhan: text("nguoi_xac_nhan"),
  ghiChu: text("ghi_chu"),
  isDau: boolean("is_dau").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactionSales = pgTable("transaction_sales", {
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  saleId: uuid("sale_id").notNull().references(() => salesPeople.id),
  vaiTro: text("vai_tro"),
  tyLePct: numeric("ty_le_pct", { precision: 5, scale: 2 }),
}, (t) => ({ pk: primaryKey({ columns: [t.transactionId, t.saleId, t.vaiTro] }) }));

export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  action: text("action").notNull(),
  changedBy: uuid("changed_by"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  diff: jsonb("diff"),
});
