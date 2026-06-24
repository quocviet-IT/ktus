import Link from "next/link";
import PageHeader from "@/components/page-header";
import PeriodFields from "@/components/period-fields";
import Pagination from "@/components/pagination";
import { listTransactions } from "@/lib/data";
import { COMPANIES } from "@/lib/store";
import { STATUS_LABEL } from "@/lib/rules";
import { rcJmCells, rcJmHeaders } from "@/lib/excel-ledger";
import { periodRange, periodLabel } from "@/lib/period";
import type { CompanyCode } from "@/lib/types";

const PAGE_SIZE = 50;

type SP = { company?: string; status?: string; q?: string; period?: string; day?: string; week?: string; month?: string; year?: string; page?: string };

export default async function SoGiaoDich({ searchParams }: { searchParams: SP }) {
  const selectedCompany = (searchParams.company || "PC49") as CompanyCode | "all";
  const status = searchParams.status || "all";
  const range = periodRange(searchParams);

  const all = await listTransactions({ company: selectedCompany, status, q: searchParams.q, from: range.from, to: range.to });

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const rows = all.slice(start, start + PAGE_SIZE);

  const headers = rcJmHeaders(selectedCompany);
  const th = "border border-line bg-band px-2.5 py-2 text-left font-mono text-[10px] uppercase text-brand whitespace-nowrap align-bottom";
  const td = "border border-line px-2.5 py-1.5 align-top";

  return (
    <>
      <PageHeader crumb="Hàng ngày / Sổ giao dịch" title={selectedCompany === "Trans" ? "TRANS RC JM (FINAL)" : selectedCompany === "all" ? "Sổ RC JM (tất cả)" : "PC49 RC JM (FINAL)"}>
        <Link href="/rc/new" className="rounded-md bg-brand px-3 py-2 text-[13px] text-white hover:bg-accent">＋ Nhập RC</Link>
      </PageHeader>

      <div className="p-6">
        <form className="mb-3 flex flex-wrap items-center gap-2" action="/rc">
          <input name="q" defaultValue={searchParams.q} placeholder="Tìm RC#, khách, diễn giải..."
            className="min-w-[220px] rounded-md border border-line px-3 py-1.5 text-[13px]" />
          <select name="company" aria-label="Công ty" defaultValue={selectedCompany} className="rounded-md border border-line px-2 py-1.5 text-[13px]">
            <option value="PC49">PC49 RC JM</option>
            <option value="Trans">TRANS RC JM</option>
            <option value="all">Tất cả</option>
            {COMPANIES.filter((c) => c !== "PC49" && c !== "Trans").map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="status" aria-label="Trạng thái" defaultValue={status} className="rounded-md border border-line px-2 py-1.5 text-[13px]">
            <option value="all">Mọi trạng thái</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <PeriodFields period={searchParams.period} day={searchParams.day} week={searchParams.week} month={searchParams.month} year={searchParams.year} />
          <button type="submit" className="rounded-md border border-line px-3 py-1.5 text-[13px] hover:border-accent">Lọc</button>
          <Link href="/rc" className="rounded-md border border-line px-3 py-1.5 text-[13px] text-muted hover:border-accent">Xóa lọc</Link>
          <div className="flex-1" />
          <span className="text-[12px] text-muted">{periodLabel(searchParams)} · {total} dòng</span>
        </form>

        <div className="mb-3 rounded-md border border-line bg-accentSoft px-3 py-2 text-[12px] text-[#6c5320]">
          Bảng bám cột theo Excel RC JM. Lọc theo ngày/tuần/tháng/năm + phân trang ({PAGE_SIZE} dòng/trang). Bấm cột NO # để mở chi tiết.
        </div>

        <div className="overflow-x-auto rounded-md border border-line bg-card">
          <table className="min-w-[1180px] border-collapse text-[12.5px]">
            <thead>
              <tr>{headers.map((h) => <th key={h} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((t, i) => (
                <tr key={t.id} className="even:bg-band hover:bg-accentSoft">
                  {rcJmCells(t, start + i, selectedCompany).map((cell, k) => (
                    <td key={k} className={`${td} ${typeof cell === "number" || /^\d[\d,.]*$/.test(String(cell)) ? "text-right font-mono" : ""}`}>
                      {k === 0 ? <Link href={`/rc/${t.id}`} className="text-brand hover:text-accent">{cell}</Link> : cell}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr><td colSpan={headers.length} className="border border-line px-3 py-6 text-center text-muted">Không có giao dịch phù hợp.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination basePath="/rc" sp={searchParams as Record<string, string | undefined>} page={page} totalPages={totalPages} total={total} />
      </div>
    </>
  );
}
