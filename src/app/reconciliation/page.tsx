import { ArrowLeftRight, Filter, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import Pagination from "@/components/pagination";
import PeriodFields from "@/components/period-fields";
import StickyScrollTable from "@/components/sticky-scroll-table";
import { createReconciliation } from "@/app/actions";
import { listReconciliationsPaged } from "@/lib/data";
import { money, ddmmyyyy } from "@/lib/format";
import { periodLabel, periodRange } from "@/lib/period";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, normalizePage, normalizePageSize, normalizeSortDir } from "@/lib/list-controls";

const STATUS_VI: Record<string, string> = { matched: "Khop", pending: "Cho xu ly", explained: "Da giai trinh" };
const COMPANIES = ["all", "Trans", "PC49", "TDW", "HPLLC", "3NVY", "Other"];

type SP = {
  company?: string;
  sort?: string;
  period?: string;
  day?: string;
  week?: string;
  month?: string;
  year?: string;
  page?: string;
  pageSize?: string;
};

export default async function ReconciliationPage({ searchParams }: { searchParams: SP }) {
  const company = searchParams.company || "all";
  const sort = normalizeSortDir(searchParams.sort);
  const pageSize = normalizePageSize(searchParams.pageSize || DEFAULT_PAGE_SIZE);
  const page = normalizePage(searchParams.page);
  const range = periodRange(searchParams);
  const { rows, total } = await listReconciliationsPaged({ company, from: range.from, to: range.to, sort }, page, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageFrom = total ? start + 1 : 0;
  const pageTo = Math.min(total, start + rows.length);
  const today = new Date().toISOString().slice(0, 10);

  const control = "h-9 rounded-md border border-line bg-card px-2.5 text-[12px] text-ink outline-none hover:border-accent focus:border-brand focus:ring-1 focus:ring-brand";
  const button = "inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-[12px] font-medium hover:border-accent hover:bg-accentSoft";
  const primary = "inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-[12px] font-medium text-white hover:bg-accent";
  const th = "sticky top-0 z-20 border-b border-r border-line bg-band px-2 py-1.5 text-left font-mono text-[10px] font-semibold uppercase text-brand whitespace-nowrap";
  const td = "border-b border-r border-line px-2 py-1.5 text-[12px] leading-5 align-top";

  return (
    <>
      <PageHeader crumb="Reconciliation / Doi chieu" title="Doi chieu KT-US" />
      <div className="p-4 lg:p-6">
        <section className="rounded-lg border border-line bg-card">
          <div className="border-b border-line px-4 py-3">
            <form action="/reconciliation" className="flex flex-wrap items-center gap-2 gap-y-3">
              <select name="company" defaultValue={company} className={control}>
                {COMPANIES.map((c) => <option key={c} value={c}>{c === "all" ? "Tat ca cong ty" : c}</option>)}
              </select>
              <select name="sort" defaultValue={sort} className={control}>
                <option value="newest">Ngay moi nhat</option>
                <option value="oldest">Ngay cu nhat</option>
              </select>
              <PeriodFields period={searchParams.period} day={searchParams.day} week={searchParams.week} month={searchParams.month} year={searchParams.year} />
              <label className="flex items-center gap-1.5 text-[12px] text-muted">
                Dong/trang
                <select name="pageSize" defaultValue={String(pageSize)} className={control}>
                  {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <button className={primary} type="submit"><Filter className="h-3.5 w-3.5" /> Loc</button>
              <Link href="/reconciliation" className={button}><RotateCcw className="h-3.5 w-3.5" /> Xoa loc</Link>
              <div className="flex-1" />
              <span className="text-[12px] text-muted">{periodLabel(searchParams)} - {pageFrom}-{pageTo}/{total} dong</span>
            </form>
          </div>

          <form action={createReconciliation} className="grid gap-2 border-b border-line bg-band px-4 py-3 md:grid-cols-[110px_130px_140px_140px_150px_1fr_auto]">
            <select name="company" defaultValue={company === "all" ? "PC49" : company} className={control}>
              {COMPANIES.filter((c) => c !== "all").map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input name="reconDate" type="date" defaultValue={today} className={control} />
            <input name="ktBalance" type="number" step="0.01" placeholder="So du KT" className={`${control} text-right font-mono`} />
            <input name="usBalance" type="number" step="0.01" placeholder="So du US" className={`${control} text-right font-mono`} />
            <select name="status" defaultValue="" className={control}>
              <option value="">Tu tinh trang thai</option>
              <option value="matched">Khop</option>
              <option value="pending">Cho xu ly</option>
              <option value="explained">Da giai trinh</option>
            </select>
            <input name="reason" placeholder="Ly do chenh lech neu co" className={control} />
            <button type="submit" className={primary}><Plus className="h-3.5 w-3.5" /> Them</button>
          </form>

          <div className="grid grid-cols-2 gap-px border-b border-line bg-line md:grid-cols-4">
            <div className="bg-band px-3 py-2"><div className="font-mono text-[10px] uppercase text-muted">Tong dong</div><div className="font-mono text-[15px] font-bold">{total.toLocaleString("en-US")}</div></div>
            <div className="bg-band px-3 py-2"><div className="font-mono text-[10px] uppercase text-muted">Khop trang nay</div><div className="font-mono text-[15px] font-bold text-ok">{rows.filter((r) => r.status === "matched").length}</div></div>
            <div className="bg-band px-3 py-2"><div className="font-mono text-[10px] uppercase text-muted">Can xu ly</div><div className="font-mono text-[15px] font-bold text-danger">{rows.filter((r) => r.status !== "matched").length}</div></div>
            <div className="bg-band px-3 py-2"><div className="font-mono text-[10px] uppercase text-muted">Chenh lech trang nay</div><div className="font-mono text-[15px] font-bold">{money(rows.reduce((s, r) => s + r.difference, 0))}</div></div>
          </div>

          <div className="p-3">
            <StickyScrollTable minWidth={860} bodyClassName="max-h-[calc(100vh-390px)] min-h-[280px]">
              <table className="min-w-[860px] border-collapse text-[12px]">
                <thead>
                  <tr>
                    <th className={th}>Ngay</th>
                    <th className={th}>Cong ty</th>
                    <th className={`${th} text-right`}>So du KT</th>
                    <th className={`${th} text-right`}>So du US</th>
                    <th className={`${th} text-right`}>Chenh lech</th>
                    <th className={th}>Trang thai</th>
                    <th className={th}>Ly do</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map((r) => (
                    <tr key={r.id} className="hover:bg-accentSoft">
                      <td className={`${td} whitespace-nowrap`}>{r.reconDate ? ddmmyyyy(r.reconDate) : "-"}</td>
                      <td className={td}><span className="badge bg-[#eceee9] text-[#445]">{r.company || "-"}</span></td>
                      <td className={`${td} text-right font-mono tabular-nums`}>{money(r.ktBalance)}</td>
                      <td className={`${td} text-right font-mono tabular-nums`}>{money(r.usBalance)}</td>
                      <td className={`${td} text-right font-mono tabular-nums ${r.difference !== 0 ? "text-danger font-bold" : "text-ok"}`}>{money(r.difference)}</td>
                      <td className={td}>{STATUS_VI[r.status] || r.status}</td>
                      <td className={`${td} min-w-[240px]`}>{r.reason || ""}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} className="border-b border-r border-line px-3 py-8 text-center text-[12px] text-muted">Chua co ban ghi doi chieu phu hop.</td></tr>
                  )}
                </tbody>
              </table>
            </StickyScrollTable>
            <Pagination basePath="/reconciliation" sp={{ ...(searchParams as Record<string, string | undefined>), pageSize: String(pageSize), sort }} page={page} totalPages={totalPages} total={total} />
          </div>
        </section>
      </div>
    </>
  );
}
