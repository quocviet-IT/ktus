import PageHeader from "@/components/page-header";
import { BellRing, Settings } from "lucide-react";
import PeriodFields from "@/components/period-fields";
import { listTransactions } from "@/lib/data";
import { BELL_CODES } from "@/lib/store";
import { isBell, computeCondition, BELL_THRESHOLD } from "@/lib/rules";
import { money, ddmm } from "@/lib/format";
import { periodRange, periodLabel } from "@/lib/period";

type SP = { period?: string; day?: string; week?: string; month?: string; year?: string };

// Rung chuông (BRD §12.3)
export default async function Bell({ searchParams }: { searchParams: SP }) {
  const range = periodRange(searchParams);
  const all = await listTransactions({ from: range.from, to: range.to });
  const counts: Record<string, number> = {};
  BELL_CODES.forEach((c) => (counts[c] = 0));
  all.forEach((t) => { if (t.bellCode && counts[t.bellCode] !== undefined) counts[t.bellCode]++; });

  const rows = all.filter(isBell);
  const seen = new Set<string>();

  const th = "px-2.5 py-2 border border-line bg-band font-mono text-[10px] uppercase text-brand text-left whitespace-nowrap";
  const td = "px-2.5 py-1.5 border border-line";

  return (
    <>
      <PageHeader crumb="Báo cáo / Rung chuông" title="Báo cáo rung chuông" />
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3.5">
          {BELL_CODES.map((c) => (
            <div key={c} className="bg-card border border-line border-l-4 border-l-accent rounded-r-xl p-3">
              <div className="font-mono text-[10.5px] text-muted uppercase">Mã {c}</div>
              <div className="font-serif text-xl mt-0.5">{counts[c]} đơn</div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-line rounded-xl p-4">
          <form action="/reports/bell" className="flex items-center gap-2 mb-3 flex-wrap">
            <PeriodFields period={searchParams.period} day={searchParams.day} week={searchParams.week} month={searchParams.month} year={searchParams.year} />
            <button type="submit" className="rounded-md border border-line px-3 py-1.5 text-[13px] hover:border-accent">Lọc</button>
            <span className="text-[12px] text-muted">{periodLabel(searchParams)} · {rows.length} đơn</span>
          </form>
          <div className="bg-accentSoft rounded-lg px-3 py-2 text-[12px] text-[#6c5320] mb-3">
            <span className="inline-flex items-start gap-1.5"><Settings className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> <span>Tự gắn cờ đơn đạt mốc (≥ {money(BELL_THRESHOLD)} — <i>ngưỡng tạm, cần chốt</i>) &amp; cảnh báo nghi trùng (cùng khách/công ty).</span></span>
          </div>
          <div className="overflow-x-auto">
            <table className="border-collapse text-[12.5px] min-w-[760px]">
              <thead><tr>
                <th className={th}>DATE</th><th className={th}>JM RECEIPT#</th><th className={th}>Công ty</th><th className={th}>Customer</th>
                <th className={th}>Sale</th><th className={th}>Số tiền</th><th className={th}>Mã RC</th><th className={th}>Kiểm tra trùng</th>
              </tr></thead>
              <tbody>
                {rows.length ? rows.map((t) => {
                  const key = t.company + "|" + t.khach;
                  const dup = seen.has(key); seen.add(key);
                  const c = computeCondition(t);
                  return (
                    <tr key={t.id} className="even:bg-band hover:bg-accentSoft">
                      <td className={td}>{ddmm(t.ngay)}</td>
                      <td className={td + " font-mono text-brand"}>{t.rcJmNo || "—"}</td>
                      <td className={td}><span className="badge bg-[#eceee9] text-[#445]">{t.company}</span></td>
                      <td className={td}>{t.khach}</td>
                      <td className={td}>{t.sale1 || "—"}</td>
                      <td className={td + " text-right font-mono"}>{money(c.receipt || c.deposit)}</td>
                      <td className={td}><span className="inline-flex items-center gap-1 text-accent"><BellRing className="h-3.5 w-3.5" aria-hidden="true" /> {t.bellCode || "đạt mốc"}</span></td>
                      <td className={td}>{dup ? <span className="badge bg-[#FBEFD6] text-[#8a6512]">Nghi trùng</span> : <span className="badge bg-okSoft text-ok">OK</span>}</td>
                    </tr>
                  );
                }) : <tr><td colSpan={8} className={td + " text-center text-muted py-4"}>Chưa có đơn rung chuông.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
