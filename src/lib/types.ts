export type CompanyCode = "PC49" | "Trans" | "HPLLC" | "3NVY" | "Other" | "TDW";

export type TxType =
  | "receipt" | "deposit" | "pick_up" | "extra_deposit"
  | "po" | "return" | "exchange" | "transfer" | "repair";

export type TxStatus =
  | "moi" | "dat_coc" | "dang_order" | "cho_giao" | "hoan_tat"
  | "cancel" | "return" | "exchange";

export type PayMethod = "cash" | "bank_wire" | "zelle" | "check" | "card";

export interface Lookup {
  id: string;
  grp: string;
  code: string;
  label: string;
  sort?: number;
  active?: boolean;
}

export interface LineItem {
  id: string;
  moTa: string;
  sku?: string;
  giaNo?: string;
  soLuong: number;
  donGia: number;
}

export interface Payment {
  id: string;
  ngay: string;
  soTien: number;
  hinhThuc?: PayMethod;
  nguoiXacNhan?: string;
  ghiChu?: string;
  isDau?: boolean;
  accountId?: string;
}

export interface TransactionSale {
  saleId: string;
  ten: string;
  kind?: "counter" | "online" | string;
  vaiTro?: string;
  tyLePct?: number;
}

export interface Transaction {
  id: string;
  ngay: string;            // YYYY-MM-DD
  company: CompanyCode;
  type: TxType;
  maSku?: string;
  dienGiai: string;
  khach: string;
  contact?: string;

  // tài khoản công ty (cash/bank) cho cân đối Balance Account
  companyAccount?: string;   // "PC49 cash" | "PC49 bank" | "Trans cash" ...

  // nhập tay A/R (thu tiền vào)
  expense: number;
  arCash: number;
  arBankwire: number;
  arZelle: number;
  arCheck: number;

  // A/P (chi tiền ra) — PO/mua vào/trả hàng
  apCash?: number;
  apBankwire?: number;
  apZelle?: number;
  apCheck?: number;

  // JM (bước 2)
  rcJmNo?: string;
  soNo?: string;
  apptId?: string;
  source1?: string;
  source2?: string;
  sale1?: string;
  sale2?: string;
  sale3?: string;
  sale1Pct?: number;        // tỷ lệ % phân bổ cho Sale #1
  sale2Pct?: number;        // tỷ lệ % phân bổ cho Sale #2
  sale3Pct?: number;        // tỷ lệ % phân bổ cho Sale #3
  saleOnline?: string;      // Sale Online #1
  saleOnline2?: string;
  saleOnline3?: string;
  transactionValue?: string;
  pctSupport?: number;      // % SUPPORT (mức hỗ trợ của sale online) — KHÁC tỷ lệ phân bổ
  orderTotal?: number;      // tổng tiền đơn hàng (để tính còn lại qua nhiều đợt)

  oldReceiptNo?: string;
  depositDate?: string;
  bellCode?: string;
  trangThai: TxStatus;
  note?: string;

  // Khoá ngoại (Phase 1) — DB tự nối qua trigger; đọc để dùng sau
  companyId?: number;
  companyName?: string;
  customerId?: string;
  accountId?: string;
  accountName?: string;
  accountType?: string;
  parentId?: string;
  source1LookupId?: string;
  source2LookupId?: string;
  bellCodeLookupId?: string;
  source1Label?: string;
  source2Label?: string;
  bellCodeLabel?: string;
  sales?: TransactionSale[];
  createdAt?: string;       // thứ tự nhập (sắp xếp báo cáo)

  lineItems: LineItem[];
  payments: Payment[];
}

// Tài khoản trong BALANCE ACCOUNT (chart of accounts)
export interface Account {
  id: string;
  entity: string;          // TRANS / PC49 / CL / AH / ...
  companyId?: number;
  code?: string;
  name: string;
  accountType?: string;    // Bank / Cash / CC / Loan / ...
  beginning: number;
  ending: number;
  sort?: number;
}

// Dòng sao kê ngân hàng (THEO DÕI BANK)
export interface BankLine {
  id: string;
  company: CompanyCode;
  companyId?: number;
  bankAccount?: string;
  accountId?: string;
  accountName?: string;
  ngay: string;          // YYYY-MM-DD
  description: string;
  category?: string;
  amount: number;        // + nạp vào / − rút ra
  matched: boolean;
  note?: string;
}

// Cột tự tính (BR-01/02)
export interface Computed {
  receipt: number;
  deposit: number;
  returnPo: number;
  tongCong: number;
}
