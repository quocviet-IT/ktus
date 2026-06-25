import { sb } from "./supabase-server";
import type { Account, BankLine, CompanyCode, Transaction, TransactionSale, TxStatus, LineItem, Payment } from "./types";

const N = (v: any) => (v == null ? 0 : Number(v));
const PAGE_SIZE = 1000;
const IN_BATCH_SIZE = 100;
const WARNED = new Set<string>();

type TxEnrichment = {
  companies: Map<number, { code: string; name: string }>;
  customers: Map<string, { ten: string; sdt?: string }>;
  accounts: Map<string, { name: string; accountType?: string }>;
  lookups: Map<string, { code: string; label: string; grp: string }>;
  salesByTx: Map<string, TransactionSale[]>;
};

function companyCode(value: any): CompanyCode {
  const raw = String(value || "").trim();
  const up = raw.toUpperCase();
  if (up === "TRANS" || up === "TFJ" || up === "TRANS / TFJ" || up === "TRANS/TFJ") return "Trans";
  if (up === "OTHER") return "Other";
  if (up === "PC49" || up === "TDW" || up === "HPLLC" || up === "3NVY") return up as CompanyCode;
  return (raw || "Other") as CompanyCode;
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function warnOnce(key: string, message: string, error: unknown) {
  const detail = (error as any)?.message || "";
  if (detail.includes("schema cache") || detail.includes("Could not find the table")) return;
  if (WARNED.has(key)) return;
  WARNED.add(key);
  console.warn(message, detail);
}

async function loadTxEnrichment(rows: any[]): Promise<TxEnrichment> {
  const out: TxEnrichment = {
    companies: new Map(),
    customers: new Map(),
    accounts: new Map(),
    lookups: new Map(),
    salesByTx: new Map(),
  };
  if (!rows.length) return out;

  const s = sb();
  const companyIds = [...new Set(rows.map((r) => r.company_id).filter((v) => v != null).map(Number))];
  const customerIds = [...new Set(rows.map((r) => r.customer_id).filter(Boolean))];
  const accountIds = [...new Set(rows.map((r) => r.account_id).filter(Boolean))];
  const lookupIds = [...new Set(rows.flatMap((r) => [r.source1_lookup_id, r.source2_lookup_id, r.bell_code_lookup_id]).filter(Boolean))];
  const txIds = rows.map((r) => r.id).filter(Boolean);

  await Promise.all([
    (async () => {
      if (!companyIds.length) return;
      try {
        const { data, error } = await s.from("companies").select("id, code, name").in("id", companyIds);
        if (error) throw error;
        for (const r of data ?? []) out.companies.set(Number(r.id), { code: r.code, name: r.name });
      } catch (e) {
        warnOnce("rel-companies", "[relationships] không enrich được companies —", e);
      }
    })(),
    (async () => {
      if (!customerIds.length) return;
      try {
        for (const batch of chunks(customerIds, IN_BATCH_SIZE)) {
          const { data, error } = await s.from("customers").select("id, ten, sdt").in("id", batch);
          if (error) throw error;
          for (const r of data ?? []) out.customers.set(r.id, { ten: r.ten, sdt: r.sdt ?? undefined });
        }
      } catch (e) {
        warnOnce("rel-customers", "[relationships] không enrich được customers —", e);
      }
    })(),
    (async () => {
      if (!accountIds.length) return;
      try {
        for (const batch of chunks(accountIds, IN_BATCH_SIZE)) {
          const { data, error } = await s.from("accounts").select("id, name, account_type").in("id", batch);
          if (error) throw error;
          for (const r of data ?? []) out.accounts.set(r.id, { name: r.name, accountType: r.account_type ?? undefined });
        }
      } catch (e) {
        warnOnce("rel-accounts", "[relationships] không enrich được accounts —", e);
      }
    })(),
    (async () => {
      if (!lookupIds.length) return;
      try {
        for (const batch of chunks(lookupIds, IN_BATCH_SIZE)) {
          const { data, error } = await s.from("lookups").select("id, grp, code, label").in("id", batch);
          if (error) throw error;
          for (const r of data ?? []) out.lookups.set(r.id, { grp: r.grp, code: r.code, label: r.label });
        }
      } catch (e) {
        warnOnce("rel-lookups", "[relationships] không enrich được lookups —", e);
      }
    })(),
    (async () => {
      if (!txIds.length) return;
      try {
        for (const batch of chunks(txIds, IN_BATCH_SIZE)) {
          const { data, error } = await s
            .from("transaction_sales")
            .select("transaction_id, sale_id, vai_tro, ty_le_pct, sales_people(ten, kind)")
            .in("transaction_id", batch);
          if (error) throw error;
          for (const r of data ?? []) {
            const person = Array.isArray(r.sales_people) ? r.sales_people[0] : r.sales_people;
            const item: TransactionSale = {
              saleId: r.sale_id,
              ten: person?.ten ?? "",
              kind: person?.kind ?? undefined,
              vaiTro: r.vai_tro ?? undefined,
              tyLePct: r.ty_le_pct != null ? N(r.ty_le_pct) : undefined,
            };
            if (!item.ten) continue;
            out.salesByTx.set(r.transaction_id, [...(out.salesByTx.get(r.transaction_id) ?? []), item]);
          }
        }
      } catch (e) {
        warnOnce("rel-transaction-sales", "[relationships] không enrich được transaction_sales —", e);
      }
    })(),
  ]);

  return out;
}

function rowToTx(r: any, rel?: TxEnrichment): Transaction {
  const company = r.company_id != null ? rel?.companies.get(Number(r.company_id)) : undefined;
  const customer = r.customer_id ? rel?.customers.get(r.customer_id) : undefined;
  const account = r.account_id ? rel?.accounts.get(r.account_id) : undefined;
  const source1 = r.source1_lookup_id ? rel?.lookups.get(r.source1_lookup_id) : undefined;
  const source2 = r.source2_lookup_id ? rel?.lookups.get(r.source2_lookup_id) : undefined;
  const bell = r.bell_code_lookup_id ? rel?.lookups.get(r.bell_code_lookup_id) : undefined;
  const sales = rel?.salesByTx.get(r.id) ?? [];
  const counterSale = sales.find((s) => !String(s.kind || "").toLowerCase().includes("online") && !String(s.vaiTro || "").toLowerCase().includes("online"));
  const onlineSale = sales.find((s) => String(s.kind || "").toLowerCase().includes("online") || String(s.vaiTro || "").toLowerCase().includes("online"));

  return {
    id: r.id, ngay: r.ngay, company: companyCode(company?.code ?? r.company), type: r.type,
    maSku: r.ma_sku ?? undefined, dienGiai: r.dien_giai ?? "", khach: customer?.ten ?? r.khach, contact: r.contact ?? customer?.sdt ?? undefined,
    companyAccount: r.company_account ?? undefined,
    expense: N(r.expense), arCash: N(r.ar_cash), arBankwire: N(r.ar_bankwire), arZelle: N(r.ar_zelle), arCheck: N(r.ar_check),
    apCash: N(r.ap_cash), apBankwire: N(r.ap_bankwire), apZelle: N(r.ap_zelle), apCheck: N(r.ap_check),
    rcJmNo: r.rc_jm_no ?? undefined, soNo: r.so_no ?? undefined, apptId: r.appt_id ?? undefined,
    source1: source1?.label ?? r.source_1 ?? "", source2: source2?.label ?? r.source_2 ?? undefined,
    sale1: counterSale?.ten ?? r.sale_1 ?? undefined, saleOnline: onlineSale?.ten ?? r.sale_online ?? undefined,
    sale2: r.sale_2 ?? undefined, sale3: r.sale_3 ?? undefined,
    sale1Pct: r.sale_1_pct != null ? N(r.sale_1_pct) : undefined,
    sale2Pct: r.sale_2_pct != null ? N(r.sale_2_pct) : undefined,
    sale3Pct: r.sale_3_pct != null ? N(r.sale_3_pct) : undefined,
    saleOnline2: r.sale_online_2 ?? undefined, saleOnline3: r.sale_online_3 ?? undefined,
    transactionValue: r.transaction_value ?? undefined,
    pctSupport: r.pct_support != null ? N(r.pct_support) : (onlineSale?.tyLePct ?? undefined),
    orderTotal: r.order_total != null ? N(r.order_total) : undefined,
    createdAt: r.created_at ?? undefined,
    oldReceiptNo: r.old_receipt_no ?? undefined, depositDate: r.deposit_date ?? undefined,
    bellCode: bell?.code ?? r.bell_code ?? undefined, trangThai: r.trang_thai as TxStatus, note: r.note ?? undefined,
    companyId: r.company_id ?? undefined, companyName: company?.name,
    customerId: r.customer_id ?? undefined,
    accountId: r.account_id ?? undefined, accountName: account?.name, accountType: account?.accountType,
    parentId: r.parent_id ?? undefined,
    source1LookupId: r.source1_lookup_id ?? undefined, source2LookupId: r.source2_lookup_id ?? undefined,
    bellCodeLookupId: r.bell_code_lookup_id ?? undefined,
    source1Label: source1?.label, source2Label: source2?.label, bellCodeLabel: bell?.label,
    sales: sales.length ? sales : undefined,
    lineItems: (r.line_items ?? []).map((l: any): LineItem => ({
      id: l.id, moTa: l.mo_ta ?? "", sku: l.sku ?? undefined, giaNo: l.gia_no ?? undefined,
      soLuong: N(l.so_luong), donGia: N(l.don_gia),
    })),
    payments: (r.payments ?? []).map((p: any): Payment => ({
      id: p.id, ngay: p.ngay, soTien: N(p.so_tien), hinhThuc: p.hinh_thuc ?? undefined,
      nguoiXacNhan: p.nguoi_xac_nhan ?? undefined, ghiChu: p.ghi_chu ?? undefined, isDau: p.is_dau ?? false,
      accountId: p.account_id ?? undefined,
    })),
  };
}

// Sổ/báo cáo: KHÔNG join line_items/payments (chỉ trang chi tiết cần) → tải nhanh hơn nhiều.
const LIST_SELECT = "*";
const DETAIL_SELECT = "*, line_items(*), payments(*)";

export async function listTransactions(opts?: { company?: string; status?: string; q?: string; from?: string; to?: string }): Promise<Transaction[]> {
  const rows: any[] = [];
  let from = 0;

  while (true) {
    let query: any = sb().from("transactions").select(LIST_SELECT).order("ngay", { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (opts?.company && opts.company !== "all") query = query.eq("company", opts.company);
    if (opts?.status && opts.status !== "all") query = query.eq("trang_thai", opts.status);
    if (opts?.from) query = query.gte("ngay", opts.from);
    if (opts?.to) query = query.lte("ngay", opts.to);
    if (opts?.q) query = query.or(`rc_jm_no.ilike.%${opts.q}%,khach.ilike.%${opts.q}%,dien_giai.ilike.%${opts.q}%`);
    const { data, error } = await query;
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // Hiển thị sổ dùng cột phẳng (source/sale/khach…) → bỏ enrichment cho nhanh.
  // rowToTx tự fallback về cột phẳng khi không có rel.
  return rows.map((row) => rowToTx(row));
}

// Phân trang TẠI SERVER (chỉ kéo 1 trang) — dùng cho sổ chỉ phân trang, không tổng hợp toàn kỳ
export async function listTransactionsPaged(
  opts: { company?: string; status?: string; q?: string; from?: string; to?: string },
  page: number, pageSize: number,
): Promise<{ rows: Transaction[]; total: number }> {
  const fromIdx = (Math.max(1, page) - 1) * pageSize;
  let query: any = sb().from("transactions").select(LIST_SELECT, { count: "exact" })
    .order("ngay", { ascending: false }).range(fromIdx, fromIdx + pageSize - 1);
  if (opts.company && opts.company !== "all") query = query.eq("company", opts.company);
  if (opts.status && opts.status !== "all") query = query.eq("trang_thai", opts.status);
  if (opts.from) query = query.gte("ngay", opts.from);
  if (opts.to) query = query.lte("ngay", opts.to);
  if (opts.q) query = query.or(`rc_jm_no.ilike.%${opts.q}%,khach.ilike.%${opts.q}%,dien_giai.ilike.%${opts.q}%`);
  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []).map((r: any) => rowToTx(r)), total: count ?? 0 };
}

export interface ExcelWorkbook {
  id: string;
  fileName: string;
  relativePath?: string;
  fileSizeBytes: number;
  modifiedAt?: string;
  sheets: ExcelSheet[];
}

export interface ExcelSheet {
  id: string;
  workbookId: string;
  sheetName: string;
  sheetIndex: number;
  maxRow: number;
  maxColumn: number;
  nonEmptyRows: number;
}

export interface ExcelRow {
  id: string;
  workbookId: string;
  sheetId: string;
  rowIndex: number;
  cells: unknown[];
  rowText?: string;
}

export async function listExcelWorkbooks(): Promise<ExcelWorkbook[]> {
  const s = sb();
  const [{ data: workbooks, error: workbookError }, { data: sheets, error: sheetError }] = await Promise.all([
    s.from("excel_workbooks").select("*").order("file_name", { ascending: true }),
    s.from("excel_sheets").select("*").order("sheet_index", { ascending: true }),
  ]);
  if (workbookError) throw workbookError;
  if (sheetError) throw sheetError;

  const sheetsByWorkbook = new Map<string, ExcelSheet[]>();
  for (const sheet of sheets ?? []) {
    const mapped: ExcelSheet = {
      id: sheet.id,
      workbookId: sheet.workbook_id,
      sheetName: sheet.sheet_name,
      sheetIndex: N(sheet.sheet_index),
      maxRow: N(sheet.max_row),
      maxColumn: N(sheet.max_column),
      nonEmptyRows: N(sheet.non_empty_rows),
    };
    sheetsByWorkbook.set(mapped.workbookId, [...(sheetsByWorkbook.get(mapped.workbookId) ?? []), mapped]);
  }

  return (workbooks ?? []).map((workbook: any) => ({
    id: workbook.id,
    fileName: workbook.file_name,
    relativePath: workbook.relative_path ?? undefined,
    fileSizeBytes: N(workbook.file_size_bytes),
    modifiedAt: workbook.modified_at ?? undefined,
    sheets: sheetsByWorkbook.get(workbook.id) ?? [],
  }));
}

export async function listExcelRows(opts?: { workbookId?: string; sheetId?: string; q?: string; page?: number; pageSize?: number }): Promise<{ rows: ExcelRow[]; count: number }> {
  const pageSize = opts?.pageSize ?? 100;
  const page = Math.max(1, opts?.page ?? 1);
  const from = (page - 1) * pageSize;
  let query = sb()
    .from("excel_rows")
    .select("id, workbook_id, sheet_id, row_index, cells, row_text", { count: "exact" })
    .order("row_index", { ascending: true })
    .range(from, from + pageSize - 1);

  if (opts?.sheetId) query = query.eq("sheet_id", opts.sheetId);
  else if (opts?.workbookId) query = query.eq("workbook_id", opts.workbookId);
  if (opts?.q) query = query.ilike("row_text", `%${opts.q}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    count: count ?? 0,
    rows: (data ?? []).map((row: any) => ({
      id: row.id,
      workbookId: row.workbook_id,
      sheetId: row.sheet_id,
      rowIndex: N(row.row_index),
      cells: Array.isArray(row.cells) ? row.cells : [],
      rowText: row.row_text ?? undefined,
    })),
  };
}

export async function getTransaction(id: string): Promise<Transaction | undefined> {
  const { data } = await sb().from("transactions").select(DETAIL_SELECT).eq("id", id).maybeSingle();
  if (!data) return undefined;
  const rel = await loadTxEnrichment([data]);
  return rowToTx(data, rel);
}

export async function findByJm(rc?: string): Promise<Transaction | undefined> {
  if (!rc) return undefined;
  const { data } = await sb().from("transactions").select(DETAIL_SELECT).eq("rc_jm_no", rc).maybeSingle();
  if (!data) return undefined;
  const rel = await loadTxEnrichment([data]);
  return rowToTx(data, rel);
}

export async function addTransaction(t: Omit<Transaction, "id">): Promise<Transaction> {
  const s = sb();
  const { data, error } = await s.from("transactions").insert({
    ngay: t.ngay, company: t.company, type: t.type, ma_sku: t.maSku, dien_giai: t.dienGiai,
    khach: t.khach, contact: t.contact, expense: t.expense, company_account: t.companyAccount || null,
    ar_cash: t.arCash, ar_bankwire: t.arBankwire, ar_zelle: t.arZelle, ar_check: t.arCheck,
    ap_cash: t.apCash || 0, ap_bankwire: t.apBankwire || 0, ap_zelle: t.apZelle || 0, ap_check: t.apCheck || 0,
    rc_jm_no: t.rcJmNo || null, so_no: t.soNo || null, appt_id: t.apptId || null,
    source_1: t.source1 || null, source_2: t.source2 || null, sale_1: t.sale1 || null,
    sale_2: t.sale2 || null, sale_3: t.sale3 || null,
    sale_1_pct: t.sale1Pct ?? null, sale_2_pct: t.sale2Pct ?? null, sale_3_pct: t.sale3Pct ?? null,
    sale_online: t.saleOnline || null, sale_online_2: t.saleOnline2 || null, sale_online_3: t.saleOnline3 || null,
    transaction_value: t.transactionValue || null,
    pct_support: t.pctSupport ?? null, order_total: t.orderTotal ?? null, old_receipt_no: t.oldReceiptNo || null,
    deposit_date: t.depositDate || null, bell_code: t.bellCode || null,
    note: t.note || null, trang_thai: t.trangThai,
  }).select("id").single();
  if (error) throw error;
  const id = data!.id as string;

  if (t.lineItems.length)
    await s.from("line_items").insert(t.lineItems.map((l) => ({
      transaction_id: id, mo_ta: l.moTa, sku: l.sku, gia_no: l.giaNo, so_luong: l.soLuong, don_gia: l.donGia,
    })));
  if (t.payments.length)
    await s.from("payments").insert(t.payments.map((p) => ({
      transaction_id: id, ngay: p.ngay, so_tien: p.soTien, hinh_thuc: p.hinhThuc, nguoi_xac_nhan: p.nguoiXacNhan, ghi_chu: p.ghiChu, is_dau: p.isDau ?? false,
    })));

  return (await getTransaction(id))!;
}

export async function updateTransaction(id: string, patch: Partial<Transaction>) {
  const map: Record<string, any> = {};
  const set = (k: string, v: any) => { if (v !== undefined) map[k] = v === "" ? null : v; };
  // các cột nhập tay (sửa trực tiếp trên sổ)
  set("ngay", patch.ngay);
  set("type", patch.type);
  set("dien_giai", patch.dienGiai);
  set("ma_sku", patch.maSku);
  set("khach", patch.khach);
  set("contact", patch.contact);
  set("company_account", patch.companyAccount);
  set("expense", patch.expense);
  set("ar_cash", patch.arCash);
  set("ar_bankwire", patch.arBankwire);
  set("ar_zelle", patch.arZelle);
  set("ar_check", patch.arCheck);
  set("ap_cash", patch.apCash);
  set("ap_bankwire", patch.apBankwire);
  set("ap_zelle", patch.apZelle);
  set("ap_check", patch.apCheck);
  set("rc_jm_no", patch.rcJmNo);
  set("so_no", patch.soNo);
  set("appt_id", patch.apptId);
  set("source_1", patch.source1);
  set("source_2", patch.source2);
  set("sale_1", patch.sale1);
  set("sale_2", patch.sale2);
  set("sale_3", patch.sale3);
  set("sale_1_pct", patch.sale1Pct);
  set("sale_2_pct", patch.sale2Pct);
  set("sale_3_pct", patch.sale3Pct);
  set("sale_online", patch.saleOnline);
  set("sale_online_2", patch.saleOnline2);
  set("sale_online_3", patch.saleOnline3);
  set("transaction_value", patch.transactionValue);
  set("pct_support", patch.pctSupport);
  set("order_total", patch.orderTotal);
  set("old_receipt_no", patch.oldReceiptNo);
  set("deposit_date", patch.depositDate);
  set("bell_code", patch.bellCode);
  set("trang_thai", patch.trangThai);
  set("note", patch.note);
  if (Object.keys(map).length) await sb().from("transactions").update(map).eq("id", id);
}

export async function setStatus(id: string, s: TxStatus) {
  await sb().from("transactions").update({ trang_thai: s }).eq("id", id);
}

export async function listAccounts(): Promise<Account[]> {
  try {
    const { data, error } = await sb().from("accounts").select("*").order("sort", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id, entity: r.entity, companyId: r.company_id ?? undefined, code: r.code ?? undefined, name: r.name,
      accountType: r.account_type ?? undefined, beginning: N(r.beginning), ending: N(r.ending), sort: r.sort ?? 0,
    }));
  } catch (e) {
    console.warn("[accounts] bảng chưa có? chạy migration-accounts.sql —", (e as any)?.message);
    return [];
  }
}

// ===== Sao kê ngân hàng =====
async function loadAccountMap(accountIds: string[]): Promise<Map<string, { name: string; accountType?: string }>> {
  const out = new Map<string, { name: string; accountType?: string }>();
  const ids = [...new Set(accountIds.filter(Boolean))];
  if (!ids.length) return out;
  try {
    for (const batch of chunks(ids, IN_BATCH_SIZE)) {
      const { data, error } = await sb().from("accounts").select("id, name, account_type").in("id", batch);
      if (error) throw error;
      for (const r of data ?? []) out.set(r.id, { name: r.name, accountType: r.account_type ?? undefined });
    }
  } catch (e) {
    warnOnce("rel-bank-account", "[relationships] không enrich được bank account —", e);
  }
  return out;
}

function rowToBank(r: any, accounts?: Map<string, { name: string; accountType?: string }>): BankLine {
  const account = r.account_id ? accounts?.get(r.account_id) : undefined;
  return {
    id: r.id, company: companyCode(r.company), companyId: r.company_id ?? undefined,
    bankAccount: r.bank_account ?? undefined, accountId: r.account_id ?? undefined, accountName: account?.name,
    ngay: r.ngay,
    description: r.description ?? "", category: r.category ?? undefined, amount: N(r.amount),
    matched: !!r.matched, note: r.note ?? undefined,
  };
}
export async function listBankLines(opts?: { company?: string; from?: string; to?: string }): Promise<BankLine[]> {
  try {
    let q: any = sb().from("bank_statements").select("*").order("ngay", { ascending: false });
    if (opts?.company && opts.company !== "all") q = q.eq("company", opts.company);
    if (opts?.from) q = q.gte("ngay", opts.from);
    if (opts?.to) q = q.lte("ngay", opts.to);
    const { data, error } = await q;
    if (error) throw error;
    const accounts = await loadAccountMap((data ?? []).map((r: any) => r.account_id).filter(Boolean));
    return (data ?? []).map((r: any) => rowToBank(r, accounts));
  } catch (e) {
    console.warn("[bank_statements] bảng chưa có? chạy migration-bank.sql —", (e as any)?.message);
    return [];
  }
}
export async function addBankLine(b: Omit<BankLine, "id">): Promise<void> {
  await sb().from("bank_statements").insert({
    company: b.company, bank_account: b.bankAccount || null, ngay: b.ngay,
    description: b.description, category: b.category || null, amount: b.amount, matched: b.matched, note: b.note || null,
  });
}
export async function setBankMatched(id: string, matched: boolean): Promise<void> {
  await sb().from("bank_statements").update({ matched }).eq("id", id);
}
