import Link from "next/link";
import PageHeader from "@/components/page-header";
import PeriodFields from "@/components/period-fields";
import Pagination from "@/components/pagination";
import { listTransactions, listBankLines } from "@/lib/data";
import { createBankLine, toggleBankMatched } from "@/app/actions";
import { money, num, ddmm } from "@/lib/format";
import { periodRange, periodLabel } from "@/lib/period";
import {
  USBC101_COMPANIES, LEDGER_COLUMNS, ledgerCells, isFx, computeBalances, arTotal, apTotal,
} from "@/lib/usbc101";

const PAGE_SIZE = 50;
type SP = { sheet?: string; acc?: string; period?: string; day?: string; week?: string; month?: string; year?: string; page?: string };

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

        {sheet === "balance"
          ? <BalanceView rows={all} />
          : searchParams.acc === "bank"
            ? <BankView company={sheet} sp={searchParams} />
            : <LedgerView company={sheet} sp={searchParams} />}
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
  const acc = sp.acc === "cash" || sp.acc === "bank" ? sp.acc : "all";
  const fetched = await listTransactions({ company, from: range.from, to: range.to });
  const all = acc === "all" ? fetched : fetched.filter((t) => (t.companyAccount || "").toLowerCase().endsWith(acc));
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const rows = all.slice(startIdx, startIdx + PAGE_SIZE);

  const th = "px-2 py-2 border border-line bg-band font-mono text-[9.5px] uppercase text-brand text-left whitespace-nowrap align-bottom";
  const td = "px-2 py-1.5 border border-line align-top";

  return (
    <div className="bg-card border border-line rounded-xl p-4">
      <div className="flex gap-1.5 mb-2 flex-wrap">
        {([["all", "Tất cả"], ["cash", "Theo dõi Cash"], ["bank", "Theo dõi Bank"]] as const).map(([v, l]) => (
          <Link key={v} href={`/usbc101?sheet=${company}&acc=${v}`}
            className={`px-3 py-1.5 rounded-md text-[12px] border ${acc === v ? "bg-brand text-white border-brand" : "border-line hover:border-accent"}`}>{l}</Link>
        ))}
      </div>
      <form action="/usbc101" className="flex items-center gap-2 mb-3 flex-wrap">
        <input type="hidden" name="sheet" value={company} />
        <input type="hidden" name="acc" value={acc} />
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

function AccTabs({ company, acc }: { company: string; acc: string }) {
  return (
    <div className="flex gap-1.5 mb-2 flex-wrap">
      {([["all", "Tất cả"], ["cash", "Theo dõi Cash"], ["bank", "Theo dõi Bank (Sao kê)"]] as const).map(([v, l]) => (
        <Link key={v} href={`/usbc101?sheet=${company}&acc=${v}`}
          className={`px-3 py-1.5 rounded-md text-[12px] border ${acc === v ? "bg-brand text-white border-brand" : "border-line hover:border-accent"}`}>{l}</Link>
      ))}
    </div>
  );
}

async function BankView({ company, sp }: { company: string; sp: SP }) {
  const range = periodRange(sp);
  const [lines, txs] = await Promise.all([
    listBankLines({ company, from: range.from, to: range.to }),
    listTransactions({ company, from: range.from, to: range.to }),
  ]);
  const stmtIn = lines.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0);
  const stmtOut = lines.filter((l) => l.amount < 0).reduce((s, l) => s + Math.abs(l.amount), 0);
  const stmtBalance = stmtIn - stmtOut;
  const bankTx = txs.filter((t) => (t.companyAccount || "").toLowerCase().endsWith("bank") && t.trangThai !== "cancel");
  const ledgerBank = bankTx.reduce((s, t) => s + arTotal(t) - apTotal(t), 0);
  const diff = ledgerBank - stmtBalance;
  const matched = lines.filter((l) => l.matched).length;

  const th = "px-2.5 py-2 border border-line bg-band font-mono text-[10px] uppercase text-brand text-left whitespace-nowrap";
  const td = "px-2.5 py-1.5 border border-line";
  const inp = "rounded-md border border-line px-2 py-1.5 text-[12px] bg-white";
  const Card = ({ l, v, alert }: { l: string; v: string; alert?: boolean }) => (
    <div className={`rounded-lg border p-3 ${alert ? "border-danger" : "border-line"}`}>
      <div className="font-mono text-[10.5px] text-muted uppercase">{l}</div>
      <div className={`font-serif text-lg mt-0.5 ${alert ? "text-danger" : ""}`}>{v}</div>
    </div>
  );

  return (
    <div>
      <AccTabs company={company} acc="bank" />
      <div className="bg-card border border-line rounded-xl p-4">
        <div className="bg-accentSoft rounded-lg px-3 py-2 text-[12px] text-[#6c5320] mb-3">
          ⚙️ THEO DÕI BANK — sao kê ngân hàng của {company}. <b>Đối chiếu</b>: Số dư sổ (bank) so với Số dư sao kê.
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card l="Số dư sao kê" v={money(stmtBalance)} />
          <Card l="Số dư sổ (bank)" v={money(ledgerBank)} />
          <Card l="Chênh lệch" v={money(diff)} alert={Math.abs(diff) > 0.01} />
          <Card l="Đã khớp" v={`${matched}/${lines.length}`} />
        </div>

        <form action={createBankLine.bind(null, company)} className="flex flex-wrap gap-2 items-end mb-3">
          <input name="ngay" type="date" required aria-label="Ngày" className={inp} />
          <input name="description" required placeholder="Diễn giải (CHECK/ACH/BANKCARD DEPOSIT…)" aria-label="Diễn giải" className={inp + " min-w-[260px] flex-1"} />
          <input name="category" placeholder="Loại" aria-label="Loại" className={inp + " w-28"} />
          <input name="bankAccount" placeholder="Số TK" aria-label="Số tài khoản" className={inp + " w-32"} />
          <input name="amount" type="number" step="0.01" required placeholder="+ nạp / − rút" aria-label="Số tiền" className={inp + " w-32 text-right font-mono"} />
          <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-[12px] text-white hover:bg-accent">＋ Thêm dòng sao kê</button>
        </form>

        <div className="overflow-x-auto">
          <table className="border-collapse text-[12.5px] min-w-[820px]">
            <thead><tr>
              <th className={th}>Date</th><th className={th}>Decription</th><th className={th}>Category</th>
              <th className={th}>Số TK</th><th className={th}>Số tiền</th><th className={th}>Đối chiếu</th>
            </tr></thead>
            <tbody>
              {lines.length ? lines.map((l) => (
                <tr key={l.id} className="even:bg-band hover:bg-accentSoft">
                  <td className={td}>{ddmm(l.ngay)}</td>
                  <td className={td}>{l.description}</td>
                  <td className={td}>{l.category || ""}</td>
                  <td className={td + " font-mono text-[11px] text-muted"}>{l.bankAccount || ""}</td>
                  <td className={td + ` text-right font-mono ${l.amount < 0 ? "text-danger" : ""}`}>{money(l.amount)}</td>
                  <td className={td}>
                    <form action={toggleBankMatched.bind(null, l.id, !l.matched)}>
                      <button type="submit" className={`text-[11px] rounded-md px-2 py-1 border ${l.matched ? "bg-okSoft text-ok border-okSoft" : "border-line hover:border-accent"}`}>
                        {l.matched ? "✓ Đã khớp" : "Đánh dấu khớp"}
                      </button>
                    </form>
                  </td>
                </tr>
              )) : <tr><td colSpan={6} className={td + " text-center text-muted py-4"}>Chưa có dòng sao kê. Thêm ở trên hoặc import từ bank.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
