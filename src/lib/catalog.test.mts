import test from "node:test";
import assert from "node:assert/strict";
import {
  deleteCatalogItemInList,
  normalizeCatalogCode,
  upsertCatalogItemInList,
  visibleCatalogItems,
  type CatalogItem,
} from "./catalog.ts";

test("normalizeCatalogCode creates stable lookup codes", () => {
  assert.equal(normalizeCatalogCode("Bank Wire / ACH"), "bank_wire_ach");
  assert.equal(normalizeCatalogCode("  RC# 2  "), "rc_2");
});

test("upsertCatalogItemInList creates and edits catalog rows", () => {
  const rows: CatalogItem[] = [];
  const created = upsertCatalogItemInList(rows, { group: "source", label: "Walk In", sort: 10 });
  const edited = upsertCatalogItemInList(rows, { group: "source", code: created.code, label: "Walk-in", sort: 20 });

  assert.equal(created.code, "walk_in");
  assert.equal(edited.code, "walk_in");
  assert.equal(edited.label, "Walk-in");
  assert.equal(edited.sort, 20);
  assert.deepEqual(visibleCatalogItems(rows).map((row) => row.label), ["Walk-in"]);
});

test("deleteCatalogItemInList hides rows without removing their code history", () => {
  const rows: CatalogItem[] = [
    { group: "payment", code: "cash", label: "Cash", sort: 10, active: true },
  ];

  deleteCatalogItemInList(rows, "payment", "cash");

  assert.equal(rows[0].active, false);
  assert.equal(visibleCatalogItems(rows).length, 0);
});
