// Lớp ĐỌC báo cáo từ mô hình mới (view v_rc_entry trên rc_entries).
// Trả về cùng kiểu Transaction để các trang/báo cáo hiện tại dùng được ngay.
// Bật bằng env USE_RC_READS=true (parallel-run kiểm chứng). Ghi vẫn theo db-repo cũ.
import { sb } from "./supabase-server";
import type { CompanyCode, Transaction, TxStatus, LineItem } from "./types";

const N = (v: any) => (v == null ? 0 : Number(v));
const PAGE = 1000;

function companyCode(value: any): CompanyCode {
  const up = String(value || "").trim().toUpperCase();
  if (up === "TRANS" || up === "TFJ") return "Trans";
  if (up === "PC49" || up === "TDW" || up === "HPLLC" || up === "3NVY") return up as CompanyCode;
  return "Other";
}

function rowToTx(r: any): Transaction {
  return {
    id: r.id,
    ngay: r.ngay,
    company: companyCode(r.company),
    type: r.type,
    maSku: r.ma_sku ?? undefined,
    dienGiai: r.dien_giai ?? "",
    khach: r.khach ?? "",
    contact: r.contact ?? undefined,
    companyAccount: undefined,
    expense: N(r.expense),
    arCash: N(r.ar_cash), arBankwire: N(r.ar_bankwire), arZelle: N(r.ar_zelle), arCheck: N(r.ar_check),
    apCash: N(r.ap_cash), apBankwire: N(r.ap_bankwire), apZelle: N(r.ap_zelle), apCheck: N(r.ap_check),
    rcJmNo: r.rc_jm_no ?? undefined,
    source1: r.source_1 ?? "", source2: r.source_2 ?? undefined,
    sale1: r.sale_1 ?? undefined, sale2: r.sale_2 ?? undefined, sale3: r.sale_3 ?? undefined,
    saleOnline: r.sale_online ?? undefined, saleOnline2: r.sale_online_2 ?? undefined, saleOnline3: r.sale_online_3 ?? undefined,
    transactionValue: r.transaction_value ?? undefined,
    pctSupport: r.pct_support != null ? N(r.pct_support) : undefined,
    orderTotal: r.total != null ? N(r.total) : undefined,
    oldReceiptNo: r.old_receipt_no ?? undefined,
    depositDate: r.deposit_date ?? undefined,
    bellCode: r.bell_code ?? undefined,
    trangThai: (r.trang_thai ?? "hoan_tat") as TxStatus,
    note: r.note ?? undefined,
    companyId: r.company_id ?? undefined,
    customerId: r.customer_id ?? undefined,
    parentId: r.deal_id ?? undefined,
    createdAt: r.created_at ?? undefined,
    lineItems: [],
    payments: [],
  };
}

function applyFilters(q: any, opts?: { company?: string; status?: string; q?: string; from?: string; to?: string }) {
  if (opts?.company && opts.company !== "all") q = q.eq("company", opts.company);
  if (opts?.status && opts.status !== "all") q = q.eq("trang_thai", opts.status);
  if (opts?.from) q = q.gte("ngay", opts.from);
  if (opts?.to) q = q.lte("ngay", opts.to);
  if (opts?.q) q = q.or(`rc_jm_no.ilike.%${opts.q}%,khach.ilike.%${opts.q}%,dien_giai.ilike.%${opts.q}%`);
  return q;
}

export async function listTransactions(opts?: { company?: string; status?: string; q?: string; from?: string; to?: string }): Promise<Transaction[]> {
  const rows: any[] = [];
  let from = 0;
  while (true) {
    let q: any = sb().from("v_rc_entry").select("*").order("ngay", { ascending: false }).range(from, from + PAGE - 1);
    q = applyFilters(q, opts);
    const { data, error } = await q;
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
    from += PAGE;
  }
  return rows.map(rowToTx);
}

export async function listTransactionsPaged(
  opts: { company?: string; status?: string; q?: string; from?: string; to?: string },
  page: number, pageSize: number,
): Promise<{ rows: Transaction[]; total: number }> {
  const fromIdx = (Math.max(1, page) - 1) * pageSize;
  let q: any = sb().from("v_rc_entry").select("*", { count: "exact" }).order("ngay", { ascending: false }).range(fromIdx, fromIdx + pageSize - 1);
  q = applyFilters(q, opts);
  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data ?? []).map(rowToTx), total: count ?? 0 };
}

async function withLineItems(t: Transaction): Promise<Transaction> {
  const { data } = await sb().from("rc_line_items").select("*").eq("rc_entry_id", t.id).order("line_no", { ascending: true });
  t.lineItems = (data ?? []).map((l: any): LineItem => ({
    id: l.id, moTa: l.description ?? "", sku: l.sku ?? undefined, giaNo: l.gia_no ?? undefined,
    soLuong: N(l.qty), donGia: N(l.unit_price),
  }));
  return t;
}

export async function getTransaction(id: string): Promise<Transaction | undefined> {
  const { data } = await sb().from("v_rc_entry").select("*").eq("id", id).maybeSingle();
  if (!data) return undefined;
  return withLineItems(rowToTx(data));
}

export async function findByJm(rc?: string): Promise<Transaction | undefined> {
  if (!rc) return undefined;
  const { data } = await sb().from("v_rc_entry").select("*").eq("rc_jm_no", rc).maybeSingle();
  if (!data) return undefined;
  return rowToTx(data);
}
