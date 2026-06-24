"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addTransaction, updateTransaction, setStatus as dbSetStatus, getTransaction } from "@/lib/data";
import type { TxStatus, TxType, CompanyCode, LineItem } from "@/lib/types";

export interface RcInput {
  ngay: string;
  company: CompanyCode;
  type: TxType;
  khach: string;
  contact?: string;
  maSku?: string;
  dienGiai?: string;
  expense?: number;
  arCash?: number;
  arBankwire?: number;
  arZelle?: number;
  arCheck?: number;
  pay: "cash" | "bank_wire" | "zelle" | "check" | "card";
  // dòng hàng (nhập riêng — gộp khi lưu)
  lines: { moTa: string; soLuong: number; donGia: number; giaNo?: string; sku?: string }[];
  // bước 2 (JM) — có thể bỏ trống
  rcJmNo?: string;
  soNo?: string;
  apptId?: string;
  source1?: string;
  source2?: string;
  sale1?: string;
  saleOnline?: string;
  transactionValue?: string;
  pctSupport?: number;
  oldReceiptNo?: string;
  depositDate?: string;
  bellCode?: string;
  note?: string;
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
  const hasManualReceivable = ar.arCash || ar.arBankwire || ar.arZelle || ar.arCheck;
  if (!isPO && !hasManualReceivable) {
    if (input.pay === "cash") ar.arCash = tong;
    else if (input.pay === "bank_wire") ar.arBankwire = tong;
    else if (input.pay === "zelle") ar.arZelle = tong;
    else if (input.pay === "check") ar.arCheck = tong;
    else ar.arCash = tong; // card → tạm xếp như cash receivable
  }

  const rec = await addTransaction({
    ngay: input.ngay, company: input.company, type: input.type,
    maSku: input.maSku, dienGiai: input.dienGiai || lineItems[0]?.moTa || "",
    khach: input.khach, contact: input.contact,
    expense: Number(input.expense) || (isPO ? tong : 0), ...ar,
    rcJmNo: input.rcJmNo || "", soNo: input.soNo || "", apptId: input.apptId || "",
    source1: input.source1 || "", source2: input.source2 || "", sale1: input.sale1,
    saleOnline: input.saleOnline || "", transactionValue: input.transactionValue || "",
    pctSupport: input.pctSupport ? Number(input.pctSupport) : undefined,
    oldReceiptNo: input.oldReceiptNo || "", depositDate: input.depositDate || undefined,
    bellCode: input.bellCode, note: input.note || "",
    trangThai: input.type === "deposit" ? "dat_coc" : "hoan_tat",
    lineItems,
    payments: isPO ? [] : [{ id: "p0", ngay: input.ngay, soTien: ar.arCash + ar.arBankwire + ar.arZelle + ar.arCheck, hinhThuc: input.pay, isDau: true }],
  });
  revalidatePath("/"); revalidatePath("/rc"); revalidatePath("/missing-source");
  redirect(`/rc/${rec.id}`);
}

export async function setStatus(id: string, s: TxStatus) {
  await dbSetStatus(id, s);
  revalidatePath("/rc"); revalidatePath(`/rc/${id}`); revalidatePath("/");
}

// Sửa RC — cập nhật cột JM/Source/Sale (bước 2, UC-04)
export async function updateRcJm(id: string, fd: FormData) {
  const s = (k: string) => String(fd.get(k) ?? "");
  const pct = parseFloat(s("pctSupport"));
  await updateTransaction(id, {
    rcJmNo: s("rcJmNo"), soNo: s("soNo"), apptId: s("apptId"),
    source1: s("source1"), source2: s("source2"),
    sale1: s("sale1"), saleOnline: s("saleOnline"),
    transactionValue: s("transactionValue"), pctSupport: isNaN(pct) ? undefined : pct,
    oldReceiptNo: s("oldReceiptNo"), depositDate: s("depositDate"),
    bellCode: s("bellCode"), trangThai: (s("trangThai") || undefined) as any, note: s("note"),
  });
  revalidatePath(`/rc/${id}`); revalidatePath("/rc"); revalidatePath("/missing-source"); revalidatePath("/");
}

// Vòng xử lý RC thiếu nguồn (FR-MISS-02)
export async function sendToUS(id: string) {
  await updateTransaction(id, { note: "Đã gửi US — chờ bổ sung nguồn" });
  revalidatePath("/missing-source");
}
export async function resolveSource(id: string, source: string) {
  const t = await getTransaction(id);
  await updateTransaction(id, { source1: source || "WI", note: (t?.note || "") + " · Đã cập nhật JM ✓" });
  revalidatePath("/missing-source"); revalidatePath("/rc"); revalidatePath("/");
}
