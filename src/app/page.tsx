import Link from "next/link";
import { ArrowRight, Bell } from "lucide-react";
import PageHeader from "@/components/page-header";
import RcRow from "@/components/rc-row";
import { listTransactionsForSummary, listTransactionsPaged } from "@/lib/data";
import { money } from "@/lib/format";
import { summarizeDashboardRows } from "@/lib/performance-summaries";

function Kpi({ label, value, alert, sub }: { label: string; value: string; alert?: boolean; sub?: React.ReactNode }) {
  return (
    <div className={`bg-card border rounded-xl p-4 relative overflow-hidden ${alert ? "border-danger" : "border-line"}`}>
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${alert ? "bg-danger" : "bg-accent"}`} />
      <div className="font-mono text-[11px] uppercase text-muted">{label}</div>
      <div className={`font-serif text-[26px] mt-1 leading-none ${alert ? "text-danger" : ""}`}>{value}</div>
      {sub && <div className="font-mono text-[11px] text-muted mt-1.5 flex items-center gap-1.5">{sub}</div>}
    </div>
  );
}

export default async function Dashboard() {
  const [summaryRows, recent] = await Promise.all([
    listTransactionsForSummary(),
    listTransactionsPaged({ sort: "newest" }, 1, 8),
  ]);
  const summary = summarizeDashboardRows(summaryRows);

  return (
    <>
      <PageHeader crumb="Tong quan" title="Bang dieu khien" />
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
          <Kpi label="Doanh thu (Receipt)" value={money(summary.revenue)} sub="tu cac RC ban/pickup" />
          <Kpi label="So RC" value={String(summary.totalCount)} sub="tong giao dich" />
          <Kpi label="RC thieu nguon" value={String(summary.missingSourceCount)} alert sub="can US bo sung" />
          <Kpi label="Don rung chuong" value={String(summary.bellCount)} sub={<><span>dat moc</span><Bell className="h-3.5 w-3.5 text-accent" aria-hidden="true" /></>} />
        </div>

        <div className="bg-card border border-line rounded-xl p-4">
          <div className="flex items-center mb-3">
            <h2 className="font-serif text-base m-0">RC moi nhat</h2>
            <div className="flex-1" />
            <Link href="/rc" className="inline-flex items-center gap-1 text-[13px] text-brand hover:text-accent">Xem so giao dich <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
          </div>
          <div>
            {recent.rows.map((t) => <RcRow key={t.id} t={t} />)}
          </div>
        </div>

        {summary.missingSourceCount > 0 && (
          <div className="mt-3.5">
            <Link href="/missing-source" className="inline-flex items-center gap-1.5 bg-brand text-white rounded-lg px-4 py-2 text-[13px] hover:bg-accent">
              Xu ly {summary.missingSourceCount} RC thieu nguon <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
