const fs = require("fs");
const postgres = require("postgres");

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

async function main() {
  const files = [
    "supabase/migration-missing-source-note-cleanup.sql",
    "supabase/migration-cancel-metadata.sql",
  ];
  for (const file of files) {
    await sql.unsafe(fs.readFileSync(file, "utf8"));
    console.log(`applied ${file}`);
  }

  const cols = await sql.unsafe(`
    select column_name
    from information_schema.columns
    where table_name = 'rc_entries'
      and column_name in ('cancel_reason','canceled_at','cancel_mode')
    order by column_name
  `);
  const oldRows = await sql.unsafe(`
    select count(*)::int as c
    from transactions
    where note like '%Nguồn đã cập nhật:%'
  `);

  console.log(JSON.stringify({
    rc_entry_cancel_columns: cols.map((row) => row.column_name),
    old_source_note_rows: oldRows[0].c,
  }));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
