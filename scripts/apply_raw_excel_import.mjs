import fs from "node:fs";
import postgres from "postgres";

const inputPath = process.argv[2] || "scripts/raw-excel-output.jsonl";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  ssl: "require",
  max: 1,
  idle_timeout: 20,
  connect_timeout: 30,
});

const workbookColumns = ["id", "file_name", "relative_path", "file_size_bytes", "modified_at"];
const sheetColumns = ["id", "workbook_id", "sheet_name", "sheet_index", "max_row", "max_column"];
const rowColumns = ["id", "workbook_id", "sheet_id", "row_index", "cells", "row_text"];

async function createTables() {
  await sql`
    create table if not exists excel_workbooks (
      id uuid primary key,
      file_name text not null unique,
      relative_path text,
      file_size_bytes bigint not null default 0,
      modified_at timestamptz,
      imported_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists excel_sheets (
      id uuid primary key,
      workbook_id uuid not null references excel_workbooks(id) on delete cascade,
      sheet_name text not null,
      sheet_index int not null,
      max_row int not null default 0,
      max_column int not null default 0,
      non_empty_rows int not null default 0,
      unique (workbook_id, sheet_name)
    )
  `;
  await sql`
    create table if not exists excel_rows (
      id uuid primary key,
      workbook_id uuid not null references excel_workbooks(id) on delete cascade,
      sheet_id uuid not null references excel_sheets(id) on delete cascade,
      row_index int not null,
      cells jsonb not null,
      row_text text,
      created_at timestamptz not null default now(),
      unique (sheet_id, row_index)
    )
  `;
  await sql`create index if not exists excel_sheets_workbook_idx on excel_sheets(workbook_id)`;
  await sql`create index if not exists excel_rows_workbook_idx on excel_rows(workbook_id)`;
  await sql`create index if not exists excel_rows_sheet_idx on excel_rows(sheet_id, row_index)`;
  await sql`create index if not exists excel_rows_text_idx on excel_rows using gin (to_tsvector('simple', coalesce(row_text, '')))`;

  await sql`alter table excel_workbooks enable row level security`;
  await sql`alter table excel_sheets enable row level security`;
  await sql`alter table excel_rows enable row level security`;
  await sql`
    do $$
    declare t text;
    begin
      foreach t in array array['excel_workbooks','excel_sheets','excel_rows'] loop
        execute format('drop policy if exists %I_all on %I;', t, t);
        execute format('create policy %I_all on %I for all to anon, authenticated using (true) with check (true);', t, t);
      end loop;
    end$$
  `;
}

function asWorkbook(record) {
  return {
    id: record.id,
    file_name: record.file_name,
    relative_path: record.relative_path ?? null,
    file_size_bytes: record.file_size_bytes ?? 0,
    modified_at: record.modified_at ?? null,
  };
}

function asSheet(record) {
  return {
    id: record.id,
    workbook_id: record.workbook_id,
    sheet_name: record.sheet_name,
    sheet_index: record.sheet_index,
    max_row: record.max_row ?? 0,
    max_column: record.max_column ?? 0,
  };
}

function asRow(record) {
  return {
    id: record.id,
    workbook_id: record.workbook_id,
    sheet_id: record.sheet_id,
    row_index: record.row_index,
    cells: JSON.stringify(record.cells ?? []),
    row_text: record.row_text ?? null,
  };
}

async function insertChunk(rows) {
  if (!rows.length) return;
  await sql`insert into excel_rows ${sql(rows, rowColumns)}`;
}

async function insertWorkbook(row) {
  await sql`
    insert into excel_workbooks (id, file_name, relative_path, file_size_bytes, modified_at)
    values (${row.id}, ${row.file_name}, ${row.relative_path}, ${row.file_size_bytes}, ${row.modified_at})
  `;
}

async function insertSheet(row) {
  await sql`
    insert into excel_sheets (id, workbook_id, sheet_name, sheet_index, max_row, max_column)
    values (${row.id}, ${row.workbook_id}, ${row.sheet_name}, ${row.sheet_index}, ${row.max_row}, ${row.max_column})
  `;
}

try {
  await createTables();

  const workbooks = [];
  const sheets = [];
  let rowBuffer = [];
  let rowCount = 0;
  let workbookCount = 0;
  let sheetCount = 0;

  await sql`truncate table excel_rows, excel_sheets, excel_workbooks cascade`;

  const lines = fs.readFileSync(inputPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const record = JSON.parse(line);
    if (record.kind === "workbook") {
      workbooks.push(asWorkbook(record));
      workbookCount += 1;
    } else if (record.kind === "sheet") {
      sheets.push(asSheet(record));
      sheetCount += 1;
    } else if (record.kind === "row") {
      rowBuffer.push(asRow(record));
      rowCount += 1;
    }
  }

  for (const workbook of workbooks) await insertWorkbook(workbook);
  for (const sheet of sheets) await insertSheet(sheet);

  for (let i = 0; i < rowBuffer.length; i += 1000) {
    await insertChunk(rowBuffer.slice(i, i + 1000));
  }

  await sql`
    update excel_sheets s
    set non_empty_rows = counts.count
    from (
      select sheet_id, count(*)::int as count
      from excel_rows
      group by sheet_id
    ) counts
    where s.id = counts.sheet_id
  `;

  const counts = await sql`
    select
      (select count(*)::int from excel_workbooks) as workbooks,
      (select count(*)::int from excel_sheets) as sheets,
      (select count(*)::int from excel_rows) as rows
  `;
  const largest = await sql`
    select w.file_name, count(r.*)::int as rows
    from excel_workbooks w
    join excel_rows r on r.workbook_id = w.id
    group by w.file_name
    order by rows desc
    limit 5
  `;

  console.log(JSON.stringify({
    parsed: { workbooks: workbookCount, sheets: sheetCount, rows: rowCount },
    imported: counts[0],
    largest,
  }, null, 2));
} finally {
  await sql.end();
}
