import test from "node:test";
import assert from "node:assert/strict";
import { summarizeDashboardRows, summarizeSalesDailyRows } from "./performance-summaries.ts";
import type { Transaction } from "./types.ts";

function tx(patch: Partial<Transaction>): Transaction {
  return {
    id: "id",
    ngay: "2026-01-01",
    company: "PC49",
    type: "receipt",
    dienGiai: "",
    khach: "",
    expense: 0,
    arCash: 0,
    arBankwire: 0,
    arZelle: 0,
    arCheck: 0,
    apCash: 0,
    apBankwire: 0,
    apZelle: 0,
    apCheck: 0,
    trangThai: "hoan_tat",
    lineItems: [],
    payments: [],
    ...patch,
  };
}

test("summarizeDashboardRows calculates revenue, missing source, and bell counts", () => {
  const summary = summarizeDashboardRows([
    tx({ id: "sale", type: "receipt", arCash: 3500, source1: "Facebook" }),
    tx({ id: "missing", type: "deposit", arZelle: 500, source1: "" }),
    tx({ id: "cancel-missing", type: "receipt", arCash: 1000, source1: "", trangThai: "cancel" }),
    tx({ id: "coded-bell", type: "receipt", arCash: 100, bellCode: "RC1", source1: "Walk-in" }),
  ]);

  assert.equal(summary.revenue, 4600);
  assert.equal(summary.totalCount, 4);
  assert.equal(summary.missingSourceCount, 1);
  assert.equal(summary.bellCount, 2);
});

test("summarizeSalesDailyRows totals only the rows needed for report summaries", () => {
  const summary = summarizeSalesDailyRows(
    [
      tx({ type: "receipt", arCash: 100, arZelle: 25 }),
      tx({ type: "deposit", arBankwire: 40 }),
      tx({ type: "po", apCash: 10, expense: 99 }),
    ],
    [{ code: "cash", label: "Cash" }, { code: "zelle", label: "Zelle" }],
  );

  assert.equal(summary.tongCong, 155);
  assert.equal(summary.purchasePo, 10);
  assert.equal(summary.receipt, 125);
  assert.equal(summary.deposit, 40);
  assert.deepEqual(summary.receivableByMethod, { cash: 100, zelle: 25 });
  assert.deepEqual(summary.payableByMethod, { cash: 10, zelle: 0 });
}
);
