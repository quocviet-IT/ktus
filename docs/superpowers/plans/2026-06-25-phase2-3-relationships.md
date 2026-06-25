# Phase 2/3 Relationships Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 2/3 relationship migration and FK-first read behavior without removing legacy columns.

**Architecture:** Add relational DB objects and triggers, then make the app read enriched relationship data opportunistically. Keep compatibility fallbacks for Supabase instances that have not run the new SQL yet.

**Tech Stack:** Next.js App Router, TypeScript, Supabase PostgreSQL, Node test runner.

---

### Task 1: Relationship Helpers

**Files:**
- Create: `src/lib/relationship-helpers.ts`
- Test: `src/lib/relationship-helpers.test.mts`

- [x] **Step 1: Write failing tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { accountBelongsToKind, bankLineBelongsToAccount, transactionBelongsToAccountKind } from "./relationship-helpers.ts";
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types src/lib/relationship-helpers.test.mts`

- [x] **Step 3: Write minimal implementation**

Implement account kind matching by `accountId` first, then legacy account text fallback.

- [x] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types src/lib/relationship-helpers.test.mts`

### Task 2: Phase 2/3 SQL

**Files:**
- Create: `supabase/migration-phase2-3.sql`
- Modify: `docs/ERD.md`

- [x] Add `lookups`, transaction lookup FK columns, `company_aliases`, `transaction_sales`, and `payments.account_id`.
- [x] Backfill from text columns.
- [x] Replace relationship trigger logic so new inserts keep FK columns and junction rows synced.
- [x] Add `v_transactions_enriched` and `v_account_movements` for FK-first reads and reconciliation checks.

### Task 3: App Read Model

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db-repo.ts`
- Modify: `src/lib/balance-daily.ts`
- Modify: `src/lib/usbc101.ts`
- Modify: `src/app/usbc101/page.tsx`

- [x] Add relationship fields to app types.
- [x] Enrich transactions and bank lines from related tables when available.
- [x] Prefer `account_id`/account type in balance and ledger matching.
- [x] Keep old text behavior as fallback.

### Task 4: Verification

**Files:**
- Verify all touched TypeScript.

- [x] Run helper tests.
- [x] Run `npx tsc --noEmit`.
