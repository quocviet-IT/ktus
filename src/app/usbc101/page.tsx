import Link from "next/link";
import PageHeader from "@/components/page-header";
import PeriodFields from "@/components/period-fields";
import Pagination from "@/components/pagination";
import { listTransactions } from "@/lib/data";
import { money, num } from "@/lib/format";
import { periodRange, periodLabel } from "@/lib/period";
import {
  USBC101_COMPANIES, LEDGER_COLUMNS, ledgerCells, isFx, computeBalances,
} from "@/lib/usbc101";

const PAGE_SIZE = 50;
type SP = { sheet?: string; period?: string; day?: string; week?: string; month?: string; year?: string; page?: string };

export default async function Usbc101({ searchParams }: { searchParams: SP }) {
  const sheet = searchParams.sheet || "balance";
  const range = periodRange(searchParams);
  const tabs = ["balance", ...USBC101_COMPANIES];

  const all = await listTransactions({ from: range.from, to: range.to });

  return (
    <>
      <PageHeader crumb="USBC101 / Account Balance" title="USBC101 — ACCOUNT BALANCE 2026" />
      <div className="p-6">
        {/* tabs sheet */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tabs.map((s) => {
            const label = s === "balance" ? "BALANCE ACCOUNT" : s;
            const active = sheet === s;
            return (
              <Link key={s} href={`/usbc101?sheet=${s}`}
                className={`px-3 py-1.5 rounded-md text-[12.5px] border ${active ? "bg-brand text-white border-brand" : "border-line hover:border-accent"}`}>
                {label}
              </Link>
            );
          })}
        </div>

        {sheet === "balance" ? <BalanceView rows={all} /> : <LedgerView company={sheet} sp={searchParams} />}
      </div>
    </>
  );
}

function BalanceView({ rows }: { rows: any[] }) {
  const balances = computeBalances(rows);
  const th = "px-2.5 py-2 border border-line bg-band font-mono text-[10px] uppercase text-brand text-left whitespace-nowrap";
  const td = "px-2.5 py-1.5 border border-line";
  const tIn = balances.reduce((s, b) => s + b.inflow, 0);
  const tOut = balances.reduce((s, b) => s + b.outflow, 0);

  return (
    <div className="bg-card border border-line rounded-xl p-4">
      <div className="bg-accentSoft rounded-lg px-3 py-2 text-[12px] text-[#6c5320] mb-3">
        ⚙️ Số dư mỗi tài khoản (cash/bank) <b>tự tính</b> = Thu (A/R) − Chi (A/P) theo Company account. Số dư đầu kỳ = 0 (có thể bổ sung sau).
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse text-[12.5px] min-w-[640px]">
          <thead><tr>
            <th className={th}>Công ty</th><th className={th}>Tài khoản</th><th className={th}>Loại</th>
            <th className={th}>Thu (A/R)</th><th className={th}>Chi (A/P)</th><th className={th}>Số dư</th>
          </tr></thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.account} className="even:bg-band hover:bg-accentSoft">
                <td className={td}>{b.company}</td>
                <td className={td + " font-mono"}>{b.account}</td>
                <td className={td}><span className="badge bg-[#eceee9] text-[#445]">{b.kind}</span></td>
                <td className={td + " text-right font-mono"}>{num(b.inflow)}</td>
                <td className={td + " text-right font-mono"}>{num(b.outflow)}</td>
                <td className={td + ` text-right font-mono font-bold ${b.balance < 0 ? "text-danger" : ""}`}>{money(b.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="font-bold bg-accentSoft">
            <td colSpan={3} className={td}>TỔNG</td>
            <td className={td + " text-right font-mono"}>{num(tIn)}</td>
            <td className={td + " text-right font-mono"}>{num(tOut)}</td>
            <td className={td + " text-right font-mono"}>{money(tIn - tOut)}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

async function LedgerView({ company, sp }: { company: string; sp: SP }) {
  const range = periodRange(sp);
  const all = await listTransactions({ company, from: range.from, to: range.to });
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const rows = all.slice(startIdx, startIdx + PAGE_SIZE);

  const th = "px-2 py-2 border border-line bg-band font-mono text-[9.5px] uppercase text-brand text-left whitespace-nowrap align-bottom";
  const td = "px-2 py-1.5 border border-line align-top";

  return (
    <div className="bg-card border border-line rounded-xl p-4">
      <form action="/usbc101" className="flex items-center gap-2 mb-3 flex-wrap">
        <input type="hidden" name="sheet" value={company} />
        <PeriodFields period={sp.period} day={sp.day} week={sp.week} month={sp.month} year={sp.year} />
        <button type="submit" className="rounded-md border border-line px-3 py-1.5 text-[13px] hover:border-accent">Lọc</button>
        <span className="text-[12px] text-muted">Sổ {company} · {periodLabel(sp)} · {total} dòng</span>
        <div className="flex-1" />
        <Link href="/rc/new" className="rounded-md bg-brand px-3 py-1.5 text-[12px] text-white hover:bg-accent">＋ Nhập RC</Link>
      </form>
      <div className="overflow-x-auto">
        <table className="border-collapse text-[12px] min-w-[1320px]">
          <thead><tr>{LEDGER_COLUMNS.map((c) => <th key={c} className={th}>{c}{isFx(c) ? " ƒ" : ""}</th>)}</tr></thead>
          <tbody>
            {rows.length ? rows.map((t, i) => (
              <tr key={t.id} className="even:bg-band hover:bg-accentSoft">
                {ledgerCells(t, startIdx + i).map((cell, k) => (
                  <td key={k} className={`${td} ${isFx(LEDGER_COLUMNS[k]) ? "bg-band text-muted text-right font-mono" : (/^[\d,.-]+$/.test(String(cell)) && cell !== "" ? "text-right font-mono" : "")}`}>
                    {k === 0 ? <Link href={`/rc/${t.id}`} className="text-brand hover:text-accent">{cell}</Link> : cell}
                  </td>
                ))}
              </tr>
            )) : <tr><td colSpan={LEDGER_COLUMNS.length} className="border border-line px-3 py-6 text-center text-muted">Sổ {company} chưa có giao dịch.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination basePath="/usbc101" sp={sp as Record<string, string | undefined>} page={page} totalPages={totalPages} total={total} />
    </div>
  );
}
