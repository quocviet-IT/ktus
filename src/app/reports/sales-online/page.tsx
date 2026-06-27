import { Download, Filter, RotateCcw } from "lucide-react";
import PageHeader from "@/components/page-header";
import PeriodFields from "@/components/period-fields";
import Pagination from "@/components/pagination";
import StickyScrollTable from "@/components/sticky-scroll-table";
import { listTransactions } from "@/lib/data";
import { jmKind } from "@/lib/rules";
import { ddmm } from "@/lib/format";
import { periodRange, periodLabel, byEntryAsc } from "@/lib/period";
import { normalizeSortDir } from "@/lib/list-controls";
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
  sort?: string;
};

export default async function SalesOnline({ searchParams }: { searchParams: SP }) {
  const range = periodRange(searchParams);
  const sort = normalizeSortDir(searchParams.sort);
  const requestedPageSize = Number(searchParams.pageSize);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize) ? requestedPageSize : DEFAULT_PAGE_SIZE;
  const withOnline = (await listTransactions({ from: range.from, to: range.to }))
    .filter((t) => t.saleOnline || t.saleOnline2 || t.saleOnline3)
    .sort(byEntryAsc);

  const byOrder = new Map<string, Transaction>();
  for (const t of withOnline) {
    const key = t.oldReceiptNo || t.rcJmNo || t.id;
    const prev = byOrder.get(key);
    if (!prev || (jmKind(t.rcJmNo) === "sale" && jmKind(prev.rcJmNo) !== "sale")) byOrder.set(key, t);
  }
  const all = [...byOrder.values()].sort((a, b) => sort === "oldest" ? byEntryAsc(a, b) : byEntryAsc(b, a));

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const rows = all.slice(startIdx, startIdx + pageSize);
  const pageFrom = total ? startIdx + 1 : 0;
  const pageTo = Math.min(total, startIdx + rows.length);
  const salesOnlineCount = all.reduce((sum, t) => sum + [t.saleOnline, t.saleOnline2, t.saleOnline3].filter(Boolean).length, 0);
  const supportCount = all.filter((t) => t.pctSupport != null && t.pctSupport !== 0).length;

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
  const stickyNo = "sticky left-0 w-[56px] min-w-[56px] max-w-[56px]";
  const stickyDate = "sticky left-[56px] w-[86px] min-w-[86px] max-w-[86px]";
  const stickyCustomer = "sticky left-[142px] w-[190px] min-w-[190px] max-w-[190px]";
  const tableMinWidth = 1540;

  return (
    <>
      <PageHeader crumb="Báo cáo / Sales online" title="Báo cáo theo dõi bán hàng Sales Online" />
      <div className="p-4 lg:p-6">
        <section className="rounded-lg border border-line bg-card">
          <div className="border-b border-line px-4 py-3">
            <form action="/reports/sales-online" className="flex items-center gap-2 gap-y-3 flex-wrap">
              <PeriodFields period={searchParams.period} day={searchParams.day} week={searchParams.week} month={searchParams.month} year={searchParams.year} />
              <select name="sort" defaultValue={sort} className={control}>
                <option value="newest">Ngay moi nhat</option>
                <option value="oldest">Ngay cu nhat</option>
              </select>
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
              <a href={`/reports/sales-online?pageSize=${pageSize}`} className={toolbarButton}>
                <RotateCcw size={14} />
                Xóa lọc
              </a>
              <div className="flex-1" />
              <span className="text-[12px] text-muted">{periodLabel(searchParams)} · {pageFrom}-{pageTo}/{total} dòng</span>
              <a href="/reports/sales-online/export" className={toolbarButton}>
                <Download size={14} />
                Xuất Excel
              </a>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-line bg-line md:grid-cols-4">
            <div className="bg-band px-3 py-2">
              <div className="font-mono text-[10px] font-semibold uppercase text-muted">Kỳ</div>
              <div className="mt-0.5 text-[14px] font-semibold text-ink">{periodLabel(searchParams)}</div>
            </div>
            <div className="bg-band px-3 py-2">
              <div className="font-mono text-[10px] font-semibold uppercase text-muted">Đơn sales online</div>
              <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">{total.toLocaleString("en-US")}</div>
            </div>
            <div className="bg-band px-3 py-2">
              <div className="font-mono text-[10px] font-semibold uppercase text-muted">Sale online gán</div>
              <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">{salesOnlineCount.toLocaleString("en-US")}</div>
            </div>
            <div className="bg-band px-3 py-2">
              <div className="font-mono text-[10px] font-semibold uppercase text-muted">Có support</div>
              <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">{supportCount.toLocaleString("en-US")}</div>
            </div>
          </div>

          <div className="p-3">
            <StickyScrollTable minWidth={tableMinWidth} bodyClassName="max-h-[calc(100vh-330px)] min-h-[320px]">
              <table className="border-collapse text-[12px]" style={{ minWidth: tableMinWidth }}>
                <thead>
                  <tr>
                    <th className={`${th} ${stickyNo} ${stickyHead}`}>NO.</th>
                    <th className={`${th} ${stickyDate} ${stickyHead}`}>DATE</th>
                    <th className={`${th} ${stickyCustomer} ${stickyHead}`}>CUST. NAME</th>
                    <th className={`${th} min-w-[104px]`}>FACEBOOK</th>
                    <th className={`${th} min-w-[260px]`}>DECRIPTION</th>
                    <th className={`${th} min-w-[140px]`}>JM US DEPOSIT#</th>
                    <th className={`${th} min-w-[150px]`}>JM US RECEIPT N#</th>
                    <th className={`${th} min-w-[130px]`}>SALE US</th>
                    <th className={`${th} min-w-[126px]`}>Sale Onl #1</th>
                    <th className={`${th} min-w-[126px]`}>Sale Onl #2</th>
                    <th className={`${th} min-w-[126px]`}>Sale Onl #3</th>
                    <th className={`${th} min-w-[122px] text-right`}>% SUPPORT</th>
                    <th className={`${th} min-w-[160px]`}>TRANSACTION VALUE</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map((t, i) => {
                    const isSale = jmKind(t.rcJmNo) === "sale";
                    const depNo = t.oldReceiptNo || (jmKind(t.rcJmNo) === "deposit" ? t.rcJmNo : "");
                    const recNo = isSale ? t.rcJmNo : "";
                    return (
                      <tr key={t.id} className="hover:bg-accentSoft">
                        <td className={`${td} ${stickyNo} ${stickyEdge} z-10 text-center font-mono`}>{startIdx + i + 1}</td>
                        <td className={`${td} ${stickyDate} ${stickyEdge} z-10 font-mono`}>{ddmm(t.ngay)}</td>
                        <td title={t.khach} className={`${td} ${stickyCustomer} ${stickyEdge} z-10 overflow-hidden text-ellipsis font-medium`}>{t.khach}</td>
                        <td className={td}><span className="badge bg-accentSoft text-[#7a5a1d]">{t.source1 || "—"}</span></td>
                        <td title={t.dienGiai} className={`${td} max-w-[300px] overflow-hidden text-ellipsis`}>{t.dienGiai}</td>
                        <td className={`${td} font-mono text-brand`}>{depNo}</td>
                        <td className={`${td} font-mono text-brand`}>{recNo}</td>
                        <td title={t.sale1 || ""} className={`${td} max-w-[150px] overflow-hidden text-ellipsis`}>{(t.sale1 || "").split(";")[0].trim() || "—"}</td>
                        <td title={t.saleOnline || ""} className={`${td} max-w-[150px] overflow-hidden text-ellipsis`}>{t.saleOnline || "—"}</td>
                        <td title={t.saleOnline2 || ""} className={`${td} max-w-[150px] overflow-hidden text-ellipsis`}>{t.saleOnline2 || "—"}</td>
                        <td title={t.saleOnline3 || ""} className={`${td} max-w-[150px] overflow-hidden text-ellipsis`}>{t.saleOnline3 || "—"}</td>
                        <td className={`${td} text-right font-mono tabular-nums`}>{t.pctSupport ?? ""}</td>
                        <td title={t.transactionValue || ""} className={`${td} max-w-[190px] overflow-hidden text-ellipsis`}>{t.transactionValue || "—"}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={13} className="border-b border-r border-line px-3 py-8 text-center text-[12px] text-muted">Chưa có đơn sales online.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </StickyScrollTable>

            <Pagination
              basePath="/reports/sales-online"
              sp={{ ...(searchParams as Record<string, string | undefined>), pageSize: String(pageSize), sort }}
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
