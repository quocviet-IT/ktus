import type { PaymentMethod } from "./payments.ts";
import type { Transaction } from "./types.ts";

const RECEIPT_TYPES = new Set(["receipt", "pick_up", "repair"]);
const DEPOSIT_TYPES = new Set(["deposit", "extra_deposit"]);
const RETURN_TYPES = new Set(["po", "return", "exchange"]);
const BELL_THRESHOLD = 3000;

export type DashboardSummary = {
  revenue: number;
  totalCount: number;
  missingSourceCount: number;
  bellCount: number;
};

export type SalesDailySummary = {
  tongCong: number;
  purchasePo: number;
  receipt: number;
  deposit: number;
  receivableByMethod: Record<string, number>;
  payableByMethod: Record<string, number>;
};

function currentPaymentTotal(transaction: Transaction, direction: "ar" | "ap") {
  const dynamic = (transaction.payments ?? [])
    .filter((payment) => (payment.direction ?? "ar") === direction && !payment.isDau)
    .reduce((sum, payment) => sum + (Number(payment.soTien) || 0), 0);
  if (dynamic) return dynamic;
  if (direction === "ar") {
    return (transaction.arCash || 0) + (transaction.arBankwire || 0) + (transaction.arZelle || 0) + (transaction.arCheck || 0);
  }
  return (transaction.apCash || 0) + (transaction.apBankwire || 0) + (transaction.apZelle || 0) + (transaction.apCheck || 0);
}

function amountByMethod(transaction: Transaction, methodCode: string, direction: "ar" | "ap") {
  const dynamic = (transaction.payments ?? [])
    .filter((payment) => (payment.direction ?? "ar") === direction && !payment.isDau && payment.hinhThuc === methodCode)
    .reduce((sum, payment) => sum + (Number(payment.soTien) || 0), 0);
  if (dynamic) return dynamic;
  const key = methodCode.toLowerCase().replace(/[_\s-]/g, "");
  if (direction === "ar") {
    if (key === "cash") return transaction.arCash || 0;
    if (key === "bankwire") return transaction.arBankwire || 0;
    if (key === "zelle") return transaction.arZelle || 0;
    if (key === "check") return transaction.arCheck || 0;
  } else {
    if (key === "cash") return transaction.apCash || 0;
    if (key === "bankwire") return transaction.apBankwire || 0;
    if (key === "zelle") return transaction.apZelle || 0;
    if (key === "check") return transaction.apCheck || 0;
  }
  return 0;
}

function condition(transaction: Transaction) {
  const ar = currentPaymentTotal(transaction, "ar");
  const receipt = RECEIPT_TYPES.has(transaction.type) ? ar : 0;
  const deposit = DEPOSIT_TYPES.has(transaction.type) ? ar : 0;
  const returnPo = RETURN_TYPES.has(transaction.type) ? (currentPaymentTotal(transaction, "ap") || transaction.expense || 0) : 0;
  return { receipt, deposit, returnPo, tongCong: receipt + deposit - returnPo };
}

export function summarizeDashboardRows(rows: Transaction[]): DashboardSummary {
  return rows.reduce<DashboardSummary>(
    (summary, transaction) => {
      const computed = condition(transaction);
      summary.revenue += computed.receipt;
      summary.totalCount += 1;
      const source = (transaction.source1 || "").trim();
      if ((!source || source === "KhÃ´ng cÃ³ source" || source === "Không có source") && transaction.trangThai !== "cancel") summary.missingSourceCount += 1;
      if (transaction.bellCode || computed.receipt >= BELL_THRESHOLD) summary.bellCount += 1;
      return summary;
    },
    { revenue: 0, totalCount: 0, missingSourceCount: 0, bellCount: 0 },
  );
}

export function summarizeSalesDailyRows(rows: Transaction[], paymentMethods: Pick<PaymentMethod, "code">[]): SalesDailySummary {
  const summary: SalesDailySummary = {
    tongCong: 0,
    purchasePo: 0,
    receipt: 0,
    deposit: 0,
    receivableByMethod: {},
    payableByMethod: {},
  };
  for (const method of paymentMethods) {
    summary.receivableByMethod[method.code] = 0;
    summary.payableByMethod[method.code] = 0;
  }

  for (const transaction of rows) {
    const computed = condition(transaction);
    summary.tongCong += computed.tongCong;
    summary.purchasePo += computed.returnPo;
    summary.receipt += computed.receipt;
    summary.deposit += computed.deposit;
    for (const method of paymentMethods) {
      summary.receivableByMethod[method.code] += amountByMethod(transaction, method.code, "ar");
      summary.payableByMethod[method.code] += amountByMethod(transaction, method.code, "ap");
    }
  }

  return summary;
}
