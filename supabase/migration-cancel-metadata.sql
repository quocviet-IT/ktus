-- Cancel metadata. Keep the original order date unchanged so historical date
-- filters still show canceled orders on the date they were created.

alter table transactions
  add column if not exists cancel_reason text,
  add column if not exists canceled_at date,
  add column if not exists cancel_mode text;

alter table rc_entries
  add column if not exists cancel_reason text,
  add column if not exists canceled_at date,
  add column if not exists cancel_mode text;

alter table transactions
  drop constraint if exists transactions_cancel_mode_check,
  add constraint transactions_cancel_mode_check check (cancel_mode is null or cancel_mode in ('cancel', 'void'));

alter table rc_entries
  drop constraint if exists rc_entries_cancel_mode_check,
  add constraint rc_entries_cancel_mode_check check (cancel_mode is null or cancel_mode in ('cancel', 'void'));
