import PageHeader from "@/components/page-header";
import { Banknote, Check } from "lucide-react";
import { listBankTransactions } from "@/lib/data";
import { money, ddmmyyyy } from "@/lib/format";

// Sao kê ngân hàng (Module 2) — tách riêng khỏi RC, chỉ nối qua đối chiếu
export default async function BankPage({ searchParams }: { searchParams: { company?: string } }) {
  const company = searchParams.company || "all";
  const rows = await listBankTransactions({ company });
  const companies = ["all", "Trans", "PC49", "TDW", "HPLLC", "3NVY", "Other"];
  const th = "px-2.5 py-2 border border-line bg-band font-mono text-[10px] uppercase text-brand text-left whitespace-nowrap";
  const td = "px-2.5 py-1.5 border border-line";

  return (
    <>
      <PageHeader crumb="Bank / Sao kê" title="Sao kê ngân hàng" />
      <div className="p-6">
        <div className="bg-card border border-line rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {companies.map((c) => (
              <a key={c} href={`/bank?company=${c}`}
                className={`px-3 py-1.5 rounded-lg text-[12px] border ${company === c ? "bg-brand text-white border-brand" : "border-line hover:border-accent"}`}>
                {c === "all" ? "Tất cả" : c}
              </a>
            ))}
            <div className="flex-1" />
            <span className="text-[12px] text-muted inline-flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" aria-hidden="true" /> {rows.length} dòng</span>
          </div>
          <div className="overflow-x-auto">
            <table className="border-collapse text-[12.5px] min-w-[820px]">
              <thead><tr>
                <th className={th}>Ngày</th><th className={th}>Công ty</th><th className={th}>Diễn giải</th><th className={th}>Loại</th>
                <th className={th}>Tiền vào</th><th className={th}>Tiền ra</th><th className={th}>Đối chiếu</th>
              </tr></thead>
              <tbody>
                {rows.length ? rows.map((b) => (
                  <tr key={b.id} className="even:bg-band hover:bg-accentSoft">
                    <td className={td}>{b.ngay ? ddmmyyyy(b.ngay) : "—"}</td>
                    <td className={td}><span className="badge bg-[#eceee9] text-[#445]">{b.company || "—"}</span></td>
                    <td className={td}>{b.description}</td>
                    <td className={td}>{b.category}</td>
                    <td className={td + " text-right font-mono text-ok"}>{b.amountIn ? money(b.amountIn) : ""}</td>
                    <td className={td + " text-right font-mono text-danger"}>{b.amountOut ? money(b.amountOut) : ""}</td>
                    <td className={td}>{b.reconciled ? <span className="inline-flex items-center gap-1 text-ok"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Đã đối chiếu</span> : <span className="text-muted">Chưa</span>}</td>
                  </tr>
                )) : <tr><td colSpan={7} className={td + " text-center text-muted py-6"}>Chưa có dữ liệu sao kê. (Import từ Rocket — Bước 5.)</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
