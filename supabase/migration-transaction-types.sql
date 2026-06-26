-- Dynamic transaction type labels/options.
-- Keeps stable type codes, updates user-facing labels, and hides legacy Repair from dropdown/catalog.

create extension if not exists pgcrypto;

create table if not exists lookups (
  id     uuid primary key default gen_random_uuid(),
  grp    text not null,
  code   text not null,
  label  text not null,
  sort   integer default 0,
  active boolean not null default true
);

alter table lookups add column if not exists id     uuid default gen_random_uuid();
alter table lookups add column if not exists grp    text;
alter table lookups add column if not exists code   text;
alter table lookups add column if not exists label  text;
alter table lookups add column if not exists sort   integer default 0;
alter table lookups add column if not exists active boolean not null default true;

delete from lookups a using lookups b
where a.ctid < b.ctid and a.grp = b.grp and a.code = b.code;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lookups_grp_code_key' and conrelid = 'lookups'::regclass
  ) then
    alter table lookups add constraint lookups_grp_code_key unique (grp, code);
  end if;
end $$;

insert into lookups (grp, code, label, sort, active) values
  ('transaction_type', 'receipt', 'Receipt', 10, true),
  ('transaction_type', 'deposit', 'Deposit', 20, true),
  ('transaction_type', 'pick_up', 'Pick up', 30, true),
  ('transaction_type', 'extra_deposit', 'Extra Deposit', 40, true),
  ('transaction_type', 'po', 'PO', 50, true),
  ('transaction_type', 'return', 'Return', 60, true),
  ('transaction_type', 'exchange', 'Exchange', 70, true),
  ('transaction_type', 'transfer', 'Transfer', 80, true),
  ('transaction_type', 'cancel', 'Cancel', 90, true),
  ('transaction_type', 'memo', 'Memo', 100, true),
  ('transaction_type', 'cash_report', 'Cash report', 110, true),
  ('transaction_type', 'ra_rp', 'Ra RP', 120, true),
  ('transaction_type', 'repair', 'Repair', 990, false)
on conflict (grp, code) do update set
  label = excluded.label,
  sort = excluded.sort,
  active = excluded.active;

create table if not exists transaction_types (
  code             text primary key,
  label            text not null,
  condition_bucket text not null default 'none',
  money_direction  text not null default 'none',
  requires_source  boolean not null default false,
  requires_deal    boolean not null default false,
  definition       text
);

do $$
begin
  if exists (select 1 from pg_type where typname = 'transaction_type') then
    alter type transaction_type add value if not exists 'cancel';
    alter type transaction_type add value if not exists 'memo';
    alter type transaction_type add value if not exists 'cash_report';
    alter type transaction_type add value if not exists 'ra_rp';
  end if;
end $$;

insert into transaction_types (code, label, condition_bucket, money_direction, requires_source, requires_deal) values
  ('receipt', 'Receipt', 'receipt', 'in', true, false),
  ('deposit', 'Deposit', 'deposit', 'in', true, true),
  ('pick_up', 'Pick up', 'receipt', 'in', true, true),
  ('extra_deposit', 'Extra Deposit', 'deposit', 'in', false, true),
  ('po', 'PO', 'return_po', 'out', false, false),
  ('return', 'Return', 'return_po', 'out', false, true),
  ('exchange', 'Exchange', 'return_po', 'none', false, true),
  ('transfer', 'Transfer', 'none', 'none', false, false),
  ('cancel', 'Cancel', 'none', 'none', false, true),
  ('memo', 'Memo', 'none', 'none', false, false),
  ('cash_report', 'Cash report', 'none', 'none', false, false),
  ('ra_rp', 'Ra RP', 'none', 'none', false, false),
  ('repair', 'Repair', 'receipt', 'in', false, false)
on conflict (code) do update set
  label = excluded.label,
  condition_bucket = excluded.condition_bucket,
  money_direction = excluded.money_direction,
  requires_source = excluded.requires_source,
  requires_deal = excluded.requires_deal;

do $$
begin
  if to_regclass('public.rc_entries') is null then
    delete from transaction_types where code = 'repair';
  else
    delete from transaction_types tt
    where tt.code = 'repair'
      and not exists (select 1 from rc_entries e where e.type_code = 'repair');
  end if;
end $$;
