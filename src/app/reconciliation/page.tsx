import PageHeader from "@/components/page-header";
import { ArrowLeftRight } from "lucide-react";
import { listReconciliations } from "@/lib/data";
import { money, ddmmyyyy } from "@/lib/format";

const STATUS_VI: Record<string, string> = { matched: "Khớp", pending: "Chờ", explained: "Đã giải trình" };

// Đối chiếu KT (hệ thống) ↔ US (QuickBooks) — Module 2
export default async function ReconciliationPage() {
  const rows = await listReconciliations();
  const th = "px-2.5 py-2 border border-line bg-band font-mono text-[10px] uppercase text-brand text-left whitespace-nowrap";
  const td = "px-2.5 py-1.5 border border-line";

  return (
    <>
      <PageHeader crumb="Reconciliation / Đối chiếu" title="Đối chiếu KT ↔ US (QuickBooks)" />
      <div className="p-6">
        <div className="bg-card border border-line rounded-xl p-4">
          <div className="text-[12px] text-muted mb-3 inline-flex items-center gap-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" /> So số dư hệ thống (KT) với QuickBooks (US) theo ngày/công ty; chênh lệch ≠ 0 cần lý do.
          </div>
          <div className="overflow-x-auto">
            <table className="border-collapse text-[12.5px] min-w-[760px]">
              <thead><tr>
                <th className={th}>Ngày</th><th className={th}>Công ty</th><th className={th}>Số dư KT</th>
                <th className={th}>Số dư US</th><th className={th}>Chênh lệch</th><th className={th}>Trạng thái</th><th className={th}>Lý do</th>
              </tr></thead>
              <tbody>
                {rows.length ? rows.map((r) => (
                  <tr key={r.id} className="even:bg-band hover:bg-accentSoft">
                    <td className={td}>{r.reconDate ? ddmmyyyy(r.reconDate) : "—"}</td>
                    <td className={td}><span className="badge bg-[#eceee9] text-[#445]">{r.company || "—"}</span></td>
                    <td className={td + " text-right font-mono"}>{money(r.ktBalance)}</td>
                    <td className={td + " text-right font-mono"}>{money(r.usBalance)}</td>
                    <td className={td + ` text-right font-mono ${r.difference !== 0 ? "text-danger font-bold" : "text-ok"}`}>{money(r.difference)}</td>
                    <td className={td}>{STATUS_VI[r.status] || r.status}</td>
                    <td className={td}>{r.reason || ""}</td>
                  </tr>
                )) : <tr><td colSpan={7} className={td + " text-center text-muted py-6"}>Chưa có bản ghi đối chiếu. (Nhập số dư US theo ngày — Bước 6.)</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
