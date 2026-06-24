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
  pay: "cash" | "bank_wire" | "zelle" | "check" | "card";
  // dòng hàng (nhập riêng — gộp khi lưu)
  lines: { moTa: string; soLuong: number; donGia: number; giaNo?: string }[];
  // bước 2 (JM) — có thể bỏ trống
  rcJmNo?: string;
  source1?: string;
  sale1?: string;
  bellCode?: string;
}

// BR-07: gộp dòng & tự tính tổng → đổ vào A/R theo hình thức; BR-01 sẽ tự phân loại khi hiển thị
export async function createRc(input: RcInput) {
  const lineItems: LineItem[] = input.lines
    .filter((l) => l.moTa || l.donGia)
    .map((l, i) => ({ id: "li" + i, moTa: l.moTa, giaNo: l.giaNo, soLuong: Number(l.soLuong) || 0, donGia: Number(l.donGia) || 0 }));
  const tong = lineItems.reduce((s, l) => s + l.soLuong * l.donGia, 0);

  const ar = { arCash: 0, arBankwire: 0, arZelle: 0, arCheck: 0 };
  const isPO = input.type === "po" || input.type === "return" || input.type === "exchange";
  if (!isPO) {
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
    expense: isPO ? tong : 0, ...ar,
    rcJmNo: input.rcJmNo || "", source1: input.source1 || "", sale1: input.sale1,
    bellCode: input.bellCode, trangThai: input.type === "deposit" ? "dat_coc" : "hoan_tat",
    lineItems,
    payments: isPO ? [] : [{ id: "p0", ngay: input.ngay, soTien: tong, hinhThuc: input.pay, isDau: true }],
  });
  revalidatePath("/"); revalidatePath("/rc"); revalidatePath("/missing-source");
  redirect(`/rc/${rec.id}`);
}

export async function setStatus(id: string, s: TxStatus) {
  await dbSetStatus(id, s);
  revalidatePath("/rc"); revalidatePath(`/rc/${id}`); revalidatePath("/");
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
