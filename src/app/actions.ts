"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addTransaction, updateTransaction, setStatus as dbSetStatus, getTransaction, findByJm, addBankLine, setBankMatched, addPaymentMethod, deleteCatalogItem, upsertCatalogItem, setCatalogActive } from "@/lib/data";
import type { CatalogGroupKey } from "@/lib/catalog";
import type { TxStatus, TxType, CompanyCode, LineItem, Payment } from "@/lib/types";

export interface RcInput {
  ngay: string;
  company: CompanyCode;
  type: TxType;
  khach: string;
  contact?: string;
  maSku?: string;
  dienGiai?: string;
  companyAccount?: string;
  expense?: number;
  arCash?: number;
  arBankwire?: number;
  arZelle?: number;
  arCheck?: number;
  apCash?: number;
  apBankwire?: number;
  apZelle?: number;
  apCheck?: number;
  pay: string;
  arPayments?: Record<string, number>;
  apPayments?: Record<string, number>;
  // dòng hàng (nhập riêng — gộp khi lưu)
  lines: { moTa: string; soLuong: number; donGia: number; giaNo?: string; sku?: string }[];
  // bước 2 (JM) — có thể bỏ trống
  rcJmNo?: string;
  soNo?: string;
  apptId?: string;
  source1?: string;
  source2?: string;
  sale1?: string;
  sale2?: string;
  sale3?: string;
  sale1Pct?: number;
  sale2Pct?: number;
  sale3Pct?: number;
  saleOnline?: string;
  saleOnline2?: string;
  saleOnline3?: string;
  transactionValue?: string;
  pctSupport?: number;
  orderTotal?: number;
  oldReceiptNo?: string;
  depositDate?: string;
  bellCode?: string;
  note?: string;
}

const LEGACY_AR_SETTERS = {
  cash: "arCash",
  bank_wire: "arBankwire",
  zelle: "arZelle",
  check: "arCheck",
} as const;

const LEGACY_AP_SETTERS = {
  cash: "apCash",
  bank_wire: "apBankwire",
  zelle: "apZelle",
  check: "apCheck",
} as const;

function cleanPaymentAmounts(input?: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [method, value] of Object.entries(input ?? {})) {
    const amount = Number(value) || 0;
    if (amount > 0) out[method] = amount;
  }
  return out;
}

function applyLegacyAmounts<T extends Record<string, number>>(
  target: T,
  amounts: Record<string, number>,
  fields: Record<string, keyof T>,
) {
  for (const [method, amount] of Object.entries(amounts)) {
    const field = fields[method];
    if (field) target[field] = amount as T[keyof T];
  }
}

function paymentRows(ngay: string, amounts: Record<string, number>, direction: "ar" | "ap"): Payment[] {
  return Object.entries(amounts).map(([method, amount], index) => ({
    id: `${direction}${index}`,
    ngay,
    soTien: amount,
    hinhThuc: method,
    direction,
    isDau: direction === "ar",
  }));
}

// Tra ngày cọc theo Old Receipt # (thay công thức INDEX/MATCH trong Excel):
// tìm đơn cọc có số JM = oldReceiptNo, trả về ngày + khách để form tự điền.
export async function lookupDepositInfo(oldReceiptNo: string): Promise<{ date?: string; khach?: string }> {
  const v = (oldReceiptNo || "").trim();
  if (!v) return {};
  const dep = await findByJm(v);
  return dep ? { date: dep.ngay, khach: dep.khach } : {};
}

// BR-07: gộp dòng & tự tính tổng → đổ vào A/R theo hình thức; BR-01 sẽ tự phân loại khi hiển thị
export async function createRc(input: RcInput) {
  const lineItems: LineItem[] = input.lines
    .filter((l) => l.moTa || l.donGia)
    .map((l, i) => ({ id: "li" + i, moTa: l.moTa, sku: l.sku, giaNo: l.giaNo, soLuong: Number(l.soLuong) || 0, donGia: Number(l.donGia) || 0 }));
  const tong = lineItems.reduce((s, l) => s + l.soLuong * l.donGia, 0);

  const ar = {
    arCash: Number(input.arCash) || 0,
    arBankwire: Number(input.arBankwire) || 0,
    arZelle: Number(input.arZelle) || 0,
    arCheck: Number(input.arCheck) || 0,
  };
  const isPO = input.type === "po" || input.type === "return" || input.type === "exchange";
  const arPayments = cleanPaymentAmounts(input.arPayments);
  const hasManualReceivable = Object.keys(arPayments).length > 0 || ar.arCash || ar.arBankwire || ar.arZelle || ar.arCheck;
  if (!isPO && !hasManualReceivable) {
    arPayments[input.pay || "cash"] = tong;
  }
  applyLegacyAmounts(ar, arPayments, LEGACY_AR_SETTERS);

  // A/P (chi tiền ra) cho PO/mua vào/trả hàng
  const ap = {
    apCash: Number(input.apCash) || 0,
    apBankwire: Number(input.apBankwire) || 0,
    apZelle: Number(input.apZelle) || 0,
    apCheck: Number(input.apCheck) || 0,
  };
  const apPayments = cleanPaymentAmounts(input.apPayments);
  const hasManualAP = Object.keys(apPayments).length > 0 || ap.apCash || ap.apBankwire || ap.apZelle || ap.apCheck;
  if (isPO && !hasManualAP) apPayments.cash = Number(input.expense) || tong; // mặc định chi bằng cash
  applyLegacyAmounts(ap, apPayments, LEGACY_AP_SETTERS);
  const companyAccount = input.companyAccount || `${input.company} cash`;

  const rec = await addTransaction({
    ngay: input.ngay, company: input.company, type: input.type,
    maSku: input.maSku, dienGiai: input.dienGiai || lineItems[0]?.moTa || "",
    khach: input.khach, contact: input.contact, companyAccount,
    expense: Number(input.expense) || (isPO ? tong : 0), ...ar, ...ap,
    rcJmNo: input.rcJmNo || "", soNo: input.soNo || "", apptId: input.apptId || "",
    source1: input.source1 || "", source2: input.source2 || "", sale1: input.sale1,
    sale2: input.sale2 || "", sale3: input.sale3 || "",
    sale1Pct: input.sale1Pct ? Number(input.sale1Pct) : undefined,
    sale2Pct: input.sale2Pct ? Number(input.sale2Pct) : undefined,
    sale3Pct: input.sale3Pct ? Number(input.sale3Pct) : undefined,
    saleOnline: input.saleOnline || "", saleOnline2: input.saleOnline2 || "", saleOnline3: input.saleOnline3 || "",
    transactionValue: input.transactionValue || "",
    pctSupport: input.pctSupport ? Number(input.pctSupport) : undefined,
    orderTotal: input.orderTotal ? Number(input.orderTotal) : (tong || undefined),
    oldReceiptNo: input.oldReceiptNo || "", depositDate: input.depositDate || undefined,
    bellCode: input.bellCode, note: input.note || "",
    trangThai: input.type === "deposit" ? "dat_coc" : "hoan_tat",
    lineItems,
    payments: [...paymentRows(input.ngay, arPayments, "ar"), ...paymentRows(input.ngay, apPayments, "ap")],
  });
  revalidatePath("/"); revalidatePath("/rc"); revalidatePath("/missing-source");
  redirect(`/rc/${rec.id}`);
}

export async function createPaymentMethod(fd: FormData) {
  const label = String(fd.get("label") || "").trim();
  if (label) await addPaymentMethod(label);
  revalidatePath("/catalog");
  revalidatePath("/rc/new");
}

function revalidateCatalogConsumers() {
  revalidatePath("/catalog");
  revalidatePath("/rc/new");
  revalidatePath("/rc");
  revalidatePath("/missing-source");
}

export async function saveCatalogItem(fd: FormData) {
  const group = String(fd.get("group") || "") as CatalogGroupKey;
  const label = String(fd.get("label") || "").trim();
  const code = String(fd.get("code") || "").trim() || undefined;
  const sortRaw = String(fd.get("sort") || "").trim();
  const unit = String(fd.get("unit") || "").trim();
  const conversion = String(fd.get("conversion") || "").trim();
  if (!group || !label) return;
  await upsertCatalogItem({
    group,
    code,
    label,
    sort: sortRaw ? Number(sortRaw) || undefined : undefined,
    meta: unit || conversion ? { unit, conversion } : undefined,
  });
  revalidateCatalogConsumers();
}

export async function removeCatalogItem(fd: FormData) {
  const group = String(fd.get("group") || "") as CatalogGroupKey;
  const code = String(fd.get("code") || "").trim();
  if (!group || !code) return;
  await deleteCatalogItem(group, code);
  revalidateCatalogConsumers();
}

// Bật/Tắt hoạt động 1 mục danh mục (tắt → ẩn khỏi form)
export async function toggleCatalogActive(fd: FormData) {
  const group = String(fd.get("group") || "") as CatalogGroupKey;
  const code = String(fd.get("code") || "").trim();
  const active = String(fd.get("active") || "") === "true";
  if (!group || !code) return;
  await setCatalogActive(group, code, active);
  revalidateCatalogConsumers();
}

export async function setStatus(id: string, s: TxStatus) {
  await dbSetStatus(id, s);
  revalidatePath("/rc"); revalidatePath(`/rc/${id}`); revalidatePath("/");
}

// Sửa RC — cập nhật cột JM/Source/Sale (bước 2, UC-04)
export async function updateRcJm(id: string, fd: FormData) {
  const s = (k: string) => String(fd.get(k) ?? "");
  const numOrU = (k: string) => { const n = parseFloat(s(k)); return isNaN(n) ? undefined : n; };
  await updateTransaction(id, {
    rcJmNo: s("rcJmNo"), soNo: s("soNo"), apptId: s("apptId"),
    source1: s("source1"), source2: s("source2"),
    sale1: s("sale1"), sale2: s("sale2"), sale3: s("sale3"),
    sale1Pct: numOrU("sale1Pct"), sale2Pct: numOrU("sale2Pct"), sale3Pct: numOrU("sale3Pct"),
    saleOnline: s("saleOnline"), saleOnline2: s("saleOnline2"), saleOnline3: s("saleOnline3"),
    transactionValue: s("transactionValue"), pctSupport: numOrU("pctSupport"),
    orderTotal: numOrU("orderTotal"),
    oldReceiptNo: s("oldReceiptNo"), depositDate: s("depositDate"),
    bellCode: s("bellCode"), trangThai: (s("trangThai") || undefined) as any, note: s("note"),
  });
  revalidatePath(`/rc/${id}`); revalidatePath("/rc"); revalidatePath("/missing-source"); revalidatePath("/");
}

// Sửa nhanh 1 ô ngay trên sổ (inline edit, như Excel)
const RC_NUM_FIELDS = new Set(["arCash", "arBankwire", "arZelle", "arCheck", "apCash", "apBankwire", "apZelle", "apCheck", "expense", "orderTotal", "pctSupport"]);
const RC_TEXT_FIELDS = new Set(["ngay", "type", "dienGiai", "maSku", "bellCode", "khach", "contact", "companyAccount", "rcJmNo", "soNo", "transactionValue", "source1", "source2", "sale1", "sale2", "sale3"]);
export async function updateRcField(id: string, field: string, value: string | number) {
  if (!RC_NUM_FIELDS.has(field) && !RC_TEXT_FIELDS.has(field)) return;
  const patch: Record<string, any> = {};
  patch[field] = RC_NUM_FIELDS.has(field) ? (Number(value) || 0) : String(value ?? "");
  await updateTransaction(id, patch as any);
  revalidatePath("/usbc101"); revalidatePath("/rc"); revalidatePath(`/rc/${id}`); revalidatePath("/");
}

// ===== Sao kê ngân hàng =====
export async function createBankLine(company: string, fd: FormData) {
  const s = (k: string) => String(fd.get(k) ?? "");
  await addBankLine({
    company: company as CompanyCode,
    bankAccount: s("bankAccount") || undefined,
    ngay: s("ngay"),
    description: s("description"),
    category: s("category") || undefined,
    amount: Number(fd.get("amount")) || 0,
    matched: false,
  });
  revalidatePath("/usbc101");
}
export async function toggleBankMatched(id: string, matched: boolean) {
  await setBankMatched(id, matched);
  revalidatePath("/usbc101");
}

// Vòng xử lý RC thiếu nguồn (FR-MISS-02)
export async function sendToUS(id: string) {
  await updateTransaction(id, { note: "Đã gửi US — chờ bổ sung nguồn" });
  revalidatePath("/missing-source");
}
export async function resolveSource(id: string, source: string) {
  const t = await getTransaction(id);
  await updateTransaction(id, { source1: source || "WI", note: (t?.note || "") + " · Đã cập nhật JM" });
  revalidatePath("/missing-source"); revalidatePath("/rc"); revalidatePath("/");
}

// Cập nhật nguồn cho RC thiếu nguồn (FR-MISS-03)
export async function resolveSourceDetail(id: string, fd: FormData) {
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const t = await getTransaction(id);
  const src1 = s("source1") || "WI";
  await updateTransaction(id, {
    source1: src1,
    source2: s("source2") || undefined,
    rcJmNo: s("rcJmNo") || t?.rcJmNo,
    note: (t?.note || "").replace(/ · Đã gửi US.*$/, ""),
  });
  revalidatePath("/missing-source"); revalidatePath("/rc"); revalidatePath("/");
}
