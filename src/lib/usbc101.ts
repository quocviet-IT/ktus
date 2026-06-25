import type { Transaction } from "./types";
import { computeCondition } from "./rules";
import type { Account } from "./types";
import { transactionBelongsToAccountKind } from "./relationship-helpers";

// Các công ty có sổ riêng trong USBC101 (như các sheet Excel)
export const USBC101_COMPANIES = ["Trans", "PC49", "TDW", "HPLLC", "3NVY", "Other"] as const;

// Tài khoản của mỗi công ty (cash/bank) — cho BALANCE ACCOUNT
export function companyAccounts(company: string): string[] {
  return [`${company} cash`, `${company} bank`];
}
export const ALL_ACCOUNTS: string[] = USBC101_COMPANIES.flatMap(companyAccounts);

export function arTotal(t: Transaction): number {
  return (t.arCash || 0) + (t.arBankwire || 0) + (t.arZelle || 0) + (t.arCheck || 0);
}
export function apTotal(t: Transaction): number {
  const ap = (t.apCash || 0) + (t.apBankwire || 0) + (t.apZelle || 0) + (t.apCheck || 0);
  // dữ liệu cũ chỉ có expense (PO) → coi như chi ra
  if (ap === 0 && (t.type === "po" || t.type === "return" || t.type === "exchange")) return t.expense || 0;
  return ap;
}
// Tiền ròng vào tài khoản của giao dịch (thu − chi)
export function netToAccount(t: Transaction): number {
  return arTotal(t) - apTotal(t);
}

export interface AccountBalance {
  account: string;
  company: string;
  kind: "cash" | "bank";
  inflow: number;
  outflow: number;
  balance: number;   // = inflow − outflow (số dư đầu kỳ = 0, có thể bổ sung sau)
}

// Tự tính số dư từng tài khoản từ danh sách giao dịch
export function computeBalances(rows: Transaction[], accounts: Account[] = []): AccountBalance[] {
  const map = new Map<string, AccountBalance>();
  const ensure = (acc: string) => {
    if (!map.has(acc)) {
      const kind = acc.toLowerCase().endsWith("bank") ? "bank" : "cash";
      const company = acc.replace(/ (cash|bank)$/i, "");
      map.set(acc, { account: acc, company, kind, inflow: 0, outflow: 0, balance: 0 });
    }
    return map.get(acc)!;
  };
  // luôn có sẵn các tài khoản chuẩn
  ALL_ACCOUNTS.forEach(ensure);

  for (const t of rows) {
    if (t.trangThai === "cancel") continue;
    const linked = t.accountId ? accounts.find((a) => a.id === t.accountId) : undefined;
    const acc = linked?.name || t.accountName || t.companyAccount || `${t.company} cash`;
    const b = ensure(acc);
    b.inflow += arTotal(t);
    b.outflow += apTotal(t);
  }
  for (const b of map.values()) b.balance = b.inflow - b.outflow;
  return [...map.values()].sort((a, b) => a.account.localeCompare(b.account));
}

// Cột sổ công ty USBC101 (bám layout Excel)
export const LEDGER_COLUMNS = [
  "No", "Date", "Type", "Decription", "Mã SKU", "Rung Chuông", "Customer name", "Contact",
  "Company", "Company account",
  "Return/PO", "Receipt", "Deposit",
  "A/R Cash", "A/R Bankwire", "A/R Zelle", "A/R Check",
  "A/P Cash", "A/P Bankwire", "A/P Zelle", "A/P Check",
];

export function isFx(col: string): boolean {
  return ["Return/PO", "Receipt", "Deposit"].includes(col);
}

export function ledgerCells(t: Transaction, index: number): (string | number)[] {
  const c = computeCondition(t);
  const v = (n: number) => (n ? n.toLocaleString("en-US") : "");
  return [
    index + 1,
    t.ngay.slice(5),
    t.type,
    t.dienGiai,
    t.maSku || "",
    t.bellCode || "",
    t.khach,
    t.contact || "",
    t.company,
    t.accountName || t.companyAccount || "",
    v(c.returnPo),
    v(c.receipt),
    v(c.deposit),
    v(t.arCash || 0), v(t.arBankwire || 0), v(t.arZelle || 0), v(t.arCheck || 0),
    v(t.apCash || 0), v(t.apBankwire || 0), v(t.apZelle || 0), v(t.apCheck || 0),
  ];
}

export function ledgerAccountFilter(t: Transaction, acc: "all" | "cash" | "bank", accounts: Account[]): boolean {
  if (acc === "all") return true;
  return transactionBelongsToAccountKind(t, acc, accounts);
}
