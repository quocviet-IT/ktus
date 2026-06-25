import test from "node:test";
import assert from "node:assert/strict";
import {
  isInternalTarget,
  isInternalNavigationTarget,
  shouldStartNavigationForClick,
} from "./navigation-progress.ts";

const origin = "https://ktus.local";

test("isInternalNavigationTarget accepts internal different path", () => {
  assert.equal(isInternalNavigationTarget("https://ktus.local/rc", "/usbc101", origin), true);
});

test("isInternalTarget accepts same-origin form actions", () => {
  assert.equal(isInternalTarget("/rc", origin), true);
  assert.equal(isInternalTarget("https://ktus.local/rc", origin), true);
  assert.equal(isInternalTarget("https://example.com/rc", origin), false);
});

test("isInternalNavigationTarget rejects same URL, hash-only, and external URLs", () => {
  assert.equal(isInternalNavigationTarget("https://ktus.local/rc", "/rc", origin), false);
  assert.equal(isInternalNavigationTarget("https://ktus.local/rc", "/rc#top", origin), false);
  assert.equal(isInternalNavigationTarget("https://ktus.local/rc", "https://example.com/rc", origin), false);
});

test("shouldStartNavigationForClick ignores modifier clicks and non-left clicks", () => {
  assert.equal(shouldStartNavigationForClick({ button: 0 }, "_self"), true);
  assert.equal(shouldStartNavigationForClick({ button: 1 }, "_self"), false);
  assert.equal(shouldStartNavigationForClick({ button: 0, metaKey: true }, "_self"), false);
  assert.equal(shouldStartNavigationForClick({ button: 0 }, "_blank"), false);
});
