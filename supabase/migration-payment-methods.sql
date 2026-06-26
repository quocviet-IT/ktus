-- Dynamic payment methods.
-- Safe to run even if the phase 2/3 lookup migration has not created lookups yet.

alter table transactions
  alter column tt_dau_hinh_thuc type text using tt_dau_hinh_thuc::text;

alter table payments
  alter column hinh_thuc type text using hinh_thuc::text,
  add column if not exists direction text not null default 'ar';

alter table payments
  drop constraint if exists payments_direction_check;

alter table payments
  add constraint payments_direction_check check (direction in ('ar', 'ap'));

create extension if not exists pgcrypto;

create table if not exists lookups (
  id uuid primary key default gen_random_uuid(),
  grp text not null,
  code text not null,
  label text not null,
  sort integer default 0,
  active boolean not null default true
);

alter table lookups
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists grp text,
  add column if not exists code text,
  add column if not exists label text,
  add column if not exists sort integer default 0,
  add column if not exists active boolean not null default true;

delete from lookups a
using lookups b
where a.ctid < b.ctid
  and a.grp = b.grp
  and a.code = b.code;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lookups_grp_code_key'
      and conrelid = 'lookups'::regclass
  ) then
    alter table lookups add constraint lookups_grp_code_key unique (grp, code);
  end if;
end $$;

insert into lookups (grp, code, label, sort, active) values
  ('payment', 'cash', 'Cash', 10, true),
  ('payment', 'bank_wire', 'Bank wire', 20, true),
  ('payment', 'zelle', 'Zelle', 30, true),
  ('payment', 'check', 'Check', 40, true),
  ('payment', 'card', 'Card', 50, true)
on conflict (grp, code) do update set
  label = excluded.label,
  sort = excluded.sort,
  active = true;
