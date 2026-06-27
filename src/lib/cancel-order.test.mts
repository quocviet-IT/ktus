import test from "node:test";
import assert from "node:assert/strict";
import { buildCancelNote, isCancelDateValid, transactionMatchesOrderOrCancelDate } from "./cancel-order.ts";

test("buildCancelNote records cancel date and reason without changing the order date", () => {
  const note = buildCancelNote({
    existingNote: "Khach da coc",
    orderDate: "2026-06-20",
    cancelDate: "2026-06-26",
    reason: "Khach doi y",
    mode: "cancel",
  });

  assert.equal(note, "Khach da coc\n[CANCEL 2026-06-26] Khach doi y (order date: 2026-06-20)");
});

test("buildCancelNote replaces an older cancel line when user updates the reason", () => {
  const note = buildCancelNote({
    existingNote: "A\n[CANCEL 2026-06-24] Old reason (order date: 2026-06-20)",
    orderDate: "2026-06-20",
    cancelDate: "2026-06-26",
    reason: "New reason",
    mode: "void",
  });

  assert.equal(note, "A\n[VOID 2026-06-26] New reason (order date: 2026-06-20)");
});

test("isCancelDateValid rejects dates before the original order date", () => {
  assert.equal(isCancelDateValid("2026-06-25", "2026-06-23"), false);
  assert.equal(isCancelDateValid("2026-06-25", "2026-06-25"), true);
  assert.equal(isCancelDateValid("2026-06-25", "2026-06-27"), true);
});

test("transactionMatchesOrderOrCancelDate includes canceled orders by cancel date", () => {
  const row = {
    ngay: "2026-06-21",
    trangThai: "cancel",
    canceledAt: "2026-06-27",
  };

  assert.equal(transactionMatchesOrderOrCancelDate(row, "2026-06-21", "2026-06-21"), true);
  assert.equal(transactionMatchesOrderOrCancelDate(row, "2026-06-27", "2026-06-27"), true);
  assert.equal(transactionMatchesOrderOrCancelDate(row, "2026-06-26", "2026-06-26"), false);
});
