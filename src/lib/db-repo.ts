import { sb } from "./supabase-server";
import type { Transaction, TxStatus, LineItem, Payment } from "./types";

const N = (v: any) => (v == null ? 0 : Number(v));

function rowToTx(r: any): Transaction {
  return {
    id: r.id, ngay: r.ngay, company: r.company, type: r.type,
    maSku: r.ma_sku ?? undefined, dienGiai: r.dien_giai ?? "", khach: r.khach, contact: r.contact ?? undefined,
    expense: N(r.expense), arCash: N(r.ar_cash), arBankwire: N(r.ar_bankwire), arZelle: N(r.ar_zelle), arCheck: N(r.ar_check),
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

export async function listTransactions(opts?: { company?: string; status?: string; q?: string }): Promise<Transaction[]> {
  let query = sb().from("transactions").select(SELECT).order("ngay", { ascending: false });
  if (opts?.company && opts.company !== "all") query = query.eq("company", opts.company);
  if (opts?.status && opts.status !== "all") query = query.eq("trang_thai", opts.status);
  if (opts?.q) query = query.or(`rc_jm_no.ilike.%${opts.q}%,khach.ilike.%${opts.q}%,dien_giai.ilike.%${opts.q}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToTx);
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
    khach: t.khach, contact: t.contact, expense: t.expense,
    ar_cash: t.arCash, ar_bankwire: t.arBankwire, ar_zelle: t.arZelle, ar_check: t.arCheck,
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
  if (patch.source1 !== undefined) map.source_1 = patch.source1;
  if (patch.note !== undefined) map.note = patch.note;
  if (patch.trangThai !== undefined) map.trang_thai = patch.trangThai;
  if (patch.bellCode !== undefined) map.bell_code = patch.bellCode;
  if (Object.keys(map).length) await sb().from("transactions").update(map).eq("id", id);
}

export async function setStatus(id: string, s: TxStatus) {
  await sb().from("transactions").update({ trang_thai: s }).eq("id", id);
}
