import test from "node:test";
import assert from "node:assert/strict";
import type { Account, BankLine, Transaction } from "./types.ts";
import {
  accountBelongsToKind,
  bankLineBelongsToAccount,
  transactionBelongsToAccountKind,
} from "./relationship-helpers.ts";

const bankAccount: Account = {
  id: "acc-bank",
  entity: "PC49",
  name: "121 - PC49 BoA CK 3388",
  accountType: "Bank",
  beginning: 0,
  ending: 0,
};

const cashAccount: Account = {
  id: "acc-cash",
  entity: "PC49",
  name: "PC49 CASH",
  accountType: "Cash",
  beginning: 0,
  ending: 0,
};

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "tx1",
    ngay: "2026-06-25",
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

test("accountBelongsToKind reads account_type case-insensitively", () => {
  assert.equal(accountBelongsToKind(bankAccount, "bank"), true);
  assert.equal(accountBelongsToKind(cashAccount, "bank"), false);
  assert.equal(accountBelongsToKind(cashAccount, "cash"), true);
});

test("transactionBelongsToAccountKind prefers account_id over legacy companyAccount text", () => {
  const rows = [bankAccount, cashAccount];
  const linkedBank = tx({ accountId: "acc-bank", companyAccount: "PC49 cash" });
  const linkedCash = tx({ accountId: "acc-cash", companyAccount: "PC49 bank" });

  assert.equal(transactionBelongsToAccountKind(linkedBank, "bank", rows), true);
  assert.equal(transactionBelongsToAccountKind(linkedBank, "cash", rows), false);
  assert.equal(transactionBelongsToAccountKind(linkedCash, "cash", rows), true);
});

test("transactionBelongsToAccountKind falls back to legacy text when no account_id exists", () => {
  assert.equal(transactionBelongsToAccountKind(tx({ companyAccount: "PC49 bank" }), "bank", []), true);
  assert.equal(transactionBelongsToAccountKind(tx({ companyAccount: "PC49 cash" }), "cash", []), true);
});

test("bankLineBelongsToAccount prefers account_id and falls back to bankAccount name", () => {
  const linked: BankLine = {
    id: "b1",
    company: "PC49",
    ngay: "2026-06-25",
    description: "wire",
    amount: 100,
    matched: false,
    accountId: "acc-bank",
    bankAccount: "wrong text",
  };
  const legacy: BankLine = { ...linked, id: "b2", accountId: undefined, bankAccount: bankAccount.name };

  assert.equal(bankLineBelongsToAccount(linked, bankAccount), true);
  assert.equal(bankLineBelongsToAccount(linked, cashAccount), false);
  assert.equal(bankLineBelongsToAccount(legacy, bankAccount), true);
});
