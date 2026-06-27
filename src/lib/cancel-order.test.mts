import test from "node:test";
import assert from "node:assert/strict";
import { buildCancelNote } from "./cancel-order.ts";

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
