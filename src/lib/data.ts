// Facade dữ liệu: chuyển giữa store (demo) và Supabase (thật) theo USE_DB.
import * as store from "./store";
import * as repo from "./db-repo";
import type { Transaction, TxStatus } from "./types";
import type { ExcelWorkbook, ExcelRow } from "./db-repo";

const USE_DB = process.env.USE_DB === "true";

export async function listTransactions(opts?: { company?: string; status?: string; q?: string; from?: string; to?: string }): Promise<Transaction[]> {
  return USE_DB ? repo.listTransactions(opts) : store.listTransactions(opts);
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

export async function listExcelWorkbooks(): Promise<ExcelWorkbook[]> {
  return USE_DB ? repo.listExcelWorkbooks() : [];
}

export async function listExcelRows(opts?: { workbookId?: string; sheetId?: string; q?: string; page?: number; pageSize?: number }): Promise<{ rows: ExcelRow[]; count: number }> {
  return USE_DB ? repo.listExcelRows(opts) : { rows: [], count: 0 };
}
