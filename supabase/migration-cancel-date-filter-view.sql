-- Expose cancel metadata on v_rc_entry so date filters can include canceled_at.

create or replace view v_rc_entry as
select
  e.id, e.entry_date as ngay, co.code as company, e.company_id,
  e.type_code as type, tt.label as type_label, tt.condition_bucket,
  e.sku_raw as ma_sku, e.description as dien_giai,
  e.customer_id, cu.ten as khach, coalesce(e.contact_raw, cu.phone_raw) as contact,
  e.expense,
  coalesce(sum(p.amount) filter (where p.direction='ar' and p.method_code='cash'),0)     as ar_cash,
  coalesce(sum(p.amount) filter (where p.direction='ar' and p.method_code='bankwire'),0) as ar_bankwire,
  coalesce(sum(p.amount) filter (where p.direction='ar' and p.method_code='zelle'),0)    as ar_zelle,
  coalesce(sum(p.amount) filter (where p.direction='ar' and p.method_code='check'),0)    as ar_check,
  coalesce(sum(p.amount) filter (where p.direction='ar' and p.method_code not in ('cash','bankwire','zelle','check')),0) as ar_other,
  coalesce(sum(p.amount) filter (where p.direction='ap' and p.method_code='cash'),0)     as ap_cash,
  coalesce(sum(p.amount) filter (where p.direction='ap' and p.method_code='bankwire'),0) as ap_bankwire,
  coalesce(sum(p.amount) filter (where p.direction='ap' and p.method_code='zelle'),0)    as ap_zelle,
  coalesce(sum(p.amount) filter (where p.direction='ap' and p.method_code='check'),0)    as ap_check,
  coalesce(sum(p.amount) filter (where p.direction='ap' and p.method_code not in ('cash','bankwire','zelle','check')),0) as ap_other,
  e.ar_total, e.ap_total,
  e.receipt, e.deposit, e.return_po, e.total,
  e.order_total, e.tax_rate, e.tax_amount,
  e.jm_receipt_no as rc_jm_no, e.jm_kind,
  e.source1_id as source_1, e.source2_id as source_2,
  e.transaction_value, e.pct_support, e.old_receipt_no,
  e.deal_id, d.opened_date as deposit_date, d.status as deal_status, e.status as trang_thai,
  e.bell_code, e.note, e.created_at,
  (select sp.ten from entry_sales es join sales_people sp on sp.id=es.salesperson_id where es.rc_entry_id=e.id and es.channel='counter' and es.position=1) as sale_1,
  (select sp.ten from entry_sales es join sales_people sp on sp.id=es.salesperson_id where es.rc_entry_id=e.id and es.channel='counter' and es.position=2) as sale_2,
  (select sp.ten from entry_sales es join sales_people sp on sp.id=es.salesperson_id where es.rc_entry_id=e.id and es.channel='counter' and es.position=3) as sale_3,
  (select sp.ten from entry_sales es join sales_people sp on sp.id=es.salesperson_id where es.rc_entry_id=e.id and es.channel='online' and es.position=1) as sale_online,
  (select sp.ten from entry_sales es join sales_people sp on sp.id=es.salesperson_id where es.rc_entry_id=e.id and es.channel='online' and es.position=2) as sale_online_2,
  (select sp.ten from entry_sales es join sales_people sp on sp.id=es.salesperson_id where es.rc_entry_id=e.id and es.channel='online' and es.position=3) as sale_online_3,
  e.cancel_reason, e.canceled_at, e.cancel_mode
from rc_entries e
left join companies co on co.id = e.company_id
left join transaction_types tt on tt.code = e.type_code
left join customers cu on cu.id = e.customer_id
left join deals d on d.id = e.deal_id
left join entry_payments p on p.rc_entry_id = e.id
group by e.id, co.code, tt.label, tt.condition_bucket, cu.ten, cu.phone_raw, d.opened_date, d.status;
