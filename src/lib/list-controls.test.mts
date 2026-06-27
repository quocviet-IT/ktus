import test from "node:test";
import assert from "node:assert/strict";
import { normalizePageSize, normalizeSortDir, pageOffset } from "./list-controls.ts";

test("normalizePageSize accepts only ERP page-size choices", () => {
  assert.equal(normalizePageSize("20"), 20);
  assert.equal(normalizePageSize("50"), 50);
  assert.equal(normalizePageSize("100"), 100);
  assert.equal(normalizePageSize("999"), 20);
  assert.equal(normalizePageSize(undefined), 20);
});

test("normalizeSortDir maps newest and oldest to database order", () => {
  assert.equal(normalizeSortDir("oldest"), "oldest");
  assert.equal(normalizeSortDir("newest"), "newest");
  assert.equal(normalizeSortDir(undefined), "newest");
});

test("pageOffset clamps invalid pages to the first page", () => {
  assert.equal(pageOffset("abc", 20), 0);
  assert.equal(pageOffset("0", 20), 0);
  assert.equal(pageOffset("3", 20), 40);
});
