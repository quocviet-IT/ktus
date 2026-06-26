import { computeCondition, jmKind, TYPE_LABEL } from "./rules";
import { ddmm } from "./format";
import type { CompanyCode, Transaction } from "./types";
import { currentAmountByPaymentMethod, listPaymentMethods, type PaymentMethod } from "./payments";

export type ReportCell = string | number;

export interface ReportTable {
  filename: string;
  sheetName: string;
  headers: string[];
  rows: ReportCell[][];
  totals?: ReportCell[];
}

export function buildSalesDailyTable(params: {
  transactions: Transaction[];
  company: CompanyCode;
  date: string;
  paymentMethods?: PaymentMethod[];
}): ReportTable {
  const paymentMethods = params.paymentMethods ?? listPaymentMethods();
  const rows = params.transactions.map((t, i) => {
    const c = computeCondition(t);
    return [
      i + 1,
      TYPE_LABEL[t.type],
      t.dienGiai,
      t.khach,
      c.tongCong || "",
      c.returnPo || "",
      c.receipt || "",
      c.deposit || "",
      ...paymentMethods.map((method) => currentAmountByPaymentMethod(t, method.code, "ar") || ""),
      ...paymentMethods.map((method) => currentAmountByPaymentMethod(t, method.code, "ap") || ""),
      t.company,
    ];
  });

  const totals = params.transactions.reduce(
    (sum, t) => {
      const c = computeCondition(t);
      sum.tongCong += c.tongCong;
      sum.returnPo += c.returnPo;
      sum.receipt += c.receipt;
      sum.deposit += c.deposit;
      return sum;
    },
    { tongCong: 0, returnPo: 0, receipt: 0, deposit: 0 },
  );

  const receiptLabel = params.company === "Trans" ? "TOTAL RECEIPT" : "RECEIPT (Ban ra)";
  const datePart = params.date === "all" ? "all" : params.date;

  return {
    filename: `sales-daily-${params.company}-${datePart}.xls`,
    sheetName: `Daily ${params.company}`,
    headers: [
      "STT",
      "TYPE",
      "DISCRIPTION",
      "CUSTOMER",
      "TONG CONG",
      "PURCHASE/PO",
      receiptLabel,
      "DEPOSIT",
      ...paymentMethods.map((method) => `AR ${method.label}`),
      ...paymentMethods.map((method) => `AP ${method.label}`),
      "COMPANY",
    ],
    rows,
    totals: [
      "TONG CONG",
      "",
      "",
      "",
      totals.tongCong,
      totals.returnPo,
      totals.receipt,
      totals.deposit,
      ...paymentMethods.map(() => ""),
      ...paymentMethods.map(() => ""),
      "",
    ],
  };
}

export function buildSalesOnlineTable(transactions: Transaction[]): ReportTable {
  const rows = transactions.map((t, i) => {
    const isDeposit = jmKind(t.rcJmNo) === "deposit";
    return [
      i + 1,
      ddmm(t.ngay),
      t.khach,
      t.source1 || "",
      t.dienGiai,
      isDeposit ? t.rcJmNo || "" : "",
      isDeposit ? "" : t.rcJmNo || "",
      t.sale1 || "",
      t.saleOnline || "",
      t.pctSupport ?? "",
      t.transactionValue || "",
    ];
  });

  return {
    filename: "sales-online.xls",
    sheetName: "Sales Online",
    headers: [
      "NO.",
      "DATE",
      "CUST. NAME",
      "FACEBOOK",
      "DECRIPTION",
      "JM US DEPOSIT#",
      "JM US RECEIPT N#",
      "SALE US",
      "Sale Onl #1",
      "% SUPPORT",
      "TRANSACTION VALUE",
    ],
    rows,
  };
}

function escapeHtml(value: ReportCell): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRow(cells: ReportCell[], tag: "td" | "th"): string {
  return `<tr>${cells.map((cell) => `<${tag}>${escapeHtml(cell)}</${tag}>`).join("")}</tr>`;
}

export function renderExcelHtml(table: ReportTable): string {
  const title = escapeHtml(table.sheetName);
  const totals = table.totals ? `<tfoot>${renderRow(table.totals, "td")}</tfoot>` : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
    th { background: #e9ecef; font-weight: bold; text-align: left; }
    th, td { border: 1px solid #888; padding: 4px 6px; white-space: nowrap; }
    tfoot td { background: #fff2cc; font-weight: bold; }
  </style>
</head>
<body>
  <h3>${title}</h3>
  <table>
    <thead>${renderRow(table.headers, "th")}</thead>
    <tbody>${table.rows.map((row) => renderRow(row, "td")).join("")}</tbody>
    ${totals}
  </table>
</body>
</html>`;
}
