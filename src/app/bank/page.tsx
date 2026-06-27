import { Banknote, Check, Filter, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import Pagination from "@/components/pagination";
import PeriodFields from "@/components/period-fields";
import StickyScrollTable from "@/components/sticky-scroll-table";
import { createBankTransaction, toggleBankTransactionReconciled } from "@/app/actions";
import { listBankTransactionsPaged } from "@/lib/data";
import { money, ddmmyyyy } from "@/lib/format";
import { periodLabel, periodRange } from "@/lib/period";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, normalizePage, normalizePageSize, normalizeSortDir } from "@/lib/list-controls";

type SP = {
  company?: string;
  q?: string;
  sort?: string;
  period?: string;
  day?: string;
  week?: string;
  month?: string;
  year?: string;
  page?: string;
  pageSize?: string;
};

const COMPANIES = ["all", "Trans", "PC49", "TDW", "HPLLC", "3NVY", "Other"];

export default async function BankPage({ searchParams }: { searchParams: SP }) {
  const company = searchParams.company || "all";
  const sort = normalizeSortDir(searchParams.sort);
  const pageSize = normalizePageSize(searchParams.pageSize || DEFAULT_PAGE_SIZE);
  const page = normalizePage(searchParams.page);
  const range = periodRange(searchParams);
  const { rows, total } = await listBankTransactionsPaged(
    { company, q: searchParams.q, from: range.from, to: range.to, sort },
    page,
    pageSize,
  );
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
      <PageHeader crumb="Bank / Sao ke" title="Sao ke ngan hang" />
      <div className="p-4 lg:p-6">
        <section className="rounded-lg border border-line bg-card">
          <div className="border-b border-line px-4 py-3">
            <form action="/bank" className="flex flex-wrap items-center gap-2 gap-y-3">
              <input name="q" defaultValue={searchParams.q} placeholder="Tim dien giai, loai, payee..." className={`${control} min-w-[240px] flex-1`} />
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
              <Link href="/bank" className={button}><RotateCcw className="h-3.5 w-3.5" /> Xoa loc</Link>
              <div className="flex-1" />
              <span className="text-[12px] text-muted">{periodLabel(searchParams)} - {pageFrom}-{pageTo}/{total} dong</span>
            </form>
          </div>

          <form action={createBankTransaction} className="grid gap-2 border-b border-line bg-band px-4 py-3 md:grid-cols-[110px_120px_1fr_130px_120px_120px_150px_auto]">
            <select name="company" defaultValue={company === "all" ? "PC49" : company} className={control}>
              {COMPANIES.filter((c) => c !== "all").map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input name="txnDate" type="date" defaultValue={today} className={control} />
            <input name="description" required placeholder="Dien giai sao ke" className={control} />
            <input name="category" placeholder="Loai" className={control} />
            <input name="amountIn" type="number" step="0.01" placeholder="Tien vao" className={`${control} text-right font-mono`} />
            <input name="amountOut" type="number" step="0.01" placeholder="Tien ra" className={`${control} text-right font-mono`} />
            <input name="rawAccountNo" placeholder="So TK / Ref" className={control} />
            <button type="submit" className={primary}><Plus className="h-3.5 w-3.5" /> Them</button>
          </form>

          <div className="grid grid-cols-2 gap-px border-b border-line bg-line md:grid-cols-4">
            <div className="bg-band px-3 py-2"><div className="font-mono text-[10px] uppercase text-muted">Tong dong</div><div className="font-mono text-[15px] font-bold">{total.toLocaleString("en-US")}</div></div>
            <div className="bg-band px-3 py-2"><div className="font-mono text-[10px] uppercase text-muted">Da doi chieu</div><div className="font-mono text-[15px] font-bold text-ok">{rows.filter((r) => r.reconciled).length.toLocaleString("en-US")}</div></div>
            <div className="bg-band px-3 py-2"><div className="font-mono text-[10px] uppercase text-muted">Tien vao trang nay</div><div className="font-mono text-[15px] font-bold text-ok">{money(rows.reduce((s, r) => s + r.amountIn, 0))}</div></div>
            <div className="bg-band px-3 py-2"><div className="font-mono text-[10px] uppercase text-muted">Tien ra trang nay</div><div className="font-mono text-[15px] font-bold text-danger">{money(rows.reduce((s, r) => s + r.amountOut, 0))}</div></div>
          </div>

          <div className="p-3">
            <StickyScrollTable minWidth={980} bodyClassName="max-h-[calc(100vh-390px)] min-h-[280px]">
              <table className="min-w-[980px] border-collapse text-[12px]">
                <thead>
                  <tr>
                    <th className={th}>Ngay</th>
                    <th className={th}>Cong ty</th>
                    <th className={th}>Dien giai</th>
                    <th className={th}>Loai</th>
                    <th className={`${th} text-right`}>Tien vao</th>
                    <th className={`${th} text-right`}>Tien ra</th>
                    <th className={th}>So TK / Ref</th>
                    <th className={th}>Doi chieu</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map((b) => (
                    <tr key={b.id} className="hover:bg-accentSoft">
                      <td className={`${td} whitespace-nowrap`}>{b.ngay ? ddmmyyyy(b.ngay) : "-"}</td>
                      <td className={td}><span className="badge bg-[#eceee9] text-[#445]">{b.company || "-"}</span></td>
                      <td className={`${td} min-w-[300px]`}>{b.description}</td>
                      <td className={td}>{b.category || "-"}</td>
                      <td className={`${td} text-right font-mono text-ok tabular-nums`}>{b.amountIn ? money(b.amountIn) : ""}</td>
                      <td className={`${td} text-right font-mono text-danger tabular-nums`}>{b.amountOut ? money(b.amountOut) : ""}</td>
                      <td className={`${td} font-mono text-muted`}>{b.rawAccountNo || ""}</td>
                      <td className={td}>
                        <form action={toggleBankTransactionReconciled.bind(null, b.id)}>
                          <input type="hidden" name="reconciled" value={String(b.reconciled)} />
                          <button type="submit" className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11.5px] ${b.reconciled ? "border-ok text-ok" : "border-line text-muted hover:border-accent"}`}>
                            {b.reconciled && <Check className="h-3.5 w-3.5" />} {b.reconciled ? "Da doi chieu" : "Chua"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={8} className="border-b border-r border-line px-3 py-8 text-center text-[12px] text-muted">Chua co du lieu sao ke phu hop.</td></tr>
                  )}
                </tbody>
              </table>
            </StickyScrollTable>
            <Pagination basePath="/bank" sp={{ ...(searchParams as Record<string, string | undefined>), pageSize: String(pageSize), sort }} page={page} totalPages={totalPages} total={total} />
          </div>
        </section>
      </div>
    </>
  );
}
