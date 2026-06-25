# Phase 2/3 Relationships Design

## Goal
Complete the relationship migration after Phase 1 without breaking the running app: sales/source/bell data becomes relational, and balance reconciliation reads by FK first.

## Chosen Approach
Use additive schema changes and compatibility fallbacks.

- Add `lookups`, lookup FK columns, `transaction_sales`, `company_aliases`, `payments.account_id`, relationship triggers, and read-only reconciliation views.
- Keep legacy text columns (`source_1`, `sale_1`, `sale_online`, `bell_code`, `company_account`) while triggers backfill and keep FK data in sync.
- Update the app read layer to prefer FK-enriched names and `account_id`, falling back to legacy text when a migration has not been run yet.

## Alternatives Considered
- Hard switch all queries to FK joins: cleaner, but risky because Supabase may not have the new migration yet and old text is still used by forms.
- Migration only with no app read changes: safe for DB, but does not complete Phase 3 or fix account reconciliation behavior.

## Components
- `supabase/migration-phase2-3.sql`: relational tables/columns, backfill, triggers, company alias normalization, and views.
- `src/lib/types.ts`: relationship fields for transactions, accounts, bank lines, lookups, and transaction sales.
- `src/lib/db-repo.ts`: optional enrichment queries for companies, customers, accounts, lookups, and transaction sales.
- `src/lib/relationship-helpers.ts`: small helpers for FK-first account matching and display normalization.
- `src/lib/balance-daily.ts` and `src/lib/usbc101.ts`: account movement and ledger filters use `account_id`/account type first.
- `docs/ERD.md`: document Phase 2/3 state.

## Error Handling
The DB repository catches optional enrichment failures and returns legacy text data. This keeps `USE_DB=true` usable before the Phase 2/3 SQL is applied, while still using FK data once available.

## Testing
Use Node's built-in test runner against pure TypeScript helper functions, then run `npx tsc --noEmit`.
