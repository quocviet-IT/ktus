import Link from "next/link";
import PageHeader from "@/components/page-header";
import Pagination from "@/components/pagination";
import PeriodFields from "@/components/period-fields";
import { listPaymentMethods, listTransactions } from "@/lib/data";
import { computeCondition, TYPE_LABEL } from "@/lib/rules";
import { num } from "@/lib/format";
import { periodRange, periodLabel, byEntryAsc } from "@/lib/period";
import { currentAmountByPaymentMethod } from "@/lib/payments";

const PAGE_SIZE = 50;

type SP = { company?: string; period?: string; day?: string; week?: string; month?: string; year?: string; page?: string };

// Báo cáo bán hàng ngày — CỘT GIỐNG EXCEL (BRD §12.1)
export default async function SalesDaily({ searchParams }: { searchParams: SP }) {
  const company = searchParams.company === "Trans" ? "Trans" : "PC49";
  const range = periodRange(searchParams);
  const [all, paymentMethods] = await Promise.all([
    listTransactions({ company, from: range.from, to: range.to }),
    listPaymentMethods(),
  ]);
  // Sắp xếp theo THỨ TỰ NHẬP (cũ → mới), không hiển thị ngược
  const rows = [...all].sort(byEntryAsc);

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(startIdx, startIdx + PAGE_SIZE);

  const cell = (n: number) => (n ? num(n) : "");

  // Tổng cộng tính trên TOÀN BỘ kỳ lọc (không chỉ trang hiện tại)
  let tTong = 0, tPO = 0, tRec = 0, tDep = 0;
  const thu: Record<string, number> = {};
  const chi: Record<string, number> = {};
  rows.forEach((t) => {
    const c = computeCondition(t); tTong += c.tongCong; tPO += c.returnPo; tRec += c.receipt; tDep += c.deposit;
    for (const method of paymentMethods) {
      thu[method.code] = (thu[method.code] || 0) + currentAmountByPaymentMethod(t, method.code, "ar");
      chi[method.code] = (chi[method.code] || 0) + currentAmountByPaymentMethod(t, method.code, "ap");
    }
  });

  const tdc = "px-2.5 py-1.5 border border-line text-right font-mono";
  const body = pageRows.map((t, i) => {
    const c = computeCondition(t);
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
        {paymentMethods.map((method, index) => <td key={`ar-${method.code}`} className={tdc + (index === 0 ? " bg-okSoft/40" : "")}>{cell(currentAmountByPaymentMethod(t, method.code, "ar"))}</td>)}
        {paymentMethods.map((method, index) => <td key={`ap-${method.code}`} className={tdc + (index === 0 ? " bg-dangerSoft/40" : "")}>{cell(currentAmountByPaymentMethod(t, method.code, "ap"))}</td>)}
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
            <PeriodFields period={searchParams.period} day={searchParams.day} week={searchParams.week} month={searchParams.month} year={searchParams.year} />
            <button type="submit" className="rounded-md border border-line px-3 py-1.5 text-[12px] hover:border-accent">Lọc</button>
            <Link href={`/reports/sales-daily?company=${company}`} className="rounded-md border border-line px-3 py-1.5 text-[12px] text-muted hover:border-accent">Xóa lọc</Link>
            <span className="text-[12px] text-muted">{periodLabel(searchParams)} · {total} dòng</span>
            <div className="flex-1" />
            <Link href={`/reports/sales-daily/export?company=${company}`}
              className="px-3 py-1.5 rounded-lg text-[12px] border border-brand text-brand hover:bg-brand hover:text-white">Xuất Excel</Link>
          </form>
          <div className="overflow-x-auto">
            <table className="border-collapse text-[12.5px] min-w-[1180px]">
              <thead>
                <tr>
                  <th className={th} rowSpan={2}>STT</th><th className={th} rowSpan={2}>TYPE</th><th className={th} rowSpan={2}>DISCRIPTION</th><th className={th} rowSpan={2}>CUSTOMER</th>
                  <th className={th} rowSpan={2}>TỔNG CỘNG</th><th className={th} rowSpan={2}>PURCHASE/PO</th><th className={th} rowSpan={2}>{recLabel}</th><th className={th} rowSpan={2}>DEPOSIT</th>
                  <th className={th + " text-center bg-okSoft text-ok"} colSpan={paymentMethods.length}>THU TIỀN (RECEIVABLES)</th>
                  <th className={th + " text-center bg-dangerSoft text-danger"} colSpan={paymentMethods.length}>CHI TIỀN (PAYABLES)</th>
                  <th className={th} rowSpan={2}>COMPANY</th>
                </tr>
                <tr>
                  {paymentMethods.map((method) => <th key={`arh-${method.code}`} className={th}>{method.label}</th>)}
                  {paymentMethods.map((method) => <th key={`aph-${method.code}`} className={th}>{method.label}</th>)}
                </tr>
              </thead>
              <tbody>{body.length ? body : <tr><td colSpan={9 + paymentMethods.length * 2} className="px-2.5 py-4 border border-line text-center text-muted">Chưa có giao dịch.</td></tr>}</tbody>
              <tfoot><tr className="font-bold bg-accentSoft">
                <td colSpan={4} className="px-2.5 py-2 border border-line">TỔNG CỘNG</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(tTong)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(tPO)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(tRec)}</td>
                <td className="px-2.5 py-2 border border-line text-right font-mono">{num(tDep)}</td>
                {paymentMethods.map((method) => <td key={`art-${method.code}`} className="px-2.5 py-2 border border-line text-right font-mono">{num(thu[method.code] || 0)}</td>)}
                {paymentMethods.map((method) => <td key={`apt-${method.code}`} className="px-2.5 py-2 border border-line text-right font-mono">{num(chi[method.code] || 0)}</td>)}
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
