import Link from "next/link";
import PageHeader from "@/components/page-header";
import RcRow from "@/components/rc-row";
import { listTransactions } from "@/lib/data";
import { computeCondition, isMissingSource, isBell } from "@/lib/rules";
import { money } from "@/lib/format";

function Kpi({ label, value, alert, sub }: { label: string; value: string; alert?: boolean; sub?: string }) {
  return (
    <div className={`bg-card border rounded-xl p-4 relative overflow-hidden ${alert ? "border-danger" : "border-line"}`}>
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${alert ? "bg-danger" : "bg-accent"}`} />
      <div className="font-mono text-[11px] uppercase text-muted">{label}</div>
      <div className={`font-serif text-[26px] mt-1 leading-none ${alert ? "text-danger" : ""}`}>{value}</div>
      {sub && <div className="font-mono text-[11px] text-muted mt-1.5">{sub}</div>}
    </div>
  );
}

export default async function Dashboard() {
  const all = await listTransactions();
  const revenue = all.reduce((s, t) => s + computeCondition(t).receipt, 0);
  const missing = all.filter(isMissingSource);
  const bell = all.filter(isBell);

  return (
    <>
      <PageHeader crumb="Tổng quan" title="Bảng điều khiển" />
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
          <Kpi label="Doanh thu (Receipt)" value={money(revenue)} sub="từ các RC bán/pickup" />
          <Kpi label="Số RC" value={String(all.length)} sub="tổng giao dịch" />
          <Kpi label="RC thiếu nguồn" value={String(missing.length)} alert sub="cần US bổ sung" />
          <Kpi label="Đơn rung chuông" value={String(bell.length)} sub="đạt mốc 🔔" />
        </div>

        <div className="bg-card border border-line rounded-xl p-4">
          <div className="flex items-center mb-3">
            <h2 className="font-serif text-base m-0">RC mới nhất</h2>
            <div className="flex-1" />
            <Link href="/rc" className="text-[13px] text-brand hover:text-accent">Xem sổ giao dịch →</Link>
          </div>
          <div>
            {all.slice(0, 8).map((t) => <RcRow key={t.id} t={t} />)}
          </div>
        </div>

        {missing.length > 0 && (
          <div className="mt-3.5">
            <Link href="/missing-source" className="inline-block bg-brand text-white rounded-lg px-4 py-2 text-[13px] hover:bg-accent">
              Xử lý {missing.length} RC thiếu nguồn →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
