-- ============================================================
-- KTUS — Bảo đảm RLS MỞ (anon + authenticated) cho mọi bảng đường GHI.
-- Sửa lỗi "Bước 2 không lưu được" nếu do RLS chặn ghi ở bảng cũ
-- (customers / sales_people / companies) hoặc bảng redesign.
-- Idempotent — chạy 1 lần trong Supabase SQL Editor.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'companies','customers','sales_people','sources','transaction_types','bell_codes',
    'commission_tiers','salesperson_aliases','lookups',
    'deals','rc_entries','rc_line_items','entry_sales','entry_payments',
    'bank_import_batches','bank_transactions','account_daily_balance','reconciliations'
  ] loop
    if exists (select 1 from information_schema.tables where table_name = t) then
      execute format('alter table %I enable row level security', t);
      execute format('drop policy if exists p_all on %I', t);
      execute format('create policy p_all on %I for all to anon, authenticated using (true) with check (true)', t);
    end if;
  end loop;
end $$;

-- Kiểm chứng:
-- select tablename, policyname from pg_policies where schemaname='public' order by tablename;
