export type CompanyCode = "PC49" | "Trans" | "HPLLC" | "3NVY" | "Other" | "TDW";

export type TxType =
  | "receipt" | "deposit" | "pick_up" | "extra_deposit"
  | "po" | "return" | "exchange" | "transfer" | "repair";

export type TxStatus =
  | "moi" | "dat_coc" | "dang_order" | "cho_giao" | "hoan_tat"
  | "cancel" | "return" | "exchange";

export type PayMethod = "cash" | "bank_wire" | "zelle" | "check" | "card";

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
  saleOnline?: string;
  transactionValue?: string;
  pctSupport?: number;

  oldReceiptNo?: string;
  depositDate?: string;
  bellCode?: string;
  trangThai: TxStatus;
  note?: string;

  lineItems: LineItem[];
  payments: Payment[];
}

// Dòng sao kê ngân hàng (THEO DÕI BANK)
export interface BankLine {
  id: string;
  company: CompanyCode;
  bankAccount?: string;
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
