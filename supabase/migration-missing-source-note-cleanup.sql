-- Remove data written by the old "Ghi chú chi tiết nguồn" input on RC thiếu nguồn.
-- `transactions.note` is shared by other RC screens, so keep the column and only
-- strip the generated source-detail suffix.

update transactions
set note = nullif(
  btrim(regexp_replace(coalesce(note, ''), '\s*·\s*Nguồn đã cập nhật:.*$', '')),
  ''
)
where note like '%Nguồn đã cập nhật:%';
