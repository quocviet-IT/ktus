import type { Transaction, Computed, TxType, TxStatus } from "./types";

// BR-01 / BR-02 — phân loại CONDITION & tổng cộng (tự tính)
const RECEIPT_TYPES: TxType[] = ["receipt", "pick_up", "repair"];
const DEPOSIT_TYPES: TxType[] = ["deposit", "extra_deposit"];
const RETURN_TYPES: TxType[] = ["po", "return", "exchange"];

export function computeCondition(t: Pick<Transaction, "type" | "expense" | "arCash" | "arBankwire" | "arZelle" | "arCheck">): Computed {
  const ar = (t.arCash || 0) + (t.arBankwire || 0) + (t.arZelle || 0) + (t.arCheck || 0);
  const receipt = RECEIPT_TYPES.includes(t.type) ? ar : 0;
  const deposit = DEPOSIT_TYPES.includes(t.type) ? ar : 0;
  const returnPo = RETURN_TYPES.includes(t.type) ? (t.expense || 0) : 0;
  return { receipt, deposit, returnPo, tongCong: receipt + deposit - returnPo };
}

// BR-03 — thiếu nguồn
export function isMissingSource(t: Transaction): boolean {
  const s = (t.source1 || "").trim();
  return (s === "" || s === "Không có source") && t.trangThai !== "cancel";
}

// BR-05 — quy tắc mã JM: 9000=cọc, 1000=bán/pickup
export function jmKind(rc?: string): "deposit" | "sale" | "unknown" {
  if (!rc) return "unknown";
  if (rc.startsWith("9000") || rc.startsWith("9001") || rc.startsWith("900")) return "deposit";
  if (rc.startsWith("1000") || rc.startsWith("100")) return "sale";
  return "unknown";
}

// BR-08 — ngưỡng rung chuông (TẠM, cần chốt với người dùng)
export const BELL_THRESHOLD = 3000;
export function isBell(t: Transaction): boolean {
  const c = computeCondition(t);
  return !!t.bellCode || c.receipt >= BELL_THRESHOLD;
}

// BR-06 — tổng đã thu / còn thiếu
export function paidTotal(t: Transaction): number {
  const dau = t.payments.find((p) => p.isDau)?.soTien || t.payments[0]?.soTien || 0;
  const rest = t.payments.filter((p) => !p.isDau).reduce((s, p) => s + p.soTien, 0);
  return (t.payments.length ? dau + rest : 0);
}

export const TYPE_LABEL: Record<TxType, string> = {
  receipt: "Bán (Receipt)", deposit: "Đặt cọc", pick_up: "Pickup",
  extra_deposit: "Cọc thêm", po: "Mua vào (PO)", return: "Trả hàng",
  exchange: "Đổi hàng", transfer: "Chuyển", repair: "Sửa chữa",
};

export const STATUS_LABEL: Record<TxStatus, string> = {
  moi: "Mới", dat_coc: "Đặt cọc", dang_order: "Đang order", cho_giao: "Chờ giao",
  hoan_tat: "Hoàn tất", cancel: "Cancel", return: "Trả hàng", exchange: "Đổi hàng",
};

// màu badge trạng thái (theo ui-ux-skill §5)
export function statusClass(s: TxStatus): string {
  switch (s) {
    case "hoan_tat": return "bg-okSoft text-ok";
    case "cancel": return "bg-dangerSoft text-danger line-through";
    case "return": case "exchange": return "bg-accentSoft text-accent";
    default: return "bg-infoSoft text-[#3a5b8a]";
  }
}
