// Facade dữ liệu: chuyển giữa store (demo) và Supabase (thật) theo USE_DB.
import * as store from "./store";
import * as repo from "./db-repo";
import * as rcrepo from "./rc-repo";
import type { Transaction, TxStatus, BankLine, Account } from "./types";
import type { PaymentMethod } from "./payments";
import type { CatalogGroup, CatalogGroupKey, CatalogItem } from "./catalog";
import type { ExcelWorkbook, ExcelRow } from "./db-repo";

const USE_DB = process.env.USE_DB === "true";
// MẶC ĐỊNH chạy mô hình mới (rc_entries). Muốn tạm về dữ liệu cũ: đặt USE_RC_READS=false.
const USE_RC_READS = USE_DB && process.env.USE_RC_READS !== "false";

export async function listTransactions(opts?: { company?: string; status?: string; q?: string; from?: string; to?: string }): Promise<Transaction[]> {
  if (USE_RC_READS) return rcrepo.listTransactions(opts);
  return USE_DB ? repo.listTransactions(opts) : store.listTransactions(opts);
}
export async function listTransactionsPaged(
  opts: { company?: string; status?: string; q?: string; from?: string; to?: string },
  page: number, pageSize: number,
): Promise<{ rows: Transaction[]; total: number }> {
  if (USE_RC_READS) return rcrepo.listTransactionsPaged(opts, page, pageSize);
  return USE_DB ? repo.listTransactionsPaged(opts, page, pageSize) : store.listTransactionsPaged(opts, page, pageSize);
}
export async function getTransaction(id: string): Promise<Transaction | undefined> {
  if (USE_RC_READS) return rcrepo.getTransaction(id);
  return USE_DB ? repo.getTransaction(id) : store.getTransaction(id);
}
export async function findByJm(rc?: string): Promise<Transaction | undefined> {
  if (USE_RC_READS) return rcrepo.findByJm(rc);
  return USE_DB ? repo.findByJm(rc) : store.findByJm(rc);
}
export async function addTransaction(t: Omit<Transaction, "id">): Promise<Transaction> {
  if (USE_RC_READS) return rcrepo.addTransaction(t);
  return USE_DB ? repo.addTransaction(t) : store.addTransaction(t);
}
export async function updateTransaction(id: string, patch: Partial<Transaction>): Promise<void> {
  if (USE_RC_READS) { await rcrepo.updateTransaction(id, patch); return; }
  if (USE_DB) await repo.updateTransaction(id, patch);
  else store.updateTransaction(id, patch);
}
export async function setStatus(id: string, s: TxStatus): Promise<void> {
  if (USE_RC_READS) { await rcrepo.setStatus(id, s); return; }
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

export async function listCatalogGroups(): Promise<CatalogGroup[]> {
  return USE_DB ? repo.listCatalogGroups() : store.listCatalogGroups();
}
// Trang quản lý Danh mục: lấy cả mục đã TẮT để bật lại
export async function listCatalogGroupsManage(): Promise<CatalogGroup[]> {
  return USE_DB ? repo.listCatalogGroups(true) : store.listCatalogGroups(true);
}
export async function setCatalogActive(group: CatalogGroupKey, code: string, active: boolean): Promise<void> {
  if (USE_DB) await repo.setCatalogActive(group, code, active);
  else store.setCatalogActive(group, code, active);
}

export async function upsertCatalogItem(input: { group: CatalogGroupKey; code?: string; label: string; sort?: number; meta?: Record<string, string> }): Promise<CatalogItem> {
  return USE_DB ? repo.upsertCatalogItem(input) : store.upsertCatalogItem(input);
}

export async function deleteCatalogItem(group: CatalogGroupKey, code: string): Promise<void> {
  if (USE_DB) await repo.deleteCatalogItem(group, code);
  else store.deleteCatalogItem(group, code);
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

// Redesign: Deals / Bank / Reconciliation
export async function listDeals(): Promise<any[]> { return USE_DB ? repo.listDeals() : []; }
export async function listBankTransactions(opts?: { company?: string }): Promise<any[]> { return USE_DB ? repo.listBankTransactions(opts) : []; }
export async function listReconciliations(): Promise<any[]> { return USE_DB ? repo.listReconciliations() : []; }

export async function listExcelWorkbooks(): Promise<ExcelWorkbook[]> {
  return USE_DB ? repo.listExcelWorkbooks() : [];
}

export async function listExcelRows(opts?: { workbookId?: string; sheetId?: string; q?: string; page?: number; pageSize?: number }): Promise<{ rows: ExcelRow[]; count: number }> {
  return USE_DB ? repo.listExcelRows(opts) : { rows: [], count: 0 };
}
