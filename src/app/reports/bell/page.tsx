import Link from "next/link";
import PageHeader from "@/components/page-header";
import Pagination from "@/components/pagination";
import PeriodFields from "@/components/period-fields";
import StickyScrollTable from "@/components/sticky-scroll-table";
import { BellRing, Filter, RotateCcw } from "lucide-react";
import { listCatalogGroups, listTransactions } from "@/lib/data";
import { isBell, computeCondition } from "@/lib/rules";
import { money, ddmm } from "@/lib/format";
import { periodRange, periodLabel, byEntryAsc } from "@/lib/period";
import type { Transaction } from "@/lib/types";

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100];

type SP = {
  period?: string;
  day?: string;
  week?: string;
  month?: string;
  year?: string;
  page?: string;
  pageSize?: string;
};

export default async function Bell({ searchParams }: { searchParams: SP }) {
  const range = periodRange(searchParams);
  const requestedPageSize = Number(searchParams.pageSize);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize) ? requestedPageSize : DEFAULT_PAGE_SIZE;
  const [all, catalogGroups] = await Promise.all([listTransactions({ from: range.from, to: range.to }), listCatalogGroups()]);
  const bellCodes = catalogGroups.find((group) => group.key === "bell_code")?.items.map((item) => item.label) ?? [];

  const byOrder = new Map<string, Transaction>();
  for (const t of all.filter(isBell)) {
    const key = t.oldReceiptNo || t.rcJmNo || t.id;
    if (!byOrder.has(key)) byOrder.set(key, t);
  }
  const rowsAll = [...byOrder.values()].sort(byEntryAsc);

  const counts: Record<string, number> = {};
  bellCodes.forEach((c) => (counts[c] = 0));
  rowsAll.forEach((t) => { if (t.bellCode && counts[t.bellCode] !== undefined) counts[t.bellCode]++; });
  const uncodedCount = rowsAll.filter((t) => !t.bellCode || counts[t.bellCode] === undefined).length;
  const totalAmount = rowsAll.reduce((sum, t) => {
    const c = computeCondition(t);
    return sum + (c.receipt || c.deposit);
  }, 0);

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const total = rowsAll.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const rows = rowsAll.slice(startIdx, startIdx + pageSize);
  const pageFrom = total ? startIdx + 1 : 0;
  const pageTo = Math.min(total, startIdx + rows.length);

  const control =
    "h-9 rounded-md border border-line bg-card px-2.5 text-[12px] text-ink outline-none hover:border-accent focus:border-brand focus:ring-1 focus:ring-brand";
  const toolbarButton =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-[12px] font-medium text-ink hover:border-accent hover:bg-accentSoft";
  const primaryButton =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-brand bg-brand px-3 text-[12px] font-medium text-white hover:bg-[#244C39]";
  const th =
    "sticky top-0 z-20 border-b border-r border-line bg-band px-2 py-1.5 text-left align-bottom font-mono text-[10px] font-semibold uppercase tracking-normal text-brand whitespace-nowrap";
  const td = "border-b border-r border-line px-2 py-1.5 text-[12px] leading-5 whitespace-nowrap align-top";
  const stickyEdge = "bg-card shadow-[2px_0_0_0_#D8E0D4]";
  const stickyHead = "z-40 bg-band shadow-[2px_0_0_0_#D8E0D4]";
  const stickyDate = "sticky left-0 w-[86px] min-w-[86px] max-w-[86px]";
  const stickyReceipt = "sticky left-[86px] w-[142px] min-w-[142px] max-w-[142px]";
  const stickyCompany = "sticky left-[228px] w-[98px] min-w-[98px] max-w-[98px]";
  const tableMinWidth = 980;

  return (
    <>
      <PageHeader crumb="Báo cáo / Rung chuông" title="Báo cáo rung chuông" />
      <div className="p-4 lg:p-6">
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {bellCodes.map((c) => (
            <div key={c} className="rounded-lg border border-line border-l-4 border-l-accent bg-card px-4 py-3">
              <div className="font-mono text-[10px] font-semibold uppercase text-muted">Mã {c}</div>
              <div className="mt-0.5 font-mono text-[20px] font-bold tabular-nums text-ink">{counts[c]} đơn</div>
            </div>
          ))}
        </div>

        <section className="rounded-lg border border-line bg-card">
          <div className="border-b border-line px-4 py-3">
            <form action="/reports/bell" className="flex items-center gap-2 gap-y-3 flex-wrap">
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
              <Link href={`/reports/bell?pageSize=${pageSize}`} className={toolbarButton}>
                <RotateCcw size={14} />
                Xóa lọc
              </Link>
              <div className="flex-1" />
              <span className="text-[12px] text-muted">{periodLabel(searchParams)} · {pageFrom}-{pageTo}/{total} đơn</span>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-line bg-line md:grid-cols-4">
            <div className="bg-band px-3 py-2">
              <div className="font-mono text-[10px] font-semibold uppercase text-muted">Kỳ</div>
              <div className="mt-0.5 text-[14px] font-semibold text-ink">{periodLabel(searchParams)}</div>
            </div>
            <div className="bg-band px-3 py-2">
              <div className="font-mono text-[10px] font-semibold uppercase text-muted">Đơn đạt mốc</div>
              <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">{total.toLocaleString("en-US")}</div>
            </div>
            <div className="bg-band px-3 py-2">
              <div className="font-mono text-[10px] font-semibold uppercase text-muted">Chưa gán mã</div>
              <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">{uncodedCount.toLocaleString("en-US")}</div>
            </div>
            <div className="bg-band px-3 py-2">
              <div className="font-mono text-[10px] font-semibold uppercase text-muted">Tổng tiền</div>
              <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">{money(totalAmount)}</div>
            </div>
          </div>

          <div className="p-3">
            <StickyScrollTable minWidth={tableMinWidth} bodyClassName="max-h-[calc(100vh-360px)] min-h-[320px]">
              <table className="border-collapse text-[12px]" style={{ minWidth: tableMinWidth }}>
                <thead>
                  <tr>
                    <th className={`${th} ${stickyDate} ${stickyHead}`}>DATE</th>
                    <th className={`${th} ${stickyReceipt} ${stickyHead}`}>JM RECEIPT#</th>
                    <th className={`${th} ${stickyCompany} ${stickyHead}`}>Công ty</th>
                    <th className={`${th} min-w-[260px]`}>Customer</th>
                    <th className={`${th} min-w-[220px]`}>Sale</th>
                    <th className={`${th} min-w-[120px] text-right`}>Số tiền</th>
                    <th className={`${th} min-w-[136px]`}>Mã RC</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map((t) => {
                    const c = computeCondition(t);
                    return (
                      <tr key={t.id} className="hover:bg-accentSoft">
                        <td className={`${td} ${stickyDate} ${stickyEdge} z-10 font-mono`}>{ddmm(t.ngay)}</td>
                        <td className={`${td} ${stickyReceipt} ${stickyEdge} z-10 font-mono text-brand`}>{t.rcJmNo || "—"}</td>
                        <td className={`${td} ${stickyCompany} ${stickyEdge} z-10`}>
                          <span className="badge bg-[#eceee9] text-[#445]">{t.company}</span>
                        </td>
                        <td title={t.khach} className={`${td} max-w-[320px] overflow-hidden text-ellipsis font-medium`}>{t.khach}</td>
                        <td title={t.sale1 || ""} className={`${td} max-w-[260px] overflow-hidden text-ellipsis`}>{t.sale1 || "—"}</td>
                        <td className={`${td} text-right font-mono tabular-nums`}>{money(c.receipt || c.deposit)}</td>
                        <td className={td}>
                          <span className="inline-flex items-center gap-1 text-accent">
                            <BellRing className="h-3.5 w-3.5" aria-hidden="true" /> {t.bellCode || "đạt mốc"}
                          </span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={7} className="border-b border-r border-line px-3 py-8 text-center text-[12px] text-muted">Chưa có đơn rung chuông.</td></tr>
                  )}
                </tbody>
              </table>
            </StickyScrollTable>

            <Pagination
              basePath="/reports/bell"
              sp={{ ...(searchParams as Record<string, string | undefined>), pageSize: String(pageSize) }}
              page={currentPage}
              totalPages={totalPages}
              total={total}
            />
          </div>
        </section>
      </div>
    </>
  );
}
