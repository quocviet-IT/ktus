import Link from "next/link";
import { Filter, Pencil, Plus, RotateCcw, Search } from "lucide-react";
import PageHeader from "@/components/page-header";
import PeriodFields from "@/components/period-fields";
import Pagination from "@/components/pagination";
import StickyScrollTable from "@/components/sticky-scroll-table";
import { listTransactionsPaged } from "@/lib/data";
import { COMPANIES } from "@/lib/store";
import { STATUS_LABEL } from "@/lib/rules";
import { rcJmCells, rcJmHeaders } from "@/lib/excel-ledger";
import { periodRange, periodLabel } from "@/lib/period";
import { normalizeSortDir } from "@/lib/list-controls";
import type { CompanyCode } from "@/lib/types";

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100];

type SP = {
  company?: string;
  status?: string;
  q?: string;
  period?: string;
  day?: string;
  week?: string;
  month?: string;
  year?: string;
  page?: string;
  pageSize?: string;
  sort?: string;
};

export default async function SoGiaoDich({ searchParams }: { searchParams: SP }) {
  const selectedCompany = (searchParams.company || "PC49") as CompanyCode | "all";
  const status = searchParams.status || "all";
  const range = periodRange(searchParams);
  const sort = normalizeSortDir(searchParams.sort);
  const requestedPageSize = Number(searchParams.pageSize);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize) ? requestedPageSize : DEFAULT_PAGE_SIZE;

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const { rows, total } = await listTransactionsPaged(
    { company: selectedCompany, status, q: searchParams.q, from: range.from, to: range.to, sort },
    page, pageSize,
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageFrom = total ? start + 1 : 0;
  const pageTo = Math.min(total, start + rows.length);

  const headers = rcJmHeaders(selectedCompany);
  const tableMinWidth = selectedCompany === "Trans" ? 2650 : 2060;

  const control =
    "h-9 rounded-md border border-line bg-card px-2.5 text-[12px] text-ink outline-none hover:border-accent focus:border-brand focus:ring-1 focus:ring-brand";
  const toolbarButton =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-[12px] font-medium text-ink hover:border-accent hover:bg-accentSoft";
  const primaryButton =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-brand bg-brand px-3 text-[12px] font-medium text-white hover:bg-[#244C39]";
  const th =
    "sticky top-0 z-20 border-b border-r border-line bg-band px-2 py-1.5 text-left align-bottom font-mono text-[10px] font-semibold uppercase tracking-normal text-brand whitespace-nowrap";
  const td = "border-b border-r border-line px-2 py-1.5 text-[12px] leading-5 whitespace-nowrap align-top";
  const numeric = "text-right font-mono tabular-nums";
  const stickyEdge = "bg-card shadow-[2px_0_0_0_#D8E0D4]";
  const stickyHead = "z-40 bg-band shadow-[2px_0_0_0_#D8E0D4]";
  const columnWidths = selectedCompany === "Trans"
    ? [64, 120, 220, 110, 220]
    : [64, 120, 220, 220];
  const stickyColumnCount = columnWidths.length;
  const stickyLeft = (index: number) => columnWidths.slice(0, index).reduce((sum, width) => sum + width, 0);
  const stickyStyle = (index: number) => index < stickyColumnCount
    ? { left: stickyLeft(index), width: columnWidths[index], minWidth: columnWidths[index], maxWidth: columnWidths[index] }
    : undefined;
  const stickyClass = (index: number, head = false) => index < stickyColumnCount
    ? `sticky ${head ? `${stickyHead} z-40` : `${stickyEdge} z-10`}`
    : "";
  const baseColumnWidth = (index: number) => {
    if (index < stickyColumnCount) return undefined;
    const header = headers[index]?.toUpperCase() || "";
    if (header.includes("EXPENSE") || header.includes("TRANSACTION")) return 170;
    if (header.includes("STATUS") || header.includes("SOURCE") || header.includes("SALE")) return 118;
    return 104;
  };

  return (
    <>
      <PageHeader crumb="Hàng ngày / Sổ giao dịch" title={selectedCompany === "Trans" ? "TRANS RC JM (FINAL)" : selectedCompany === "all" ? "Sổ RC JM (tất cả)" : "PC49 RC JM (FINAL)"}>
        <Link href="/rc/new" className="inline-flex h-10 items-center gap-1.5 rounded-md bg-brand px-3.5 text-[13px] font-medium text-white hover:bg-accent">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Nhập RC
        </Link>
      </PageHeader>

      <div className="p-4 lg:p-6">
        <section className="rounded-lg border border-line bg-card">
          <div className="border-b border-line px-4 py-3">
            <form className="flex flex-wrap items-center gap-2 gap-y-3" action="/rc">
              <label className="relative min-w-[260px] flex-1 max-w-[360px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  name="q"
                  defaultValue={searchParams.q}
                  placeholder="Tìm RC#, khách, diễn giải..."
                  className={`${control} w-full pl-9`}
                />
              </label>
              <select name="company" aria-label="Công ty" defaultValue={selectedCompany} className={control}>
                <option value="PC49">PC49 RC JM</option>
                <option value="Trans">TRANS RC JM</option>
                <option value="all">Tất cả</option>
                {COMPANIES.filter((c) => c !== "PC49" && c !== "Trans").map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select name="status" aria-label="Trạng thái" defaultValue={status} className={control}>
                <option value="all">Mọi trạng thái</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select name="sort" aria-label="Sap xep" defaultValue={sort} className={control}>
                <option value="newest">Ngay moi nhat</option>
                <option value="oldest">Ngay cu nhat</option>
              </select>
              <PeriodFields period={searchParams.period} day={searchParams.day} week={searchParams.week} month={searchParams.month} year={searchParams.year} />
              <label className="flex items-center gap-1.5 text-[12px] text-muted">
                Dòng/trang
                <select name="pageSize" defaultValue={String(pageSize)} className={control}>
                  {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <button type="submit" className={primaryButton}>
                <Filter size={14} />
                Lọc
              </button>
              <Link href={`/rc?pageSize=${pageSize}`} className={toolbarButton}>
                <RotateCcw size={14} />
                Xóa lọc
              </Link>
              <div className="flex-1" />
              <span className="text-[12px] text-muted">{periodLabel(searchParams)} · {pageFrom}-{pageTo}/{total} dòng</span>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-line bg-line md:grid-cols-4">
            <div className="bg-band px-3 py-2">
              <div className="font-mono text-[10px] font-semibold uppercase text-muted">Công ty</div>
              <div className="mt-0.5 text-[14px] font-semibold text-ink">{selectedCompany === "all" ? "Tất cả" : selectedCompany}</div>
            </div>
            <div className="bg-band px-3 py-2">
              <div className="font-mono text-[10px] font-semibold uppercase text-muted">Trạng thái</div>
              <div className="mt-0.5 text-[14px] font-semibold text-ink">{status === "all" ? "Mọi trạng thái" : STATUS_LABEL[status as keyof typeof STATUS_LABEL]}</div>
            </div>
            <div className="bg-band px-3 py-2">
              <div className="font-mono text-[10px] font-semibold uppercase text-muted">Dòng</div>
              <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">{total.toLocaleString("en-US")}</div>
            </div>
            <div className="bg-band px-3 py-2">
              <div className="font-mono text-[10px] font-semibold uppercase text-muted">Trang</div>
              <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">{pageFrom}-{pageTo}</div>
            </div>
          </div>

          <div className="p-3">
            <StickyScrollTable minWidth={tableMinWidth} bodyClassName="max-h-[calc(100vh-330px)] min-h-[320px]">
              <table className="border-collapse text-[12px]" style={{ minWidth: tableMinWidth }}>
                <thead>
                  <tr>
                    {headers.map((h, index) => (
                      <th
                        key={h}
                        className={`${th} ${stickyClass(index, true)}`}
                        style={{ ...stickyStyle(index), minWidth: stickyStyle(index)?.minWidth ?? baseColumnWidth(index) }}
                      >
                        {h}
                      </th>
                    ))}
                    <th className={`${th} sticky right-0 z-40 min-w-[112px] bg-band text-center shadow-[-2px_0_0_0_#D8E0D4]`}>SỬA</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map((t, i) => (
                    <tr key={t.id} className="hover:bg-accentSoft">
                      {rcJmCells(t, start + i, selectedCompany).map((cell, k) => {
                        const value = String(cell ?? "");
                        const isNumeric = typeof cell === "number" || /^\d[\d,.]*$/.test(value);
                        return (
                          <td
                            key={k}
                            title={value}
                            className={`${td} ${stickyClass(k)} ${isNumeric ? numeric : ""} ${k === 2 ? "overflow-hidden text-ellipsis" : ""}`}
                            style={{ ...stickyStyle(k), minWidth: stickyStyle(k)?.minWidth ?? baseColumnWidth(k) }}
                          >
                            {k === 0 ? <Link href={`/rc/${t.id}`} className="font-mono text-brand hover:text-accent">{cell}</Link> : cell}
                          </td>
                        );
                      })}
                      <td className={`${td} sticky right-0 z-20 bg-card text-center shadow-[-2px_0_0_0_#D8E0D4]`}>
                        <Link href={`/rc/${t.id}`} aria-label="Sửa đơn" title="Sửa đơn"
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-line px-2.5 text-[11.5px] text-brand hover:border-accent hover:bg-accentSoft hover:text-accent">
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Sửa
                        </Link>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={headers.length + 1} className="border-b border-r border-line px-3 py-8 text-center text-[12px] text-muted">Không có giao dịch phù hợp.</td></tr>
                  )}
                </tbody>
              </table>
            </StickyScrollTable>

            <Pagination
              basePath="/rc"
              sp={{ ...(searchParams as Record<string, string | undefined>), pageSize: String(pageSize) }}
              page={page}
              totalPages={totalPages}
              total={total}
            />
          </div>
        </section>
      </div>
    </>
  );
}
