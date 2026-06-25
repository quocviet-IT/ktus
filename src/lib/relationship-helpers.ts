import type { Account, BankLine, Transaction } from "./types";

export type AccountKind = "cash" | "bank";

export function accountBelongsToKind(account: Account | undefined, kind: AccountKind): boolean {
  if (!account) return false;
  const accountType = (account.accountType || "").toLowerCase();
  if (kind === "bank") return accountType.includes("bank");
  return accountType.includes("cash");
}

export function transactionBelongsToAccountKind(t: Transaction, kind: AccountKind, accounts: Account[]): boolean {
  if (t.accountId) {
    return accountBelongsToKind(accounts.find((a) => a.id === t.accountId), kind);
  }
  const legacy = (t.companyAccount || "").toLowerCase();
  return legacy.endsWith(kind);
}

export function bankLineBelongsToAccount(line: BankLine, account: Account): boolean {
  if (line.accountId) return line.accountId === account.id;
  return !!line.bankAccount && line.bankAccount === account.name;
}

export function accountDisplayName(account?: Account, fallback?: string): string {
  return account?.name || fallback || "";
}
