import { computeCondition, STATUS_LABEL } from "./rules";
import { ddmmyyyy, num } from "./format";
import type { CompanyCode, Transaction } from "./types";

export const USBC101_COLUMNS = [
  "NO #",
  "DATE",
  "TYPE",
  "MA SKU",
  "DECRIPTION",
  "Cust. Name/ Check No",
  "CONTACT",
  "EXPENSE/ Purchase/ Trade In",
  "CONDITION Return/PO",
  "CONDITION RECEIPT",
  "CONDITION DEPOSIT",
  "CASH",
  "BANKWIRE",
  "ZELLE",
  "CHECK",
  "SO#",
  "Root Appt ID",
  "JM US RECEIPT N#",
  "SOURCE 1",
  "SOURCE 2",
  "SALE US",
  "SALE ONLINE",
  "% SUPPORT",
  "TRANSACTION VALUE",
];

export const RC_JM_COLUMNS_PC49 = [
  "NO #",
  "DATE",
  "DECRIPTION",
  "Cust. Name/ Check No",
  "EXPENSE/ Purchase/ Trade In",
  "RECEIPT",
  "DEPOSIT",
  "RECEIPT #",
  "SOURCE 1",
  "SOURCE 2",
  "SALE US",
  "SALE ONLINE",
  "% SUPPORT",
  "TRANSACTION VALUE",
  "RUNG CHUONG",
  "STATUS",
];

export const RC_JM_COLUMNS_TRANS = [
  "NO #",
  "DATE",
  "DECRIPTION",
  "SO#",
  "Cust. Name/ Check No",
  "EXPENSE/ Purchase/ Trade In",
  "RECEIPT",
  "DEPOSIT",
  "JM US RECEIPT N#",
  "OLD RECEIPT NUMBER",
  "SOURCE 1",
  "SOURCE 2",
  "SALE",
  "SALE ONLINE #1",
  "TRANSACTION VALUE",
  "% SUPPORT",
  "DEPOSIT DATE",
  "CONTACT",
  "SKU",
  "STATUS",
];

export function rcJmHeaders(company: CompanyCode | "all") {
  return company === "Trans" ? RC_JM_COLUMNS_TRANS : RC_JM_COLUMNS_PC49;
}

export function rcJmCells(t: Transaction, index: number, company: CompanyCode | "all") {
  const c = computeCondition(t);
  const base = {
    no: index + 1,
    date: ddmmyyyy(t.ngay),
    desc: t.dienGiai,
    customer: t.khach,
    expense: c.returnPo ? num(c.returnPo) : "",
    receipt: c.receipt ? num(c.receipt) : "",
    deposit: c.deposit ? num(c.deposit) : "",
    rc: t.rcJmNo || "",
    source1: t.source1 || "",
    source2: t.source2 || "",
    sale: t.sale1 || "",
    saleOnline: t.saleOnline || "",
    value: t.transactionValue || "",
    pct: t.pctSupport ?? "",
    status: STATUS_LABEL[t.trangThai],
  };

  if (company === "Trans") {
    return [
      base.no,
      base.date,
      base.desc,
      t.soNo || "",
      base.customer,
      base.expense,
      base.receipt,
      base.deposit,
      base.rc,
      t.oldReceiptNo || "",
      base.source1,
      base.source2,
      base.sale,
      base.saleOnline,
      base.value,
      base.pct,
      t.depositDate ? ddmmyyyy(t.depositDate) : "",
      t.contact || "",
      t.maSku || "",
      base.status,
    ];
  }

  return [
    base.no,
    base.date,
    base.desc,
    base.customer,
    base.expense,
    base.receipt,
    base.deposit,
    base.rc,
    base.source1,
    base.source2,
    base.sale,
    base.saleOnline,
    base.pct,
    base.value,
    t.bellCode || "",
    base.status,
  ];
}
