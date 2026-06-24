import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const inputPath = process.argv[2] || path.join("scripts", "import-output.json");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const raw = await fs.readFile(inputPath, "utf8");
const payload = JSON.parse(raw);
const sql = postgres(databaseUrl, {
  ssl: "require",
  max: 1,
  idle_timeout: 20,
  connect_timeout: 30,
});

const txColumns = [
  "id",
  "ngay",
  "company",
  "type",
  "ma_sku",
  "dien_giai",
  "khach",
  "contact",
  "expense",
  "ar_cash",
  "ar_bankwire",
  "ar_zelle",
  "ar_check",
  "rc_jm_no",
  "so_no",
  "appt_id",
  "source_1",
  "source_2",
  "sale_1",
  "sale_online",
  "transaction_value",
  "pct_support",
  "old_receipt_no",
  "deposit_date",
  "bell_code",
  "trang_thai",
  "note",
];

const lineColumns = ["transaction_id", "mo_ta", "sku", "gia_no", "so_luong", "don_gia"];
const paymentColumns = ["transaction_id", "ngay", "so_tien", "hinh_thuc", "nguoi_xac_nhan", "ghi_chu", "is_dau"];

const chunk = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

try {
  const lineItems = [];
  const payments = [];
  const transactions = payload.transactions.map((tx) => {
    for (const item of tx.line_items || []) {
      lineItems.push({
        transaction_id: tx.id,
        mo_ta: item.mo_ta ?? null,
        sku: item.sku ?? null,
        gia_no: item.gia_no ?? null,
        so_luong: item.so_luong ?? 0,
        don_gia: item.don_gia ?? 0,
      });
    }
    for (const payment of tx.payments || []) {
      payments.push({
        transaction_id: tx.id,
        ngay: payment.ngay,
        so_tien: payment.so_tien,
        hinh_thuc: payment.hinh_thuc ?? null,
        nguoi_xac_nhan: payment.nguoi_xac_nhan ?? null,
        ghi_chu: payment.ghi_chu ?? null,
        is_dau: Boolean(payment.is_dau),
      });
    }

    const row = {};
    for (const column of txColumns) row[column] = tx[column] ?? null;
    row.expense = tx.expense ?? 0;
    row.ar_cash = tx.ar_cash ?? 0;
    row.ar_bankwire = tx.ar_bankwire ?? 0;
    row.ar_zelle = tx.ar_zelle ?? 0;
    row.ar_check = tx.ar_check ?? 0;
    row.trang_thai = tx.trang_thai || "moi";
    return row;
  });

  await sql.begin(async (tx) => {
    await tx`truncate table payments, line_items, transactions restart identity cascade`;

    for (const part of chunk(transactions, 500)) {
      await tx`insert into transactions ${tx(part, txColumns)}`;
    }
    for (const part of chunk(lineItems, 500)) {
      await tx`insert into line_items ${tx(part, lineColumns)}`;
    }
    for (const part of chunk(payments, 500)) {
      await tx`insert into payments ${tx(part, paymentColumns)}`;
    }
  });

  const counts = await sql`
    select
      (select count(*)::int from transactions) as transactions,
      (select count(*)::int from line_items) as line_items,
      (select count(*)::int from payments) as payments
  `;
  const byCompany = await sql`
    select company, count(*)::int as count
    from transactions
    group by company
    order by company
  `;
  const byType = await sql`
    select type, count(*)::int as count
    from transactions
    group by type
    order by type
  `;

  console.log(JSON.stringify({
    imported: counts[0],
    byCompany,
    byType,
  }, null, 2));
} finally {
  await sql.end();
}
