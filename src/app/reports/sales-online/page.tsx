import PageHeader from "@/components/page-header";
import PeriodFields from "@/components/period-fields";
import Pagination from "@/components/pagination";
import { listTransactions } from "@/lib/data";
import { jmKind } from "@/lib/rules";
import { ddmm } from "@/lib/format";
import { periodRange, periodLabel } from "@/lib/period";

const PAGE_SIZE = 50;
type SP = { period?: string; day?: string; week?: string; month?: string; year?: string; page?: string };

// Sales Online — CỘT GIỐNG EXCEL (BRD §12.2)
export default async function SalesOnline({ searchParams }: { searchParams: SP }) {
  const range = periodRange(searchParams);
  const all = (await listTransactions({ from: range.from, to: range.to })).filter((t) => t.saleOnline);
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const rows = all.slice(startIdx, startIdx + PAGE_SIZE);
  const th = "px-2.5 py-2 border border-line bg-band font-mono text-[10px] uppercase text-brand text-left whitespace-nowrap align-bottom";
  const td = "px-2.5 py-1.5 border border-line";

  return (
    <>
      <PageHeader crumb="Báo cáo / Sales online" title="Báo cáo theo dõi bán hàng Sales Online" />
      <div className="p-6">
        <div className="bg-card border border-line rounded-xl p-4">
          <form action="/reports/sales-online" className="flex items-center gap-2 mb-3 flex-wrap">
            <PeriodFields period={searchParams.period} day={searchParams.day} week={searchParams.week} month={searchParams.month} year={searchParams.year} />
            <button type="submit" className="rounded-md border border-line px-3 py-1.5 text-[13px] hover:border-accent">Lọc</button>
            <span className="text-[12px] text-muted">{periodLabel(searchParams)} · {total} dòng</span>
            <div className="flex-1" />
            <a href="/reports/sales-online/export"
              className="px-3 py-1.5 rounded-lg text-[12px] border border-brand text-brand hover:bg-brand hover:text-white whitespace-nowrap">Xuất Excel</a>
          </form>
          <div className="overflow-x-auto">
            <table className="border-collapse text-[12.5px] min-w-[940px]">
              <thead><tr>
                <th className={th}>NO.</th><th className={th}>DATE</th><th className={th}>CUST. NAME</th><th className={th}>FACEBOOK</th>
                <th className={th}>DECRIPTION</th><th className={th}>JM US DEPOSIT#</th><th className={th}>JM US RECEIPT N#</th>
                <th className={th}>SALE US</th><th className={th}>Sale Onl #1</th><th className={th}>% SUPPORT</th><th className={th}>TRANSACTION VALUE</th>
              </tr></thead>
              <tbody>
                {rows.length ? rows.map((t, i) => {
                  const isDep = jmKind(t.rcJmNo) === "deposit";
                  return (
                    <tr key={t.id} className="even:bg-band hover:bg-accentSoft">
                      <td className={td}>{startIdx + i + 1}</td>
                      <td className={td}>{ddmm(t.ngay)}</td>
                      <td className={td}>{t.khach}</td>
                      <td className={td}><span className="badge bg-accentSoft text-[#7a5a1d]">{t.source1 || "—"}</span></td>
                      <td className={td}>{t.dienGiai}</td>
                      <td className={td + " font-mono text-brand"}>{isDep ? t.rcJmNo : ""}</td>
                      <td className={td + " font-mono text-brand"}>{!isDep ? t.rcJmNo : ""}</td>
                      <td className={td}>{t.sale1 || "—"}</td>
                      <td className={td}>{t.saleOnline}</td>
                      <td className={td + " text-right font-mono"}>{t.pctSupport ?? ""}</td>
                      <td className={td}>{t.transactionValue || "—"}</td>
                    </tr>
                  );
                }) : <tr><td colSpan={11} className={td + " text-center text-muted py-4"}>Chưa có đơn sales online.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination basePath="/reports/sales-online" sp={searchParams as Record<string, string | undefined>} page={page} totalPages={totalPages} total={total} />
        </div>
      </div>
    </>
  );
}
