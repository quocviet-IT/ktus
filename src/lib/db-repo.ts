import { sb } from "./supabase-server";
import type { Transaction, TxStatus, LineItem, Payment } from "./types";

const N = (v: any) => (v == null ? 0 : Number(v));
const PAGE_SIZE = 1000;

function rowToTx(r: any): Transaction {
  return {
    id: r.id, ngay: r.ngay, company: r.company, type: r.type,
    maSku: r.ma_sku ?? undefined, dienGiai: r.dien_giai ?? "", khach: r.khach, contact: r.contact ?? undefined,
    companyAccount: r.company_account ?? undefined,
    expense: N(r.expense), arCash: N(r.ar_cash), arBankwire: N(r.ar_bankwire), arZelle: N(r.ar_zelle), arCheck: N(r.ar_check),
    apCash: N(r.ap_cash), apBankwire: N(r.ap_bankwire), apZelle: N(r.ap_zelle), apCheck: N(r.ap_check),
    rcJmNo: r.rc_jm_no ?? undefined, soNo: r.so_no ?? undefined, apptId: r.appt_id ?? undefined,
    source1: r.source_1 ?? "", source2: r.source_2 ?? undefined,
    sale1: r.sale_1 ?? undefined, saleOnline: r.sale_online ?? undefined,
    transactionValue: r.transaction_value ?? undefined, pctSupport: r.pct_support != null ? N(r.pct_support) : undefined,
    oldReceiptNo: r.old_receipt_no ?? undefined, depositDate: r.deposit_date ?? undefined,
    bellCode: r.bell_code ?? undefined, trangThai: r.trang_thai as TxStatus, note: r.note ?? undefined,
    lineItems: (r.line_items ?? []).map((l: any): LineItem => ({
      id: l.id, moTa: l.mo_ta ?? "", sku: l.sku ?? undefined, giaNo: l.gia_no ?? undefined,
      soLuong: N(l.so_luong), donGia: N(l.don_gia),
    })),
    payments: (r.payments ?? []).map((p: any): Payment => ({
      id: p.id, ngay: p.ngay, soTien: N(p.so_tien), hinhThuc: p.hinh_thuc ?? undefined,
      nguoiXacNhan: p.nguoi_xac_nhan ?? undefined, ghiChu: p.ghi_chu ?? undefined, isDau: p.is_dau ?? false,
    })),
  };
}

const SELECT = "*, line_items(*), payments(*)";

export async function listTransactions(opts?: { company?: string; status?: string; q?: string; from?: string; to?: string }): Promise<Transaction[]> {
  const rows: any[] = [];
  let from = 0;

  while (true) {
    let query: any = sb().from("transactions").select(SELECT).order("ngay", { ascending: false }).range(from, from + PAGE_SIZE - 1);
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

  return rows.map(rowToTx);
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
  const { data } = await sb().from("transactions").select(SELECT).eq("id", id).maybeSingle();
  return data ? rowToTx(data) : undefined;
}

export async function findByJm(rc?: string): Promise<Transaction | undefined> {
  if (!rc) return undefined;
  const { data } = await sb().from("transactions").select(SELECT).eq("rc_jm_no", rc).maybeSingle();
  return data ? rowToTx(data) : undefined;
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
    sale_online: t.saleOnline || null, transaction_value: t.transactionValue || null,
    pct_support: t.pctSupport ?? null, old_receipt_no: t.oldReceiptNo || null,
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
  set("rc_jm_no", patch.rcJmNo);
  set("so_no", patch.soNo);
  set("appt_id", patch.apptId);
  set("source_1", patch.source1);
  set("source_2", patch.source2);
  set("sale_1", patch.sale1);
  set("sale_online", patch.saleOnline);
  set("transaction_value", patch.transactionValue);
  set("pct_support", patch.pctSupport);
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

// ===== Chart of accounts (BALANCE ACCOUNT) =====
import type { Account } from "./types";
export async function listAccounts(): Promise<Account[]> {
  const { data, error } = await sb().from("accounts").select("*").order("sort", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id, entity: r.entity, code: r.code ?? undefined, name: r.name,
    accountType: r.account_type ?? undefined, beginning: N(r.beginning), ending: N(r.ending), sort: r.sort ?? 0,
  }));
}

// ===== Sao kê ngân hàng =====
import type { BankLine } from "./types";
function rowToBank(r: any): BankLine {
  return {
    id: r.id, company: r.company, bankAccount: r.bank_account ?? undefined, ngay: r.ngay,
    description: r.description ?? "", category: r.category ?? undefined, amount: N(r.amount),
    matched: !!r.matched, note: r.note ?? undefined,
  };
}
export async function listBankLines(opts?: { company?: string; from?: string; to?: string }): Promise<BankLine[]> {
  let q: any = sb().from("bank_statements").select("*").order("ngay", { ascending: false });
  if (opts?.company && opts.company !== "all") q = q.eq("company", opts.company);
  if (opts?.from) q = q.gte("ngay", opts.from);
  if (opts?.to) q = q.lte("ngay", opts.to);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToBank);
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
