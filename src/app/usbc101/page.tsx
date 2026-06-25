import { Fragment } from "react";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import PeriodFields from "@/components/period-fields";
import Pagination from "@/components/pagination";
import { listTransactions, listBankLines, listAccounts } from "@/lib/data";
import type { Account } from "@/lib/types";
import { createBankLine, toggleBankMatched } from "@/app/actions";
import { money, ddmm } from "@/lib/format";
import { periodRange, periodLabel } from "@/lib/period";
import {
  USBC101_COMPANIES, LEDGER_COLUMNS, ledgerCells, isFx, arTotal, apTotal, ledgerAccountFilter,
} from "@/lib/usbc101";

const PAGE_SIZE = 50;
type SP = { sheet?: string; acc?: string; asof?: string; period?: string; day?: string; week?: string; month?: string; year?: string; page?: string };

export default async function Usbc101({ searchParams }: { searchParams: SP }) {
  const sheet = searchParams.sheet || "balance";
  const tabs = ["balance", ...USBC101_COMPANIES];

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
          ? <BalanceView />
          : searchParams.acc === "bank"
            ? <BankView company={sheet} sp={searchParams} />
            : <LedgerView company={sheet} sp={searchParams} />}
      </div>
    </>
  );
}

// hiển thị tiền: âm để trong ngoặc + đỏ (như Excel)
function acct(n: number): React.ReactNode {
  const s = "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? <span className="text-danger">({s})</span> : <span>{s}</span>;
}

async function BalanceView() {
  const accounts = await listAccounts();
  const groups: { entity: string; items: Account[] }[] = [];
  for (const a of accounts) {
    let g = groups.find((x) => x.entity === a.entity);
    if (!g) { g = { entity: a.entity, items: [] }; groups.push(g); }
    g.items.push(a);
  }
  const grandBeg = accounts.reduce((s, a) => s + a.beginning, 0);
  const grandEnd = accounts.reduce((s, a) => s + a.ending, 0);

  const th = "px-2.5 py-2 border border-line bg-[#3a6ea5] text-white font-mono text-[10px] uppercase text-left whitespace-nowrap";
  const td = "px-2.5 py-1.5 border border-line";

  return (
    <div className="bg-card border border-line rounded-xl p-4">
      <div className="bg-accentSoft rounded-lg px-3 py-2 text-[12px] text-[#6c5320] mb-3">
        BALANCE ACCOUNT — {accounts.length} tài khoản / {groups.length} nhóm. Beginning &amp; Ending Balance lấy từ Excel. Âm = nợ thẻ/loan.
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse text-[12.5px] min-w-[680px]">
          <thead><tr>
            <th className={th}>Stt</th><th className={th}>Account Name</th><th className={th}>Account Type</th>
            <th className={th + " text-right"}>Beginning</th><th className={th + " text-right"}>Ending Balance</th>
          </tr></thead>
          <tbody>
            <tr className="bg-[#dbe7f3] font-bold">
              <td className={td} colSpan={3}>SUBTOTAL (MONTH)</td>
              <td className={td + " text-right font-mono"}>{acct(grandBeg)}</td>
              <td className={td + " text-right font-mono"}>{acct(grandEnd)}</td>
            </tr>
            {groups.map((g) => {
              const beg = g.items.reduce((s, a) => s + a.beginning, 0);
              const end = g.items.reduce((s, a) => s + a.ending, 0);
              return (
                <Fragment key={g.entity}>
                  <tr className="bg-[#eaf1f8] font-bold text-accent">
                    <td className={td}>{g.entity}</td><td className={td} /><td className={td} />
                    <td className={td + " text-right font-mono"}>{acct(beg)}</td>
                    <td className={td + " text-right font-mono"}>{acct(end)}</td>
                  </tr>
                  {g.items.map((a, i) => (
                    <tr key={a.id} className="hover:bg-accentSoft">
                      <td className={td + " text-right font-mono text-muted"}>{i + 1}</td>
                      <td className={td + " text-brand"}>{a.name}</td>
                      <td className={td}>{a.accountType || ""}</td>
                      <td className={td + " text-right font-mono"}>{acct(a.beginning)}</td>
                      <td className={td + " text-right font-mono"}>{acct(a.ending)}</td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function LedgerView({ company, sp }: { company: string; sp: SP }) {
  const range = periodRange(sp);
  const acc = sp.acc === "cash" || sp.acc === "bank" ? sp.acc : "all";
  const [fetched, accounts] = await Promise.all([
    listTransactions({ company, from: range.from, to: range.to }),
    listAccounts(),
  ]);
  const all = fetched.filter((t) => ledgerAccountFilter(t, acc, accounts));
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
  const [lines, txs, accounts] = await Promise.all([
    listBankLines({ company, from: range.from, to: range.to }),
    listTransactions({ company, from: range.from, to: range.to }),
    listAccounts(),
  ]);
  const stmtIn = lines.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0);
  const stmtOut = lines.filter((l) => l.amount < 0).reduce((s, l) => s + Math.abs(l.amount), 0);
  const stmtBalance = stmtIn - stmtOut;
  const bankTx = txs.filter((t) => t.trangThai !== "cancel" && ledgerAccountFilter(t, "bank", accounts));
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
