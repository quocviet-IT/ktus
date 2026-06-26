import test from "node:test";
import assert from "node:assert/strict";
import type { Transaction } from "./types.ts";
import {
  addPaymentMethod,
  amountByPaymentMethod,
  currentPaymentTotal,
  listPaymentMethods,
  paymentTotal,
} from "./payments.ts";

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "tx-pay",
    ngay: "2026-06-26",
    company: "PC49",
    type: "receipt",
    dienGiai: "test",
    khach: "A",
    expense: 0,
    arCash: 0,
    arBankwire: 0,
    arZelle: 0,
    arCheck: 0,
    trangThai: "hoan_tat",
    lineItems: [],
    payments: [],
    ...overrides,
  };
}

test("addPaymentMethod makes a new active method available to RC inputs", () => {
  const method = addPaymentMethod("Venmo");

  assert.equal(method.code, "venmo");
  assert.equal(method.label, "Venmo");
  assert.equal(listPaymentMethods().some((m) => m.code === "venmo" && m.label === "Venmo"), true);
});

test("amountByPaymentMethod totals dynamic payment rows by method", () => {
  const row = tx({
    payments: [
      { id: "p1", ngay: "2026-06-26", soTien: 100, hinhThuc: "cash", isDau: true },
      { id: "p2", ngay: "2026-06-26", soTien: 25, hinhThuc: "venmo" },
      { id: "p3", ngay: "2026-06-26", soTien: 40, hinhThuc: "venmo" },
    ],
  });

  assert.equal(amountByPaymentMethod(row, "cash", "ar"), 100);
  assert.equal(amountByPaymentMethod(row, "venmo", "ar"), 65);
  assert.equal(paymentTotal(row, "ar"), 165);
});

test("amountByPaymentMethod falls back to legacy AR and AP columns", () => {
  const legacyAr = tx({ arCash: 10, arBankwire: 20, arZelle: 30, arCheck: 40 });
  const legacyAp = tx({
    type: "po",
    expense: 99,
    apCash: 11,
    apBankwire: 22,
    apZelle: 33,
    apCheck: 44,
  });

  assert.equal(amountByPaymentMethod(legacyAr, "bank_wire", "ar"), 20);
  assert.equal(paymentTotal(legacyAr, "ar"), 100);
  assert.equal(amountByPaymentMethod(legacyAp, "check", "ap"), 44);
  assert.equal(paymentTotal(legacyAp, "ap"), 110);
});

test("currentPaymentTotal counts only first-payment AR rows when later payments exist", () => {
  const row = tx({
    payments: [
      { id: "p1", ngay: "2026-06-26", soTien: 100, hinhThuc: "cash", direction: "ar", isDau: true },
      { id: "p2", ngay: "2026-06-26", soTien: 50, hinhThuc: "venmo", direction: "ar", isDau: true },
      { id: "p3", ngay: "2026-07-01", soTien: 20, hinhThuc: "cash", direction: "ar" },
    ],
  });

  assert.equal(currentPaymentTotal(row, "ar"), 150);
  assert.equal(paymentTotal(row, "ar"), 170);
});
