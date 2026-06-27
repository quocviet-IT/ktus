import type { Transaction, TxStatus } from "./types";
import type { PaymentMethod } from "./payments";
import { transactionMatchesOrderOrCancelDate } from "./cancel-order";
import {
  buildCatalogGroups,
  DEFAULT_CATALOG_ITEMS,
  deleteCatalogItemInList,
  upsertCatalogItemInList,
  type CatalogGroup,
  type CatalogGroupKey,
  type CatalogItem,
} from "./catalog";

// ===== Danh mục dùng chung (FR-CAT) =====
export const SOURCES = ["WI", "TEL", "FB", "IG-APPT", "RF-APPT", "RC", "VIP"];
export const COMPANIES = ["PC49", "Trans", "HPLLC", "3NVY", "Other", "TDW"] as const;
export const SALES = ["T.Vân", "B.Khanh", "S.Mai", "N.Ý", "T.Quỳnh"];
export const SALES_ONLINE = ["Văn Vương US", "Mạnh Thắng US", "Trà My US", "Kim Thanh US"];
export const BELL_CODES = ["RC1", "RC2", "RC3", "SBO1"];
export const PAYMENT_METHODS = () => listCatalogGroups()
  .find((group) => group.key === "payment")!
  .items.map((item): PaymentMethod => ({ code: item.code, label: item.label, sort: item.sort, active: item.active }));
export function addPaymentMethod(label: string): PaymentMethod {
  const item = upsertCatalogItem({ group: "payment", label });
  return { code: item.code, label: item.label, sort: item.sort, active: item.active };
}

let _id = 100;
const nid = () => "t" + ++_id;

// ===== Seed giống dữ liệu Excel thật =====
function seed(): Transaction[] {
  return [
    {
      id: "tx-travis-coc", ngay: "2025-02-10", company: "Trans", type: "deposit",
      maSku: "DRIMT", dienGiai: "Đặt cọc nhẫn KC 3.04ct + ổ 18K Hidden Halo",
      khach: "Travis & Jasmin", contact: "251-442-1392",
      expense: 0, arCash: 0, arBankwire: 0, arZelle: 25, arCheck: 0,
      rcJmNo: "9000025890", soNo: "25.8903", apptId: "AP-20250221-001",
      source1: "RF-APPT", sale1: "T.Vân", trangThai: "dang_order",
      note: "KThy confirmed OK. Tổng đơn $5,200",
      lineItems: [
        { id: "li1", moTa: "Lab Diamond 3.04ct Radiant, H/VS1", giaNo: "627473694", soLuong: 1, donGia: 3700 },
        { id: "li2", moTa: "18K Hidden Halo Engagement Ring Setting", soLuong: 1, donGia: 1400 },
      ],
      payments: [
        { id: "p1", ngay: "2025-02-10", soTien: 25, hinhThuc: "zelle", isDau: true },
        { id: "p2", ngay: "2025-02-27", soTien: 700, hinhThuc: "card", nguoiXacNhan: "KThy" },
        { id: "p3", ngay: "2025-03-20", soTien: 510, hinhThuc: "zelle" },
        { id: "p4", ngay: "2025-05-27", soTien: 371, hinhThuc: "zelle" },
        { id: "p5", ngay: "2025-07-19", soTien: 500, hinhThuc: "zelle" },
        { id: "p6", ngay: "2025-07-19", soTien: -100, ghiChu: "OFF refer-a-friend" },
        { id: "p7", ngay: "2025-09-04", soTien: 1200, hinhThuc: "zelle" },
        { id: "p8", ngay: "2026-01-12", soTien: 700, hinhThuc: "zelle" },
        { id: "p9", ngay: "2026-01-22", soTien: 1119, hinhThuc: "zelle" },
      ],
    },
    {
      id: "tx-travis-pickup", ngay: "2026-03-04", company: "Trans", type: "pick_up",
      maSku: "DRIMT", dienGiai: "Pickup nhẫn KC 3.04ct (đơn 25.8903)",
      khach: "Travis & Jasmin", contact: "251-442-1392",
      expense: 0, arCash: 0, arBankwire: 0, arZelle: 1844, arCheck: 0,
      rcJmNo: "1000083600", source1: "RF-APPT", sale1: "T.Vân",
      oldReceiptNo: "9000025890", depositDate: "2025-02-10", bellCode: "RC2",
      trangThai: "hoan_tat", lineItems: [], payments: [],
    },
    {
      id: nid(), ngay: "2026-06-22", company: "PC49", type: "receipt",
      maSku: "VRP", dienGiai: "Khách mua 1L VRP", khach: "Chị Thủy Cù",
      expense: 0, arCash: 5310, arBankwire: 0, arZelle: 0, arCheck: 0,
      rcJmNo: "1000012438", source1: "WI", sale1: "S.Mai", bellCode: "RC2",
      trangThai: "hoan_tat",
      lineItems: [{ id: "l", moTa: "Vàng ròng VRP 1 lượng", soLuong: 1, donGia: 5310 }],
      payments: [{ id: "p", ngay: "2026-06-22", soTien: 5310, hinhThuc: "cash", isDau: true }],
    },
    {
      id: nid(), ngay: "2026-06-21", company: "PC49", type: "receipt",
      maSku: "VRP", dienGiai: "Khách mua 3L VRP", khach: "Nhung Cai",
      expense: 0, arCash: 0, arBankwire: 16935, arZelle: 0, arCheck: 0,
      rcJmNo: "1000012394", source1: "TEL", sale1: "N.Ý", saleOnline: "Văn Vương US",
      transactionValue: "3 lượng", pctSupport: 0.8, bellCode: "SBO1", trangThai: "hoan_tat",
      lineItems: [{ id: "l", moTa: "Vàng ròng VRP 3 lượng", soLuong: 3, donGia: 5645 }],
      payments: [{ id: "p", ngay: "2026-06-21", soTien: 16935, hinhThuc: "bank_wire", isDau: true }],
    },
    {
      id: nid(), ngay: "2026-06-21", company: "PC49", type: "receipt",
      maSku: "VRP", dienGiai: "Khách mua 1L VRP", khach: "Thi Nguyen",
      expense: 0, arCash: 5770, arBankwire: 0, arZelle: 0, arCheck: 0,
      rcJmNo: "1000012395", source1: "", sale1: "T.Vân", bellCode: "RC2", // thiếu nguồn
      trangThai: "hoan_tat",
      lineItems: [{ id: "l", moTa: "Vàng ròng VRP 1 lượng", soLuong: 1, donGia: 5770 }],
      payments: [{ id: "p", ngay: "2026-06-21", soTien: 5770, hinhThuc: "cash", isDau: true }],
    },
    {
      id: nid(), ngay: "2026-06-20", company: "PC49", type: "po",
      maSku: "16k", dienGiai: "Mua vào 6.5gr vàng 16k", khach: "Chị Loan",
      expense: 425, arCash: 0, arBankwire: 0, arZelle: 0, arCheck: 0,
      rcJmNo: "", source1: "WI", sale1: "S.Mai", trangThai: "hoan_tat",
      lineItems: [{ id: "l", moTa: "Vàng 16k 6.5gr", soLuong: 6.5, donGia: 65.38 }],
      payments: [],
    },
    {
      id: nid(), ngay: "2026-06-23", company: "Trans", type: "deposit",
      maSku: "24KRI", dienGiai: "Khách đặt cọc 01 (24KRI) nhẫn trơn 24K", khach: "Chi Hanh",
      contact: "669-321-9393",
      expense: 0, arCash: 546, arBankwire: 0, arZelle: 0, arCheck: 0,
      rcJmNo: "90014223", source1: "", sale1: "B.Khanh", trangThai: "dat_coc", // thiếu nguồn
      lineItems: [{ id: "l", moTa: "Nhẫn trơn 24K", soLuong: 1, donGia: 546 }],
      payments: [{ id: "p", ngay: "2026-06-23", soTien: 546, hinhThuc: "cash", isDau: true }],
    },
    {
      id: nid(), ngay: "2026-06-19", company: "Trans", type: "exchange",
      maSku: "18KRI", dienGiai: "Khách đổi 01 (18KRI) — đơn cancel demo", khach: "Anh Khoa",
      expense: 0, arCash: 0, arBankwire: 0, arZelle: 0, arCheck: 0,
      rcJmNo: "1000083700", source1: "FB", sale1: "T.Quỳnh", trangThai: "cancel",
      lineItems: [], payments: [],
    },
  ];
}

// state tồn tại qua HMR ở dev
// gán Company account mặc định (cash/bank) cho dữ liệu mẫu
function withAccount(t: Transaction): Transaction {
  if (t.companyAccount) return t;
  const bank = (t.arBankwire || 0) > 0 || (t.arCheck || 0) > 0;
  return { ...t, companyAccount: `${t.company} ${bank ? "bank" : "cash"}` };
}

const g = globalThis as any;
if (!g.__KTUS_TX) g.__KTUS_TX = seed().map(withAccount);
const TX: Transaction[] = g.__KTUS_TX;
if (!g.__KTUS_CATALOG) g.__KTUS_CATALOG = DEFAULT_CATALOG_ITEMS.map((item) => ({ ...item, meta: item.meta ? { ...item.meta } : undefined }));
const CATALOG: CatalogItem[] = g.__KTUS_CATALOG;

// ===== API store =====
export function listTransactions(opts?: { company?: string; status?: string; q?: string; from?: string; to?: string }): Transaction[] {
  let rows = [...TX].sort((a, b) => (a.ngay < b.ngay ? 1 : -1));
  if (opts?.company && opts.company !== "all") rows = rows.filter((r) => r.company === opts.company);
  if (opts?.status && opts.status !== "all") rows = rows.filter((r) => r.trangThai === opts.status);
  if (opts?.from || opts?.to) rows = rows.filter((r) => transactionMatchesOrderOrCancelDate(r, opts.from, opts.to));
  if (opts?.q) {
    const q = opts.q.toLowerCase();
    rows = rows.filter((r) => (r.rcJmNo || "").toLowerCase().includes(q) || r.khach.toLowerCase().includes(q) || r.dienGiai.toLowerCase().includes(q));
  }
  return rows;
}
export function listTransactionsPaged(opts: { company?: string; status?: string; q?: string; from?: string; to?: string; sort?: "newest" | "oldest" }, page: number, pageSize: number) {
  const all = listTransactions(opts).sort((a, b) => opts.sort === "oldest" ? a.ngay.localeCompare(b.ngay) : b.ngay.localeCompare(a.ngay));
  const start = (Math.max(1, page) - 1) * pageSize;
  return { rows: all.slice(start, start + pageSize), total: all.length };
}
export function getTransaction(id: string) { return TX.find((t) => t.id === id); }
export function findByJm(rc?: string) { return rc ? TX.find((t) => t.rcJmNo === rc) : undefined; }

export function addTransaction(t: Omit<Transaction, "id">): Transaction {
  const rec: Transaction = { ...t, id: nid() };
  TX.unshift(rec);
  return rec;
}
export function updateTransaction(id: string, patch: Partial<Transaction>) {
  const i = TX.findIndex((t) => t.id === id);
  if (i >= 0) TX[i] = { ...TX[i], ...patch };
  return TX[i];
}
export function setStatus(id: string, s: TxStatus) { return updateTransaction(id, { trangThai: s }); }

export function listCatalogGroups(includeInactive = false): CatalogGroup[] { return buildCatalogGroups(CATALOG, includeInactive); }
export function upsertCatalogItem(input: { group: CatalogGroupKey; code?: string; label: string; sort?: number; meta?: Record<string, string> }): CatalogItem {
  return upsertCatalogItemInList(CATALOG, input);
}
export function deleteCatalogItem(group: CatalogGroupKey, code: string): void {
  deleteCatalogItemInList(CATALOG, group, code);
}
export function setCatalogActive(group: CatalogGroupKey, code: string, active: boolean): void {
  const item = CATALOG.find((i) => i.group === group && i.code === code);
  if (item) item.active = active;
  else CATALOG.push({ group, code, label: code, sort: 0, active });
}

// ===== Chart of accounts (BALANCE ACCOUNT) =====
import type { Account } from "./types";
import { ACCOUNTS_SEED } from "./accounts-seed";
const ACCOUNTS: Account[] = ACCOUNTS_SEED.map((a, i) => ({ ...a, id: "acc" + i }));
export function listAccounts(): Account[] { return ACCOUNTS; }

// ===== Sao kê ngân hàng (in-memory) =====
import type { BankLine } from "./types";
function seedBank(): BankLine[] {
  return [
    { id: "b1", company: "Trans", bankAccount: "004 - TFJ WF CK 7012", ngay: "2026-01-02", description: "BANKCARD DEPOSIT -0485222122", category: "BANKCARD DEPOSIT", amount: 1210, matched: false },
    { id: "b2", company: "Trans", bankAccount: "004 - TFJ WF CK 7012", ngay: "2026-01-02", description: "BUSINESS TO BUSINESS ACH SYNCHRONY BANK MTOT DEP", category: "ACH", amount: 3500, matched: false },
    { id: "b3", company: "Trans", bankAccount: "004 - TFJ WF CK 7012", ngay: "2026-01-02", description: "CHECK", category: "CHECK", amount: -40, matched: false },
    { id: "b4", company: "PC49", bankAccount: "PC49 Chase", ngay: "2026-06-21", description: "BANKWIRE IN — Nhung Cai 3L VRP", category: "BANK WIRE", amount: 16935, matched: false },
    { id: "b5", company: "PC49", bankAccount: "PC49 Chase", ngay: "2026-06-20", description: "BANKCARD DEPOSIT -0485222122", category: "BANKCARD DEPOSIT", amount: 2140, matched: false },
  ];
}
if (!g.__KTUS_BANK) g.__KTUS_BANK = seedBank();
const BANK: BankLine[] = g.__KTUS_BANK;
let _bid = 100;

export function listBankLines(opts?: { company?: string; from?: string; to?: string }): BankLine[] {
  let rows = [...BANK].sort((a, b) => (a.ngay < b.ngay ? 1 : -1));
  if (opts?.company && opts.company !== "all") rows = rows.filter((r) => r.company === opts.company);
  if (opts?.from) rows = rows.filter((r) => r.ngay >= opts.from!);
  if (opts?.to) rows = rows.filter((r) => r.ngay <= opts.to!);
  return rows;
}
export function addBankLine(b: Omit<BankLine, "id">): BankLine {
  const rec = { ...b, id: "b" + ++_bid };
  BANK.unshift(rec);
  return rec;
}
export function setBankMatched(id: string, matched: boolean) {
  const i = BANK.findIndex((x) => x.id === id);
  if (i >= 0) BANK[i] = { ...BANK[i], matched };
}
