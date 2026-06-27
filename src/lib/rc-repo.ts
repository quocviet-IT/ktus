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
    orderTotal: r.order_total != null ? N(r.order_total) : (r.total != null ? N(r.total) : undefined),
    taxRate: r.tax_rate != null ? N(r.tax_rate) : undefined,
    taxAmount: r.tax_amount != null ? N(r.tax_amount) : undefined,
    oldReceiptNo: r.old_receipt_no ?? undefined,
    depositDate: r.deposit_date ?? undefined,
    bellCode: r.bell_code ?? undefined,
    trangThai: (r.trang_thai ?? "hoan_tat") as TxStatus,
    note: r.note ?? undefined,
    cancelReason: r.cancel_reason ?? undefined,
    canceledAt: r.canceled_at ?? undefined,
    cancelMode: r.cancel_mode ?? undefined,
    companyId: r.company_id ?? undefined,
    customerId: r.customer_id ?? undefined,
    parentId: r.deal_id ?? undefined,
    createdAt: r.created_at ?? undefined,
    lineItems: [],
    payments: [],
  };
}

function applyOrderOrCancelDateFilter(q: any, from?: string, to?: string) {
  if (!from && !to) return q;
  const orderParts = [];
  const cancelParts = ["trang_thai.eq.cancel"];
  if (from) {
    orderParts.push(`ngay.gte.${from}`);
    cancelParts.push(`canceled_at.gte.${from}`);
  }
  if (to) {
    orderParts.push(`ngay.lte.${to}`);
    cancelParts.push(`canceled_at.lte.${to}`);
  }
  return q.or(`and(${orderParts.join(",")}),and(${cancelParts.join(",")})`);
}

function applyFilters(q: any, opts?: { company?: string; status?: string; q?: string; from?: string; to?: string }) {
  if (opts?.company && opts.company !== "all") q = q.eq("company", opts.company);
  if (opts?.status && opts.status !== "all") q = q.eq("trang_thai", opts.status);
  q = applyOrderOrCancelDateFilter(q, opts?.from, opts?.to);
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
  opts: { company?: string; status?: string; q?: string; from?: string; to?: string; sort?: "newest" | "oldest" },
  page: number, pageSize: number,
): Promise<{ rows: Transaction[]; total: number }> {
  const fromIdx = (Math.max(1, page) - 1) * pageSize;
  let q: any = sb().from("v_rc_entry").select("*", { count: "exact" }).order("ngay", { ascending: opts.sort === "oldest" }).range(fromIdx, fromIdx + pageSize - 1);
  q = applyFilters(q, opts);
  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data ?? []).map(rowToTx), total: count ?? 0 };
}

export async function listMissingSourcePaged(
  opts: { company?: string; q?: string; from?: string; to?: string; sort?: "newest" | "oldest" },
  page: number,
  pageSize: number,
): Promise<{ rows: Transaction[]; total: number }> {
  const fromIdx = (Math.max(1, page) - 1) * pageSize;
  let q: any = sb().from("v_rc_entry").select("*", { count: "exact" })
    .neq("trang_thai", "cancel")
    .or("source_1.is.null,source_1.eq.,source_1.eq.Không có source")
    .order("ngay", { ascending: opts.sort === "oldest" })
    .range(fromIdx, fromIdx + pageSize - 1);
  q = applyFilters(q, { company: opts.company, q: opts.q, from: opts.from, to: opts.to });
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
  const extra = await sb().from("rc_entries").select("cancel_reason, canceled_at, cancel_mode").eq("id", id).maybeSingle();
  return withLineItems(rowToTx({ ...data, ...(extra.data ?? {}) }));
}

export async function findByJm(rc?: string): Promise<Transaction | undefined> {
  if (!rc) return undefined;
  const { data } = await sb().from("v_rc_entry").select("*").eq("rc_jm_no", rc).maybeSingle();
  if (!data) return undefined;
  return rowToTx(data);
}

// ===== GHI (cutover) =====

async function companyIdOf(code: string): Promise<number | null> {
  const { data } = await sb().from("companies").select("id").eq("code", code).maybeSingle();
  if (data?.id != null) return Number(data.id);
  const other = await sb().from("companies").select("id").eq("code", "Other").maybeSingle();
  return other.data?.id != null ? Number(other.data.id) : null;
}

async function resolveCustomerId(name?: string, contact?: string): Promise<string | null> {
  const ten = (name || "").trim();
  if (!ten) return null;
  const found = await sb().from("customers").select("id").ilike("ten", ten).limit(1).maybeSingle();
  if (found.data?.id) return found.data.id;
  const phone = (contact || "").replace(/\D/g, "") || null;
  const ins = await sb().from("customers").insert({ ten, phone_raw: contact || null, phone_normalized: phone }).select("id").single();
  return ins.data?.id ?? null;
}

async function resolveSalesId(name?: string, kind = "counter"): Promise<string | null> {
  const ten = (name || "").trim();
  if (!ten) return null;
  const found = await sb().from("sales_people").select("id").ilike("ten", ten).limit(1).maybeSingle();
  if (found.data?.id) return found.data.id;
  const ins = await sb().from("sales_people").insert({ ten, kind }).select("id").single();
  return ins.data?.id ?? null;
}

// Đảm bảo code tồn tại để không vi phạm FK (cho phép người dùng thêm nguồn/mã mới)
async function ensureSource(code?: string): Promise<string | null> {
  const c = (code || "").trim();
  if (!c) return null;
  await sb().from("sources").insert({ code: c, label: c }).select("code").maybeSingle().then(() => {}, () => {});
  return c;
}
async function ensureBell(code?: string): Promise<string | null> {
  const c = (code || "").trim();
  if (!c) return null;
  await sb().from("bell_codes").insert({ code: c }).select("code").maybeSingle().then(() => {}, () => {});
  return c;
}

const AR_METHODS: [string, string][] = [["arCash", "cash"], ["arBankwire", "bankwire"], ["arZelle", "zelle"], ["arCheck", "check"]];
const AP_METHODS: [string, string][] = [["apCash", "cash"], ["apBankwire", "bankwire"], ["apZelle", "zelle"], ["apCheck", "check"]];

async function upsertPayment(eid: string, direction: "ar" | "ap", method: string, amount: number) {
  if (amount && amount !== 0) {
    await sb().from("entry_payments").upsert(
      { rc_entry_id: eid, direction, method_code: method, amount },
      { onConflict: "rc_entry_id,direction,method_code" },
    );
  } else {
    await sb().from("entry_payments").delete().eq("rc_entry_id", eid).eq("direction", direction).eq("method_code", method);
  }
}

async function setSales(eid: string, channel: "counter" | "online", position: number, name?: string, pct?: number) {
  const sid = await resolveSalesId(name, channel);
  if (!sid) {
    await sb().from("entry_sales").delete().eq("rc_entry_id", eid).eq("channel", channel).eq("position", position);
    return;
  }
  await sb().from("entry_sales").upsert(
    { rc_entry_id: eid, salesperson_id: sid, channel, position, pct: pct ?? null },
    { onConflict: "rc_entry_id,channel,position" },
  );
}

export async function addTransaction(t: Omit<Transaction, "id">): Promise<Transaction> {
  const s = sb();
  const companyId = await companyIdOf(t.company);
  const customerId = await resolveCustomerId(t.khach, t.contact);
  const { data, error } = await s.from("rc_entries").insert({
    company_id: companyId, entry_date: t.ngay, type_code: t.type,
    description: t.dienGiai || null, customer_id: customerId, contact_raw: t.contact || null,
    sku_raw: t.maSku || null, bell_code: await ensureBell(t.bellCode),
    expense: t.expense || 0,
    source1_id: await ensureSource(t.source1), source2_id: await ensureSource(t.source2),
    transaction_value: t.transactionValue || null, pct_support: t.pctSupport ?? null,
    order_total: t.orderTotal ?? null, tax_rate: t.taxRate ?? null, tax_amount: t.taxAmount ?? null,
    old_receipt_no: t.oldReceiptNo || null, status: t.trangThai, note: t.note || null,
    cancel_reason: t.cancelReason || null, canceled_at: t.canceledAt || null, cancel_mode: t.cancelMode || null,
    jm_receipt_no: t.rcJmNo || null,
  }).select("id").single();
  if (error) throw error;
  const id = data!.id as string;

  // Hình thức TT ĐỘNG: lấy từ payments (mỗi method 1 dòng, kể cả hình thức mới).
  // Fallback 4 cột chuẩn nếu không có payments.
  const pmCode = (m?: string) => (m === "bank_wire" ? "bankwire" : (m || "cash"));
  if (t.payments?.length) {
    for (const p of t.payments) {
      const dir = ((p as any).direction === "ap" ? "ap" : "ar") as "ar" | "ap";
      const amt = Number(p.soTien) || 0;
      if (amt) await upsertPayment(id, dir, pmCode(p.hinhThuc), amt);
    }
  } else {
    for (const [k, m] of AR_METHODS) await upsertPayment(id, "ar", m, Number((t as any)[k]) || 0);
    for (const [k, m] of AP_METHODS) await upsertPayment(id, "ap", m, Number((t as any)[k]) || 0);
  }

  if (t.lineItems?.length)
    await s.from("rc_line_items").insert(t.lineItems.map((l, i) => ({
      rc_entry_id: id, line_no: i + 1, description: l.moTa, sku: l.sku, gia_no: l.giaNo,
      qty: l.soLuong, unit_price: l.donGia,
    })));

  await setSales(id, "counter", 1, t.sale1, t.sale1Pct);
  await setSales(id, "counter", 2, t.sale2, t.sale2Pct);
  await setSales(id, "counter", 3, t.sale3, t.sale3Pct);
  await setSales(id, "online", 1, t.saleOnline, t.pctSupport);
  await setSales(id, "online", 2, t.saleOnline2);
  await setSales(id, "online", 3, t.saleOnline3);

  // Deal: do TRIGGER DB tự nối pickup→cọc + tạo deal cho đơn cọc (migration-06). App không cần xử lý.

  return (await getTransaction(id))!;
}

export async function updateTransaction(id: string, patch: Partial<Transaction>) {
  const s = sb();
  const map: Record<string, any> = {};
  const set = (k: string, v: any) => { if (v !== undefined) map[k] = v === "" ? null : v; };
  set("entry_date", patch.ngay);
  set("type_code", patch.type);
  set("description", patch.dienGiai);
  set("sku_raw", patch.maSku);
  set("contact_raw", patch.contact);
  set("transaction_value", patch.transactionValue);
  set("pct_support", patch.pctSupport);
  set("order_total", patch.orderTotal);
  set("tax_rate", patch.taxRate);
  set("tax_amount", patch.taxAmount);
  set("old_receipt_no", patch.oldReceiptNo);
  set("status", patch.trangThai);
  set("note", patch.note);
  set("cancel_reason", patch.cancelReason);
  set("canceled_at", patch.canceledAt);
  set("cancel_mode", patch.cancelMode);
  set("jm_receipt_no", patch.rcJmNo);
  if (patch.bellCode !== undefined) map["bell_code"] = await ensureBell(patch.bellCode);
  if (patch.source1 !== undefined) map["source1_id"] = await ensureSource(patch.source1);
  if (patch.source2 !== undefined) map["source2_id"] = await ensureSource(patch.source2);
  if (patch.khach !== undefined) map["customer_id"] = await resolveCustomerId(patch.khach, patch.contact);
  // GHI CHÍNH: phải báo lỗi nếu thất bại (trước đây nuốt lỗi → "lưu" im lặng không tác dụng)
  if (Object.keys(map).length) {
    const { error } = await s.from("rc_entries").update(map).eq("id", id);
    if (error) throw new Error("Cập nhật RC thất bại: " + error.message);
  }

  // Bước phụ (tiền/sales): lỗi 1 phần KHÔNG làm hỏng phần ghi chính
  try {
    for (const [k, m] of AR_METHODS) if ((patch as any)[k] !== undefined) await upsertPayment(id, "ar", m, Number((patch as any)[k]) || 0);
    for (const [k, m] of AP_METHODS) if ((patch as any)[k] !== undefined) await upsertPayment(id, "ap", m, Number((patch as any)[k]) || 0);
    if (patch.sale1 !== undefined || patch.sale1Pct !== undefined) await setSales(id, "counter", 1, patch.sale1, patch.sale1Pct);
    if (patch.sale2 !== undefined || patch.sale2Pct !== undefined) await setSales(id, "counter", 2, patch.sale2, patch.sale2Pct);
    if (patch.sale3 !== undefined || patch.sale3Pct !== undefined) await setSales(id, "counter", 3, patch.sale3, patch.sale3Pct);
    if (patch.saleOnline !== undefined) await setSales(id, "online", 1, patch.saleOnline, patch.pctSupport);
    if (patch.saleOnline2 !== undefined) await setSales(id, "online", 2, patch.saleOnline2);
    if (patch.saleOnline3 !== undefined) await setSales(id, "online", 3, patch.saleOnline3);
  } catch (e) {
    console.warn("[rc-repo] update sub-step lỗi (đã lưu phần chính):", (e as any)?.message);
  }
}

export async function setStatus(id: string, status: TxStatus) {
  await sb().from("rc_entries").update({ status }).eq("id", id);
}
