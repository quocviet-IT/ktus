import PageHeader from "@/components/page-header";
import Pagination from "@/components/pagination";
import StickyScrollTable from "@/components/sticky-scroll-table";
import { listExcelRows, listExcelWorkbooks } from "@/lib/data";
import { PAGE_SIZE_OPTIONS, normalizePage, normalizePageSize, normalizeSortDir } from "@/lib/list-controls";

function cellText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default async function ExcelArchive({ searchParams }: { searchParams: { workbook?: string; sheet?: string; q?: string; page?: string; pageSize?: string; sort?: string } }) {
  const workbooks = await listExcelWorkbooks();
  const selectedWorkbook = workbooks.find((w) => w.id === searchParams.workbook) ?? workbooks[0];
  const selectedSheet = selectedWorkbook?.sheets.find((s) => s.id === searchParams.sheet);
  const page = normalizePage(searchParams.page);
  const pageSize = normalizePageSize(searchParams.pageSize || 100);
  const sort = normalizeSortDir(searchParams.sort);
  const { rows, count } = await listExcelRows({
    workbookId: selectedWorkbook?.id,
    sheetId: selectedSheet?.id,
    q: searchParams.q,
    page,
    pageSize,
    sort,
  });
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const sheetLookup = new Map(selectedWorkbook?.sheets.map((s) => [s.id, s.sheetName]) ?? []);

  return (
    <>
      <PageHeader crumb="Du lieu / Excel raw" title="Kho du lieu Excel" />
      <div className="p-6">
        <div className="mb-3 rounded-md border border-line bg-accentSoft px-3 py-2 text-[12px] text-[#6c5320]">
          Day la du lieu raw da import nguyen dong tu 33 file Excel. So giao dich RC van nam o man hinh /rc.
        </div>

        <form className="mb-3 grid gap-2 lg:grid-cols-[minmax(260px,1fr)_minmax(220px,320px)_minmax(180px,240px)_140px_120px_auto]" action="/excel">
          <select name="workbook" defaultValue={selectedWorkbook?.id} className="rounded-md border border-line px-2 py-1.5 text-[13px]">
            {workbooks.map((workbook) => (
              <option key={workbook.id} value={workbook.id}>{workbook.fileName}</option>
            ))}
          </select>
          <select name="sheet" defaultValue={selectedSheet?.id ?? ""} className="rounded-md border border-line px-2 py-1.5 text-[13px]">
            <option value="">Tat ca sheet</option>
            {selectedWorkbook?.sheets.map((sheet) => (
              <option key={sheet.id} value={sheet.id}>{sheet.sheetName} ({sheet.nonEmptyRows})</option>
            ))}
          </select>
          <input name="q" defaultValue={searchParams.q} placeholder="Tim trong dong Excel..."
            className="rounded-md border border-line px-3 py-1.5 text-[13px]" />
          <select name="sort" defaultValue={sort} className="rounded-md border border-line px-2 py-1.5 text-[13px]">
            <option value="newest">Dong moi nhat</option>
            <option value="oldest">Dong cu nhat</option>
          </select>
          <select name="pageSize" defaultValue={String(pageSize)} className="rounded-md border border-line px-2 py-1.5 text-[13px]">
            {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <button type="submit" className="rounded-md border border-line px-3 py-1.5 text-[13px] hover:border-accent">Loc</button>
        </form>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-muted">
          <span>{workbooks.length} file</span>
          <span>·</span>
          <span>{selectedWorkbook?.sheets.length ?? 0} sheet dang chon</span>
          <span>·</span>
          <span>{count.toLocaleString("en-US")} dong phu hop</span>
          <span>·</span>
          <span>Trang {page} / {totalPages}</span>
        </div>

        <StickyScrollTable minWidth={1180} bodyClassName="max-h-[calc(100vh-310px)] min-h-[320px] rounded-md border border-line bg-card">
          <table className="min-w-[1180px] border-collapse text-[12.5px]">
            <thead>
              <tr>
                {["Sheet", "Dong", "Noi dung"].map((h) => (
                  <th key={h} className="sticky top-0 z-20 border border-line bg-band px-2.5 py-2 text-left font-mono text-[10px] uppercase text-brand">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.id} className="even:bg-band hover:bg-accentSoft">
                  <td className="w-[220px] border border-line px-2.5 py-1.5 align-top">{sheetLookup.get(row.sheetId) ?? row.sheetId}</td>
                  <td className="w-[80px] border border-line px-2.5 py-1.5 text-right font-mono align-top">{row.rowIndex}</td>
                  <td className="border border-line px-2.5 py-1.5 align-top">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {row.cells.map((cell, index) => (
                        <span key={index} className="whitespace-pre-wrap">
                          <span className="font-mono text-[10px] text-muted">C{index + 1}</span> {cellText(cell)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="border border-line px-3 py-6 text-center text-muted">Khong co dong Excel phu hop.</td></tr>
              )}
            </tbody>
          </table>
        </StickyScrollTable>

        <Pagination basePath="/excel" sp={{ ...(searchParams as Record<string, string | undefined>), pageSize: String(pageSize), sort }} page={page} totalPages={totalPages} total={count} />
      </div>
    </>
  );
}
