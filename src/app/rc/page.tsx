import Link from "next/link";
import PageHeader from "@/components/page-header";
import { listTransactions } from "@/lib/data";
import { COMPANIES } from "@/lib/store";
import { STATUS_LABEL } from "@/lib/rules";
import { rcJmCells, rcJmHeaders } from "@/lib/excel-ledger";
import type { CompanyCode } from "@/lib/types";

export default async function SoGiaoDich({ searchParams }: { searchParams: { company?: string; status?: string; q?: string } }) {
  const selectedCompany = (searchParams.company || "PC49") as CompanyCode | "all";
  const status = searchParams.status || "all";
  const rows = await listTransactions({ ...searchParams, company: selectedCompany });
  const headers = rcJmHeaders(selectedCompany);

  const th = "border border-line bg-band px-2.5 py-2 text-left font-mono text-[10px] uppercase text-brand whitespace-nowrap align-bottom";
  const td = "border border-line px-2.5 py-1.5 align-top";

  return (
    <>
      <PageHeader crumb="Hang ngay / So giao dich" title={selectedCompany === "Trans" ? "TRANS RC JM (FINAL)" : "PC49 RC JM (FINAL)"}>
        <Link href="/rc/new" className="rounded-md bg-brand px-3 py-2 text-[13px] text-white hover:bg-accent">Nhap RC</Link>
      </PageHeader>

      <div className="p-6">
        <form className="mb-3 flex flex-wrap items-center gap-2" action="/rc">
          <input name="q" defaultValue={searchParams.q} placeholder="Tim RC#, khach, dien giai..."
            className="min-w-[240px] rounded-md border border-line px-3 py-1.5 text-[13px]" />
          <select name="company" aria-label="Cong ty" defaultValue={selectedCompany} className="rounded-md border border-line px-2 py-1.5 text-[13px]">
            <option value="PC49">PC49 RC JM</option>
            <option value="Trans">TRANS RC JM</option>
            <option value="all">Tat ca</option>
            {COMPANIES.filter((c) => c !== "PC49" && c !== "Trans").map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="status" aria-label="Trang thai" defaultValue={status} className="rounded-md border border-line px-2 py-1.5 text-[13px]">
            <option value="all">Moi trang thai</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="submit" className="rounded-md border border-line px-3 py-1.5 text-[13px] hover:border-accent">Loc</button>
          <div className="flex-1" />
          <span className="text-[12px] text-muted">{rows.length} dong</span>
        </form>

        <div className="mb-3 rounded-md border border-line bg-accentSoft px-3 py-2 text-[12px] text-[#6c5320]">
          Bang nay bam cot theo Excel RC JM: Date/Description/Customer/Expense/Receipt/Deposit tu USBC101; Receipt#, Source, Sale, Online la phan cap nhat theo JM.
        </div>

        <div className="overflow-x-auto rounded-md border border-line bg-card">
          <table className="min-w-[1180px] border-collapse text-[12.5px]">
            <thead>
              <tr>{headers.map((h) => <th key={h} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((t, i) => (
                <tr key={t.id} className="even:bg-band hover:bg-accentSoft">
                  {rcJmCells(t, i, selectedCompany).map((cell, k) => (
                    <td key={k} className={`${td} ${typeof cell === "number" || /^\d[\d,.]*$/.test(String(cell)) ? "text-right font-mono" : ""}`}>
                      {k === 0 ? <Link href={`/rc/${t.id}`} className="text-brand hover:text-accent">{cell}</Link> : cell}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr><td colSpan={headers.length} className="border border-line px-3 py-6 text-center text-muted">Khong co giao dich phu hop.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-[12px] text-muted">
          Don Cancel van giu o ngay goc. Bam vao cot NO # de mo chi tiet don.
        </p>
      </div>
    </>
  );
}
