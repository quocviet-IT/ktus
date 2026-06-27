import Link from "next/link";
import { Download, Filter, RotateCcw } from "lucide-react";
import PageHeader from "@/components/page-header";
import Pagination from "@/components/pagination";
import PeriodFields from "@/components/period-fields";
import StickyScrollTable from "@/components/sticky-scroll-table";
import { listPaymentMethods, listTransactions } from "@/lib/data";
import { computeCondition, TYPE_LABEL } from "@/lib/rules";
import { num } from "@/lib/format";
import { periodRange, periodLabel, byEntryAsc } from "@/lib/period";
import { normalizeSortDir } from "@/lib/list-controls";
import { currentAmountByPaymentMethod } from "@/lib/payments";

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100];

type SP = {
  company?: string;
  period?: string;
  day?: string;
  week?: string;
  month?: string;
  year?: string;
  page?: string;
  pageSize?: string;
  sort?: string;
};

export default async function SalesDaily({ searchParams }: { searchParams: SP }) {
  const company = searchParams.company === "Trans" ? "Trans" : "PC49";
  const range = periodRange(searchParams);
  const sort = normalizeSortDir(searchParams.sort);
  const requestedPageSize = Number(searchParams.pageSize);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize) ? requestedPageSize : DEFAULT_PAGE_SIZE;

  const [all, paymentMethods] = await Promise.all([
    listTransactions({ company, from: range.from, to: range.to }),
    listPaymentMethods(),
  ]);

  const rows = [...all].sort((a, b) => sort === "oldest" ? byEntryAsc(a, b) : byEntryAsc(b, a));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const requestedPage = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const page = Math.min(requestedPage, totalPages);
  const startIdx = (page - 1) * pageSize;
  const pageRows = rows.slice(startIdx, startIdx + pageSize);
  const pageFrom = total ? startIdx + 1 : 0;
  const pageTo = Math.min(total, startIdx + pageRows.length);

  const cell = (n: number) => (n ? num(n) : "");

  let tTong = 0, tPO = 0, tRec = 0, tDep = 0;
  const thu: Record<string, number> = {};
  const chi: Record<string, number> = {};
  rows.forEach((t) => {
    const c = computeCondition(t);
    tTong += c.tongCong;
    tPO += c.returnPo;
    tRec += c.receipt;
    tDep += c.deposit;
    for (const method of paymentMethods) {
      thu[method.code] = (thu[method.code] || 0) + currentAmountByPaymentMethod(t, method.code, "ar");
      chi[method.code] = (chi[method.code] || 0) + currentAmountByPaymentMethod(t, method.code, "ap");
    }
  });

  const tableMinWidth = 1200 + paymentMethods.length * 220;
  const recLabel = company === "Trans" ? "TOTAL RECEIPT" : "RECEIPT (Bán ra)";

  const control =
    "h-9 rounded-md border border-line bg-card px-2.5 text-[12px] text-ink outline-none hover:border-accent focus:border-brand focus:ring-1 focus:ring-brand";
  const toolbarButton =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-[12px] font-medium text-ink hover:border-accent hover:bg-accentSoft";
  const primaryButton =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-brand bg-brand px-3 text-[12px] font-medium text-white hover:bg-[#244C39]";
  const th =
    "border-b border-r border-line bg-band px-2 py-1.5 text-left align-bottom font-mono text-[10px] font-semibold uppercase tracking-normal text-brand whitespace-nowrap";
  const thTop = `${th} sticky top-0 z-20`;
  const thSecond = `${th} sticky top-[33px] z-20`;
  const td =
    "border-b border-r border-line px-2 py-1 text-[12px] leading-5 whitespace-nowrap";
  const tdc = `${td} text-right font-mono tabular-nums`;
  const stickyEdge = "bg-card shadow-[2px_0_0_0_#D8E0D4]";
  const stickyHead = "z-40 bg-band shadow-[2px_0_0_0_#D8E0D4]";
  const stickyStt = "sticky left-0 w-[52px] min-w-[52px] max-w-[52px]";
  const stickyType = "sticky left-[52px] w-[132px] min-w-[132px] max-w-[132px]";
  const stickyCustomer = "sticky left-[184px] w-[190px] min-w-[190px] max-w-[190px]";
  const stickyTotal = "sticky left-[374px] w-[118px] min-w-[118px] max-w-[118px]";

  const summaryItems = [
    ["TOTAL", num(tTong), tTong < 0 ? "text-danger" : "text-ink"],
    ["PURCHASE/PO", num(tPO), "text-ink"],
    [recLabel, num(tRec), "text-ok"],
    ["DEPOSIT", num(tDep), "text-ink"],
    ["Dòng", num(total), "text-ink"],
    ["Trang", `${pageFrom}-${pageTo}`, "text-ink"],
  ];

  const body = pageRows.map((t, i) => {
    const c = computeCondition(t);
    return (
      <tr key={t.id} className="hover:bg-accentSoft">
        <td className={`${td} ${stickyStt} z-10 ${stickyEdge} text-center font-mono`}>
          {startIdx + i + 1}
        </td>
        <td className={`${td} ${stickyType} z-10 ${stickyEdge} font-medium`}>
          {TYPE_LABEL[t.type]}
        </td>
        <td className={`${td} ${stickyCustomer} z-10 ${stickyEdge} max-w-[190px] overflow-hidden text-ellipsis font-medium`}>
          {t.khach}
        </td>
        <td className={`${tdc} ${stickyTotal} z-10 ${stickyEdge} font-semibold ${c.tongCong < 0 ? "text-danger" : "text-ink"}`}>
          {num(c.tongCong)}
        </td>
        <td className={`${td} min-w-[220px] max-w-[320px] overflow-hidden text-ellipsis`}>
          {t.dienGiai}
        </td>
        <td className={`${tdc} min-w-[112px]`}>{cell(c.returnPo)}</td>
        <td className={`${tdc} min-w-[128px]`}>{cell(c.receipt)}</td>
        <td className={`${tdc} min-w-[110px]`}>{cell(c.deposit)}</td>
        {paymentMethods.map((method) => (
          <td key={`ar-${method.code}`} className={`${tdc} min-w-[110px] bg-okSoft/30`}>
            {cell(currentAmountByPaymentMethod(t, method.code, "ar"))}
          </td>
        ))}
        {paymentMethods.map((method) => (
          <td key={`ap-${method.code}`} className={`${tdc} min-w-[110px] bg-dangerSoft/25`}>
            {cell(currentAmountByPaymentMethod(t, method.code, "ap"))}
          </td>
        ))}
        <td className={`${td} min-w-[90px]`}>{t.company}</td>
      </tr>
    );
  });

  return (
    <>
      <PageHeader crumb="Báo cáo / Bán hàng theo ngày" title={`Bán hàng ngày - ${company}`} />
      <div className="p-4 lg:p-6">
        <section className="rounded-lg border border-line bg-card">
          <div className="border-b border-line px-4 py-3">
            <form action="/reports/sales-daily" className="flex items-center gap-2 gap-y-3 flex-wrap">
              <Link
                href={`/reports/sales-daily?company=PC49&pageSize=${pageSize}`}
                className={`h-9 rounded-md border px-3 text-[12px] font-semibold leading-9 ${company === "PC49" ? "border-brand bg-brand text-white" : "border-line text-ink hover:border-accent hover:bg-accentSoft"}`}
              >
                PC49
              </Link>
              <Link
                href={`/reports/sales-daily?company=Trans&pageSize=${pageSize}`}
                className={`h-9 rounded-md border px-3 text-[12px] font-semibold leading-9 ${company === "Trans" ? "border-brand bg-brand text-white" : "border-line text-ink hover:border-accent hover:bg-accentSoft"}`}
              >
                Trans
              </Link>

              <span className="mx-1 h-6 border-l border-line" />
              <input type="hidden" name="company" value={company} />
              <PeriodFields period={searchParams.period} day={searchParams.day} week={searchParams.week} month={searchParams.month} year={searchParams.year} />
              <select name="sort" defaultValue={sort} className={control}>
                <option value="newest">Ngay moi nhat</option>
                <option value="oldest">Ngay cu nhat</option>
              </select>

              <label className="flex items-center gap-1.5 text-[12px] text-muted">
                Dòng/trang
                <select name="pageSize" defaultValue={String(pageSize)} className={control}>
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <button type="submit" className={primaryButton}>
                <Filter size={14} />
                Lọc
              </button>
              <Link href={`/reports/sales-daily?company=${company}&pageSize=${pageSize}`} className={toolbarButton}>
                <RotateCcw size={14} />
                Xóa lọc
              </Link>

              <div className="flex-1" />
              <div className="text-[12px] text-muted">{periodLabel(searchParams)} · {pageFrom}-{pageTo}/{total} dòng</div>
              <Link href={`/reports/sales-daily/export?company=${company}`} className={toolbarButton}>
                <Download size={14} />
                Xuất Excel
              </Link>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-line bg-line md:grid-cols-3 xl:grid-cols-6">
            {summaryItems.map(([label, value, tone]) => (
              <div key={label} className="bg-band px-3 py-2">
                <div className="font-mono text-[10px] font-semibold uppercase text-muted">{label}</div>
                <div className={`mt-0.5 font-mono text-[15px] font-bold tabular-nums ${tone}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className="p-3">
            <StickyScrollTable minWidth={tableMinWidth} bodyClassName="max-h-[calc(100vh-340px)] min-h-[260px]">
              <table className="border-collapse text-[12px]" style={{ minWidth: tableMinWidth }}>
                <thead>
                  <tr>
                    <th className={`${thTop} ${stickyStt} ${stickyHead}`} rowSpan={2}>STT</th>
                    <th className={`${thTop} ${stickyType} ${stickyHead}`} rowSpan={2}>TYPE</th>
                    <th className={`${thTop} ${stickyCustomer} ${stickyHead}`} rowSpan={2}>CUSTOMER</th>
                    <th className={`${thTop} ${stickyTotal} ${stickyHead} text-right`} rowSpan={2}>TỔNG CỘNG</th>
                    <th className={thTop} rowSpan={2}>DIỄN GIẢI</th>
                    <th className={thTop} rowSpan={2}>PURCHASE/PO</th>
                    <th className={thTop} rowSpan={2}>{recLabel}</th>
                    <th className={thTop} rowSpan={2}>DEPOSIT</th>
                    <th className={`${thTop} bg-okSoft text-center text-ok`} colSpan={paymentMethods.length}>THU TIỀN (RECEIVABLES)</th>
                    <th className={`${thTop} bg-dangerSoft text-center text-danger`} colSpan={paymentMethods.length}>CHI TIỀN (PAYABLES)</th>
                    <th className={thTop} rowSpan={2}>COMPANY</th>
                  </tr>
                  <tr>
                    {paymentMethods.map((method) => (
                      <th key={`arh-${method.code}`} className={`${thSecond} bg-okSoft/80 min-w-[110px]`}>{method.label}</th>
                    ))}
                    {paymentMethods.map((method) => (
                      <th key={`aph-${method.code}`} className={`${thSecond} bg-dangerSoft/80 min-w-[110px]`}>{method.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.length ? body : (
                    <tr>
                      <td colSpan={9 + paymentMethods.length * 2} className="border-b border-r border-line px-3 py-8 text-center text-[12px] text-muted">
                        Chưa có giao dịch.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td className={`${td} ${stickyStt} sticky bottom-0 z-30 bg-accentSoft font-mono shadow-[2px_0_0_0_#D8E0D4]`}>
                      TOTAL
                    </td>
                    <td className={`${td} ${stickyType} sticky bottom-0 z-30 bg-accentSoft shadow-[2px_0_0_0_#D8E0D4]`} />
                    <td className={`${td} ${stickyCustomer} sticky bottom-0 z-30 bg-accentSoft shadow-[2px_0_0_0_#D8E0D4]`}>
                      Tổng cộng
                    </td>
                    <td className={`${tdc} ${stickyTotal} sticky bottom-0 z-30 bg-accentSoft shadow-[2px_0_0_0_#D8E0D4] ${tTong < 0 ? "text-danger" : "text-ink"}`}>
                      {num(tTong)}
                    </td>
                    <td className={`${td} sticky bottom-0 bg-accentSoft`} />
                    <td className={`${tdc} sticky bottom-0 bg-accentSoft`}>{num(tPO)}</td>
                    <td className={`${tdc} sticky bottom-0 bg-accentSoft`}>{num(tRec)}</td>
                    <td className={`${tdc} sticky bottom-0 bg-accentSoft`}>{num(tDep)}</td>
                    {paymentMethods.map((method) => (
                      <td key={`art-${method.code}`} className={`${tdc} sticky bottom-0 bg-accentSoft`}>
                        {num(thu[method.code] || 0)}
                      </td>
                    ))}
                    {paymentMethods.map((method) => (
                      <td key={`apt-${method.code}`} className={`${tdc} sticky bottom-0 bg-accentSoft`}>
                        {num(chi[method.code] || 0)}
                      </td>
                    ))}
                    <td className={`${td} sticky bottom-0 bg-accentSoft`} />
                  </tr>
                </tfoot>
              </table>
            </StickyScrollTable>

            <Pagination
              basePath="/reports/sales-daily"
              sp={{ ...(searchParams as Record<string, string | undefined>), pageSize: String(pageSize), sort }}
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
