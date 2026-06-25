import type { Account, Transaction, BankLine } from "./types";
import { arTotal, apTotal } from "./usbc101";

export interface Mv { date: string; amount: number; }

// Biến động của 1 tài khoản:
//  - dòng sao kê có bankAccount trùng tên tài khoản
//  - nếu là tài khoản CASH của công ty: cộng net giao dịch có companyAccount = "<entity> cash"
export function accountMovements(a: Account, txs: Transaction[], banks: BankLine[]): Mv[] {
  const mv: Mv[] = [];
  for (const b of banks) if (b.bankAccount && b.bankAccount === a.name) mv.push({ date: b.ngay, amount: b.amount });
  if ((a.accountType || "").toLowerCase() === "cash") {
    const acc = `${a.entity} cash`.toLowerCase();
    for (const t of txs) {
      if (t.trangThai === "cancel") continue;
      if ((t.companyAccount || "").toLowerCase() === acc) mv.push({ date: t.ngay, amount: arTotal(t) - apTotal(t) });
    }
  }
  return mv;
}

export function balanceAsOf(a: Account, mv: Mv[], asof?: string): number {
  let s = a.beginning;
  for (const m of mv) if (!asof || m.date <= asof) s += m.amount;
  return s;
}

// Tổng số dư toàn hệ thống cuối mỗi tháng trong năm (cho biểu đồ)
export function monthlyGrand(accounts: Account[], txs: Transaction[], banks: BankLine[], year: number): { label: string; value: number }[] {
  const allMv: Mv[] = [];
  for (const a of accounts) allMv.push(...accountMovements(a, txs, banks));
  const grandBeg = accounts.reduce((s, a) => s + a.beginning, 0);
  const out: { label: string; value: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const end = `${year}-${String(m).padStart(2, "0")}-31`;
    const moved = allMv.reduce((s, x) => (x.date <= end ? s + x.amount : s), 0);
    out.push({ label: String(m).padStart(2, "0"), value: grandBeg + moved });
  }
  return out;
}
