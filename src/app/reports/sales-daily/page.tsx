import Link from "next/link";
import PageHeader from "@/components/page-header";
import { listTransactions } from "@/lib/data";
import { computeCondition, TYPE_LABEL } from "@/lib/rules";
import { num } from "@/lib/format";
import type { PayMethod } from "@/lib/types";

// Báo cáo bán hàng ngày — CỘT GIỐNG EXCEL (BRD §12.1)
export default async function SalesDaily({ searchParams }: { searchParams: { company?: string; date?: string } }) {
  const company = searchParams.company === "Trans" ? "Trans" : "PC49";
  const all = await listTransactions({ company });
  const dates = Array.from(new Set(all.map((t) => t.ngay))).sort().reverse();
  const date = searchParams.date && searchParams.date !== "all" ? searchParams.date : "all";
  const rows = date === "all" ? all : all.filter((t) => t.ngay === date);

  const recvCol = (t: any, m: PayMethod) => {
    const c = computeCondition(t);
    const amt = c.receipt || c.deposit;
    const pay: PayMethod | undefined = t.payments[0]?.hinhThuc;
    return pay === m ? amt : 0;
  };
  const cell = (n: number) => (n ? num(n) : "");

  let tTong = 0, tPO = 0, tRec = 0, tDep = 0;
  const body = rows.map((t, i) => {
    const c = computeCondition(t);
    tTong += c.tongCong; tPO += c.returnPo; tRec += c.receipt; tDep += c.deposit;
    return (
      <tr key={t.id} className="even:bg-band hover:bg-accentSoft">
        <td className="px-2.5 py-1.5 border border-line">{i + 1}</td>
        <td className="px-2.5 py-1.5 border border-line">{TYPE_LABEL[t.type]}</td>
        <td className="px-2.5 py-1.5 border border-line">{t.dienGiai}</td>
        <td className="px-2.5 py-1.5 border border-line">{t.khach}</td>
        <td className={`px-2.5 py-1.5 border border-line text-right font-mono ${c.tongCong < 0 ? "text-danger" : ""}`}>{num(c.tongCong)}</td>
        <td className="px-2.5 py-1.5 border border-line text-right font-mono">{cell(c.returnPo)}</td>
        <td className="px-2.5 py-1.5 border border-line text-right font-mono">{cell(c.receipt)}</td>
        <td className="px-2.5 py-1.5 border border-line text-right font-mono">{cell(c.deposit)}</td>
        <td className="px-2.5 py-1.5 border border-line text-right font-mono">{cell(recvCol(t, "cash"))}</td>
        <td className="px-2.5 py-1.5 border border-line text-right font-mono">{cell(recvCol(t, "bank_wire"))}</td>
        <td className="px-2.5 py-1.5 border border-line text-right font-mono">{cell(recvCol(t, "zelle"))}</td>
        <td className="px-2.5 py-1.5 border border-line text-right font-mono">{cell(recvCol(t, "check"))}</td>
        <td className="px-2.5 py-1.5 border border-line">{t.company}</td>
      </tr>
    );
  });

  const th = "px-2.5 py-2 border border-line bg-band font-mono text-[10px] uppercase text-brand text-left whitespace-nowrap align-bottom";
  const recLabel = company === "Trans" ? "TOTAL RECEIPT" : "RECEIPT (Bán ra)";

  return (
    <>
      <PageHeader crumb="Báo cáo / Bán hàng theo ngày" title={`Bán hàng ngày — ${company}`} />
      <div className="p-6">
        <div className="bg-card border border-line rounded-xl p-4">
          <div className="flex gap-2 items-center mb-3 flex-wrap">
            <Link href={`/reports/sales-daily?company=PC49`} className={`px-3 py-1.5 rounded-lg text-[12px] border ${company === "PC49" ? "bg-brand text-white border-brand" : "border-line"}`}>PC49</Link>
            <Link href={`/reports/sales-daily?company=Trans`} className={`px-3 py-1.5 rounded-lg text-[12px] border ${company === "Trans" ? "bg-brand text-white border-brand" : "border-line"}`}>Trans</Link>
            <span className="mx-2 text-line">|</span>
            <Link href={`/reports/sales-daily?company=${company}`} className={`px-3 py-1.5 rounded-lg text-[12px] border font-mono ${date === "all" ? "bg-brand text-white border-brand" : "border-line"}`}>Tất cả ngày</Link>
            {dates.map((d) => (
              <Link key={d} href={`/reports/sales-daily?company=${company}&date=${d}`}
                className={`px-3 py-1.5 rounded-lg text-[12px] border font-mono ${date === d ? "bg-brand text-white border-brand" : "border-line"}`}>{d.slice(8)}/{d.slice(5, 7)}</Link>
            ))}
            <div className="flex-1" />
            <Link href={`/reports/sales-daily/export?company=${company}&date=${date}`}
              className="px-3 py-1.5 rounded-lg text-[12px] border border-brand text-brand hover:bg-brand hover:text-white">Xuất Excel</Link>
          </div>
          <div className="bg-accentSoft rounded-lg px-3 py-2 text-[12px] text-[#6c5320] mb-3">
            ⚙️ Cột giống file Excel; số liệu tự tổng hợp từ RC (TỔNG CỘNG = Receipt + Deposit − PO).
          </div>
          <div className="overflow-x-auto">
            <table className="border-collapse text-[12.5px] min-w-[900px]">
              <thead><tr>
                <th className={th}>STT</th><th className={th}>TYPE</th><th className={th}>DISCRIPTION</th><th className={th}>CUSTOMER</th>
                <th className={th}>TỔNG CỘNG</th><th className={th}>PURCHASE/PO</th><th className={th}>{recLabel}</th><th className={th}>DEPOSIT</th>
                <th className={th}>CASH</th><th className={th}>BANKWIRE</th><th className={th}>ZELLE</th><th className={th}>CHECK</th><th className={th}>COMPANY</th>
              </tr></thead>
              <tbody>{body.length ? body : <tr><td colSpan={13} className="px-2.5 py-4 border border-line text-center text-muted">Chưa có giao dịch.</td></tr>}</tbody>
              <tfoot><tr className="font-bold bg-accentSoft">
                <td colSpan={4} className="px-2.5 py-2 border border-line">TỔNG CỘNG</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(tTong)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(tPO)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(tRec)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(tDep)}</td>
                <td colSpan={5} className="px-2.5 py-2 border border-line" />
              </tr></tfoot>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
