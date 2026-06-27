-- ============================================================
-- KTUS — Sửa "Danh mục: Thêm không được".
-- Đảm bảo bảng `lookups` có: cấu trúc đúng + UNIQUE(grp,code) (cho upsert) + RLS mở cho anon.
-- Idempotent — chạy 1 lần trong Supabase SQL Editor.
-- ============================================================
create extension if not exists pgcrypto;

create table if not exists lookups (
  id     uuid primary key default gen_random_uuid(),
  grp    text not null,
  code   text not null,
  label  text not null,
  sort   integer default 0,
  active boolean not null default true
);

-- Phòng trường hợp bảng cũ thiếu cột
alter table lookups add column if not exists id     uuid default gen_random_uuid();
alter table lookups add column if not exists grp    text;
alter table lookups add column if not exists code   text;
alter table lookups add column if not exists label  text;
alter table lookups add column if not exists sort   integer default 0;
alter table lookups add column if not exists active boolean not null default true;

-- Bỏ trùng (grp,code) trước khi thêm unique
delete from lookups a using lookups b
where a.ctid < b.ctid and a.grp = b.grp and a.code = b.code;

-- UNIQUE(grp,code) — bắt buộc để upsert onConflict hoạt động
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lookups_grp_code_key' and conrelid = 'lookups'::regclass
  ) then
    alter table lookups add constraint lookups_grp_code_key unique (grp, code);
  end if;
end $$;

-- RLS: mở cho anon + authenticated (GĐ1 một người dùng) → cho phép Thêm/Sửa/Xoá danh mục
alter table lookups enable row level security;
drop policy if exists lookups_all on lookups;
create policy lookups_all on lookups for all to anon, authenticated using (true) with check (true);

-- Kiểm chứng:
-- insert into lookups (grp,code,label) values ('source','test_x','Test X')
--   on conflict (grp,code) do update set label=excluded.label;   -- phải chạy OK
-- select grp, count(*) from lookups group by grp order by grp;
