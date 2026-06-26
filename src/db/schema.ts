import { pgTable, pgEnum, uuid, text, date, numeric, boolean, smallint, integer, timestamp, jsonb, bigserial, primaryKey, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ===== ENUMS (khớp BRD §16) =====
export const transactionType = pgEnum("transaction_type", [
  "receipt","deposit","pick_up","extra_deposit","po","return","exchange","transfer","cancel","memo","cash_report","ra_rp","repair",
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
  // REDESIGN: chuẩn hoá khách (P4)
  phoneRaw: text("phone_raw"),
  phoneNormalized: text("phone_normalized"),
  facebook: text("facebook"),
  defaultSourceId: text("default_source_id"),
  firstCompanyId: smallint("first_company_id"),
  status: text("status"),
  mergedIntoId: uuid("merged_into_id"),
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

// ============================================================
// REDESIGN (2026-06-26) — Module 1 (RC) + Module 2 (Cash/Bank) + master data.
// Bảng MỚI, song song với `transactions` cũ (migrate dần). Khớp migration-redesign-01-core.sql.
// ============================================================

// ----- Master data -----
export const sources = pgTable("sources", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  channel: text("channel"),
  active: boolean("active").notNull().default(true),
});

export const transactionTypes = pgTable("transaction_types", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  conditionBucket: text("condition_bucket").notNull().default("none"),
  moneyDirection: text("money_direction").notNull().default("none"),
  requiresSource: boolean("requires_source").notNull().default(false),
  requiresDeal: boolean("requires_deal").notNull().default(false),
  definition: text("definition"),
});

export const bellCodes = pgTable("bell_codes", {
  code: text("code").primaryKey(),
  scope: text("scope"),
  minValue: numeric("min_value", { precision: 14, scale: 2 }),
  maxValue: numeric("max_value", { precision: 14, scale: 2 }),
  fixedValue: numeric("fixed_value", { precision: 14, scale: 2 }),
  perDayLimit: integer("per_day_limit"),
  isTeam: boolean("is_team").notNull().default(false),
});

export const commissionTiers = pgTable("commission_tiers", {
  code: text("code").primaryKey(),
  position: integer("position").notNull(),
  pct: numeric("pct", { precision: 5, scale: 4 }).notNull(),
});

export const salespersonAliases = pgTable("salesperson_aliases", {
  id: uuid("id").primaryKey().defaultRandom(),
  salespersonId: uuid("salesperson_id").notNull().references(() => salesPeople.id, { onDelete: "cascade" }),
  alias: text("alias").notNull().unique(),
});

// ----- Module 1: RC tracking -----
export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: smallint("company_id").references(() => companies.id),
  customerId: uuid("customer_id").references(() => customers.id),
  openedDate: date("opened_date"),
  dealValue: numeric("deal_value", { precision: 14, scale: 2 }),
  status: text("status").notNull().default("open"),
  anchorEntryId: uuid("anchor_entry_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
});

export const rcEntries = pgTable("rc_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: smallint("company_id").notNull().references(() => companies.id),
  accountId: uuid("account_id"),
  dealId: uuid("deal_id").references(() => deals.id),
  entryDate: date("entry_date").notNull(),
  typeCode: text("type_code").notNull().references(() => transactionTypes.code),
  conditionBucket: text("condition_bucket"),       // set bởi trigger
  description: text("description"),
  customerId: uuid("customer_id").references(() => customers.id),
  contactRaw: text("contact_raw"),
  skuRaw: text("sku_raw"),
  bellCode: text("bell_code").references(() => bellCodes.code),
  expense: numeric("expense", { precision: 14, scale: 2 }).notNull().default("0"),
  arReceived: numeric("ar_received", { precision: 14, scale: 2 }).notNull().default("0"),
  // tiền theo từng hình thức nằm ở entry_payments; ar_total/ap_total do trigger cộng dồn
  arTotal: numeric("ar_total", { precision: 14, scale: 2 }).notNull().default("0"),
  apTotal: numeric("ap_total", { precision: 14, scale: 2 }).notNull().default("0"),
  receipt: numeric("receipt", { precision: 14, scale: 2 }).generatedAlwaysAs(
    sql`case when condition_bucket='receipt' then ar_total else 0 end`),
  deposit: numeric("deposit", { precision: 14, scale: 2 }).generatedAlwaysAs(
    sql`case when condition_bucket='deposit' then ar_total else 0 end`),
  returnPo: numeric("return_po", { precision: 14, scale: 2 }).generatedAlwaysAs(
    sql`case when condition_bucket='return_po' then expense else 0 end`),
  total: numeric("total", { precision: 14, scale: 2 }).generatedAlwaysAs(
    sql`(case when condition_bucket in ('receipt','deposit') then ar_total else 0 end) - (case when condition_bucket='return_po' then expense else 0 end)`),
  jmReceiptNo: text("jm_receipt_no"),
  jmKind: text("jm_kind").generatedAlwaysAs(
    sql`case when jm_receipt_no is null then null when upper(jm_receipt_no) like 'OC NHAP%' then 'oc_nhap' when jm_receipt_no like '9000%' or jm_receipt_no like '900%' then 'deposit' when jm_receipt_no like '1000%' then 'sale_pickup' else 'other' end`),
  source1Id: text("source_1_id").references(() => sources.code),
  source2Id: text("source_2_id").references(() => sources.code),
  transactionValue: text("transaction_value"),
  pctSupport: numeric("pct_support", { precision: 7, scale: 4 }),
  oldReceiptNo: text("old_receipt_no"),
  status: text("status"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
});

export const rcLineItems = pgTable("rc_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  rcEntryId: uuid("rc_entry_id").notNull().references(() => rcEntries.id, { onDelete: "cascade" }),
  lineNo: integer("line_no"),
  description: text("description"),
  sku: text("sku"),
  giaNo: text("gia_no"),
  productId: uuid("product_id"),
  goldTypeCode: text("gold_type_code"),
  qty: numeric("qty", { precision: 14, scale: 3 }),
  unit: text("unit"),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }),
  amount: numeric("amount", { precision: 14, scale: 2 }).generatedAlwaysAs(
    sql`coalesce(qty,0)*coalesce(unit_price,0)`),
});

export const entrySales = pgTable("entry_sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  rcEntryId: uuid("rc_entry_id").notNull().references(() => rcEntries.id, { onDelete: "cascade" }),
  salespersonId: uuid("salesperson_id").references(() => salesPeople.id),
  channel: text("channel").notNull(),
  position: smallint("position").notNull(),
  tierCode: text("tier_code").references(() => commissionTiers.code),
  pct: numeric("pct", { precision: 7, scale: 4 }),
}, (t) => ({ uq: unique().on(t.rcEntryId, t.channel, t.position) }));

// entry_payments — tiền theo TỪNG hình thức thanh toán (động). Tổng cộng dồn lên rc_entries.ar_total/ap_total qua trigger.
export const entryPayments = pgTable("entry_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  rcEntryId: uuid("rc_entry_id").notNull().references(() => rcEntries.id, { onDelete: "cascade" }),
  direction: text("direction").notNull(),     // ar | ap
  methodCode: text("method_code").notNull(),  // cash|bankwire|zelle|check|venmo|...
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
}, (t) => ({ uq: unique().on(t.rcEntryId, t.direction, t.methodCode) }));

// ----- Module 2: Cash & Bank -----
export const bankImportBatches = pgTable("bank_import_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  source: text("source").default("rocket"),
  fileName: text("file_name"),
  rowCount: integer("row_count"),
  importedBy: uuid("imported_by"),
  note: text("note"),
});

export const bankTransactions = pgTable("bank_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id"),
  companyId: smallint("company_id").references(() => companies.id),
  txnDate: date("txn_date"),
  originalDate: date("original_date"),
  description: text("description"),
  category: text("category"),
  payee: text("payee"),
  confNo: text("conf_no"),
  amountIn: numeric("amount_in", { precision: 14, scale: 2 }).notNull().default("0"),
  amountOut: numeric("amount_out", { precision: 14, scale: 2 }).notNull().default("0"),
  rawAccountNo: text("raw_account_no"),
  importBatchId: uuid("import_batch_id").references(() => bankImportBatches.id),
  reconciled: boolean("reconciled").notNull().default(false),
  matchedRcEntryId: uuid("matched_rc_entry_id").references(() => rcEntries.id),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accountDailyBalance = pgTable("account_daily_balance", {
  accountId: uuid("account_id").notNull(),
  balanceDate: date("balance_date").notNull(),
  beginning: numeric("beginning", { precision: 14, scale: 2 }).notNull().default("0"),
  ending: numeric("ending", { precision: 14, scale: 2 }).notNull().default("0"),
}, (t) => ({ pk: primaryKey({ columns: [t.accountId, t.balanceDate] }) }));

export const reconciliations = pgTable("reconciliations", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: smallint("company_id").references(() => companies.id),
  accountId: uuid("account_id"),
  reconDate: date("recon_date"),
  ktBalance: numeric("kt_balance", { precision: 14, scale: 2 }),
  usBalance: numeric("us_balance", { precision: 14, scale: 2 }),
  difference: numeric("difference", { precision: 14, scale: 2 }).generatedAlwaysAs(
    sql`coalesce(kt_balance,0)-coalesce(us_balance,0)`),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
});
