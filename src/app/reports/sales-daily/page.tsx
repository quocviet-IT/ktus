import Link from "next/link";
import PageHeader from "@/components/page-header";
import Pagination from "@/components/pagination";
import { listTransactions } from "@/lib/data";
import { computeCondition, TYPE_LABEL } from "@/lib/rules";
import { num } from "@/lib/format";

const PAGE_SIZE = 50;

// Báo cáo bán hàng ngày — CỘT GIỐNG EXCEL (BRD §12.1)
export default async function SalesDaily({ searchParams }: { searchParams: { company?: string; date?: string; page?: string } }) {
  const company = searchParams.company === "Trans" ? "Trans" : "PC49";
  const all = await listTransactions({ company });
  const dates = Array.from(new Set(all.map((t) => t.ngay))).sort().reverse();
  const date = searchParams.date && searchParams.date !== "all" ? searchParams.date : "all";
  const rows = date === "all" ? all : all.filter((t) => t.ngay === date);

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(startIdx, startIdx + PAGE_SIZE);

  const cell = (n: number) => (n ? num(n) : "");
  const arOf = (t: any) => ({ cash: t.arCash || 0, bankwire: t.arBankwire || 0, zelle: t.arZelle || 0, check: t.arCheck || 0 });
  const apOf = (t: any) => {
    const ap = { cash: t.apCash || 0, bankwire: t.apBankwire || 0, zelle: t.apZelle || 0, check: t.apCheck || 0 };
    const sum = ap.cash + ap.bankwire + ap.zelle + ap.check;
    if (sum === 0 && (t.type === "po" || t.type === "return" || t.type === "exchange")) ap.cash = t.expense || 0;
    return ap;
  };

  // Tổng cộng tính trên TOÀN BỘ kỳ lọc (không chỉ trang hiện tại)
  let tTong = 0, tPO = 0, tRec = 0, tDep = 0;
  const thu = { cash: 0, bankwire: 0, zelle: 0, check: 0 };
  const chi = { cash: 0, bankwire: 0, zelle: 0, check: 0 };
  rows.forEach((t) => {
    const c = computeCondition(t); tTong += c.tongCong; tPO += c.returnPo; tRec += c.receipt; tDep += c.deposit;
    const a = arOf(t), p = apOf(t);
    thu.cash += a.cash; thu.bankwire += a.bankwire; thu.zelle += a.zelle; thu.check += a.check;
    chi.cash += p.cash; chi.bankwire += p.bankwire; chi.zelle += p.zelle; chi.check += p.check;
  });

  const tdc = "px-2.5 py-1.5 border border-line text-right font-mono";
  const body = pageRows.map((t, i) => {
    const c = computeCondition(t); const a = arOf(t), p = apOf(t);
    return (
      <tr key={t.id} className="even:bg-band hover:bg-accentSoft">
        <td className="px-2.5 py-1.5 border border-line">{startIdx + i + 1}</td>
        <td className="px-2.5 py-1.5 border border-line">{TYPE_LABEL[t.type]}</td>
        <td className="px-2.5 py-1.5 border border-line">{t.dienGiai}</td>
        <td className="px-2.5 py-1.5 border border-line">{t.khach}</td>
        <td className={`${tdc} ${c.tongCong < 0 ? "text-danger" : ""}`}>{num(c.tongCong)}</td>
        <td className={tdc}>{cell(c.returnPo)}</td>
        <td className={tdc}>{cell(c.receipt)}</td>
        <td className={tdc}>{cell(c.deposit)}</td>
        <td className={tdc + " bg-okSoft/40"}>{cell(a.cash)}</td>
        <td className={tdc}>{cell(a.bankwire)}</td>
        <td className={tdc}>{cell(a.zelle)}</td>
        <td className={tdc}>{cell(a.check)}</td>
        <td className={tdc + " bg-dangerSoft/40"}>{cell(p.cash)}</td>
        <td className={tdc}>{cell(p.bankwire)}</td>
        <td className={tdc}>{cell(p.zelle)}</td>
        <td className={tdc}>{cell(p.check)}</td>
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
          <form action="/reports/sales-daily" className="flex gap-2 items-center mb-3 flex-wrap">
            <Link href="/reports/sales-daily?company=PC49" className={`px-3 py-1.5 rounded-lg text-[12px] border ${company === "PC49" ? "bg-brand text-white border-brand" : "border-line"}`}>PC49</Link>
            <Link href="/reports/sales-daily?company=Trans" className={`px-3 py-1.5 rounded-lg text-[12px] border ${company === "Trans" ? "bg-brand text-white border-brand" : "border-line"}`}>Trans</Link>
            <span className="mx-1 text-line">|</span>
            <input type="hidden" name="company" value={company} />
            <label className="text-[12px] text-muted">Chọn ngày:</label>
            <input type="date" name="date" aria-label="Chọn ngày"
              defaultValue={date === "all" ? "" : date}
              min={dates.length ? dates[dates.length - 1] : undefined}
              max={dates.length ? dates[0] : undefined}
              className="rounded-md border border-line px-2.5 py-1.5 text-[13px]" />
            <button type="submit" className="rounded-md border border-line px-3 py-1.5 text-[12px] hover:border-accent">Xem</button>
            <Link href={`/reports/sales-daily?company=${company}`}
              className={`px-3 py-1.5 rounded-lg text-[12px] border font-mono ${date === "all" ? "bg-brand text-white border-brand" : "border-line"}`}>Tất cả ngày</Link>
            <span className="text-[12px] text-muted">{date === "all" ? `${dates.length} ngày có giao dịch` : `Ngày ${date.split("-").reverse().join("/")}`}</span>
            <div className="flex-1" />
            <Link href={`/reports/sales-daily/export?company=${company}&date=${date}`}
              className="px-3 py-1.5 rounded-lg text-[12px] border border-brand text-brand hover:bg-brand hover:text-white">Xuất Excel</Link>
          </form>
          <div className="bg-accentSoft rounded-lg px-3 py-2 text-[12px] text-[#6c5320] mb-3">
            ⚙️ Cột giống file Excel; số liệu tự tổng hợp từ RC (TỔNG CỘNG = Receipt + Deposit − PO).
          </div>
          <div className="overflow-x-auto">
            <table className="border-collapse text-[12.5px] min-w-[1180px]">
              <thead>
                <tr>
                  <th className={th} rowSpan={2}>STT</th><th className={th} rowSpan={2}>TYPE</th><th className={th} rowSpan={2}>DISCRIPTION</th><th className={th} rowSpan={2}>CUSTOMER</th>
                  <th className={th} rowSpan={2}>TỔNG CỘNG</th><th className={th} rowSpan={2}>PURCHASE/PO</th><th className={th} rowSpan={2}>{recLabel}</th><th className={th} rowSpan={2}>DEPOSIT</th>
                  <th className={th + " text-center bg-okSoft text-ok"} colSpan={4}>THU TIỀN (RECEIVABLES)</th>
                  <th className={th + " text-center bg-dangerSoft text-danger"} colSpan={4}>CHI TIỀN (PAYABLES)</th>
                  <th className={th} rowSpan={2}>COMPANY</th>
                </tr>
                <tr>
                  <th className={th}>CASH</th><th className={th}>BANKWIRE</th><th className={th}>ZELLE</th><th className={th}>CHECK</th>
                  <th className={th}>CASH</th><th className={th}>BANKWIRE</th><th className={th}>ZELLE</th><th className={th}>CHECK</th>
                </tr>
              </thead>
              <tbody>{body.length ? body : <tr><td colSpan={17} className="px-2.5 py-4 border border-line text-center text-muted">Chưa có giao dịch.</td></tr>}</tbody>
              <tfoot><tr className="font-bold bg-accentSoft">
                <td colSpan={4} className="px-2.5 py-2 border border-line">TỔNG CỘNG</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(tTong)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(tPO)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(tRec)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(tDep)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(thu.cash)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(thu.bankwire)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(thu.zelle)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(thu.check)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(chi.cash)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(chi.bankwire)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(chi.zelle)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(chi.check)}</td>
                <td className="px-2.5 py-2 border border-line" />
              </tr></tfoot>
            </table>
          </div>
          <Pagination basePath="/reports/sales-daily" sp={searchParams as Record<string, string | undefined>} page={page} totalPages={totalPages} total={total} />
        </div>
      </div>
    </>
  );
}
