// Facade dữ liệu: chuyển giữa store (demo) và Supabase (thật) theo USE_DB.
import * as store from "./store";
import * as repo from "./db-repo";
import type { Transaction, TxStatus, BankLine, Account } from "./types";
import type { PaymentMethod } from "./payments";
import type { ExcelWorkbook, ExcelRow } from "./db-repo";

const USE_DB = process.env.USE_DB === "true";

export async function listTransactions(opts?: { company?: string; status?: string; q?: string; from?: string; to?: string }): Promise<Transaction[]> {
  return USE_DB ? repo.listTransactions(opts) : store.listTransactions(opts);
}
export async function listTransactionsPaged(
  opts: { company?: string; status?: string; q?: string; from?: string; to?: string },
  page: number, pageSize: number,
): Promise<{ rows: Transaction[]; total: number }> {
  return USE_DB ? repo.listTransactionsPaged(opts, page, pageSize) : store.listTransactionsPaged(opts, page, pageSize);
}
export async function getTransaction(id: string): Promise<Transaction | undefined> {
  return USE_DB ? repo.getTransaction(id) : store.getTransaction(id);
}
export async function findByJm(rc?: string): Promise<Transaction | undefined> {
  return USE_DB ? repo.findByJm(rc) : store.findByJm(rc);
}
export async function addTransaction(t: Omit<Transaction, "id">): Promise<Transaction> {
  return USE_DB ? repo.addTransaction(t) : store.addTransaction(t);
}
export async function updateTransaction(id: string, patch: Partial<Transaction>): Promise<void> {
  if (USE_DB) await repo.updateTransaction(id, patch);
  else store.updateTransaction(id, patch);
}
export async function setStatus(id: string, s: TxStatus): Promise<void> {
  if (USE_DB) await repo.setStatus(id, s);
  else store.setStatus(id, s);
}

// Chart of accounts (BALANCE ACCOUNT)
export async function listAccounts(): Promise<Account[]> {
  return USE_DB ? repo.listAccounts() : store.listAccounts();
}

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  return USE_DB ? repo.listPaymentMethods() : store.PAYMENT_METHODS();
}

export async function addPaymentMethod(label: string): Promise<PaymentMethod> {
  return USE_DB ? repo.addPaymentMethod(label) : store.addPaymentMethod(label);
}

// Sao kê ngân hàng
export async function listBankLines(opts?: { company?: string; from?: string; to?: string }): Promise<BankLine[]> {
  return USE_DB ? repo.listBankLines(opts) : store.listBankLines(opts);
}
export async function addBankLine(b: Omit<BankLine, "id">): Promise<void> {
  if (USE_DB) await repo.addBankLine(b); else store.addBankLine(b);
}
export async function setBankMatched(id: string, matched: boolean): Promise<void> {
  if (USE_DB) await repo.setBankMatched(id, matched); else store.setBankMatched(id, matched);
}

export async function listExcelWorkbooks(): Promise<ExcelWorkbook[]> {
  return USE_DB ? repo.listExcelWorkbooks() : [];
}

export async function listExcelRows(opts?: { workbookId?: string; sheetId?: string; q?: string; page?: number; pageSize?: number }): Promise<{ rows: ExcelRow[]; count: number }> {
  return USE_DB ? repo.listExcelRows(opts) : { rows: [], count: 0 };
}
