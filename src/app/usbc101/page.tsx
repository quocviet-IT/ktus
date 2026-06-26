import { Fragment } from "react";
import Link from "next/link";
import { Check, Filter, Plus, Settings, Pencil, RotateCcw } from "lucide-react";
import PageHeader from "@/components/page-header";
import PeriodFields from "@/components/period-fields";
import Pagination from "@/components/pagination";
import EditableCell from "@/components/editable-cell";
import StickyScrollTable from "@/components/sticky-scroll-table";
import { listTransactions, listTransactionsPaged, listBankLines, listAccounts } from "@/lib/data";
import type { Account } from "@/lib/types";
import { createBankLine, toggleBankMatched } from "@/app/actions";
import { money, ddmm } from "@/lib/format";
import { periodRange, periodLabel } from "@/lib/period";
import {
  USBC101_COMPANIES, LEDGER_COLUMNS, LEDGER_FIELDS, ledgerCells, isFx, arTotal, apTotal, ledgerAccountFilter,
} from "@/lib/usbc101";

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100];

type SP = {
  sheet?: string;
  acc?: string;
  asof?: string;
  period?: string;
  day?: string;
  week?: string;
  month?: string;
  year?: string;
  page?: string;
  pageSize?: string;
};

export default async function Usbc101({ searchParams }: { searchParams: SP }) {
  const sheet = searchParams.sheet || "balance";
  const tabs = ["balance", ...USBC101_COMPANIES];

  return (
    <>
      <PageHeader crumb="USBC101 / Account Balance" title="USBC101 — ACCOUNT BALANCE 2026" />
      <div className="p-4 lg:p-6">
        {/* tabs sheet */}
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((s) => {
            const label = s === "balance" ? "BALANCE ACCOUNT" : s;
            const active = sheet === s;
            return (
              <Link key={s} href={`/usbc101?sheet=${s}&pageSize=${searchParams.pageSize || DEFAULT_PAGE_SIZE}`}
                className={`h-9 rounded-md border px-3 text-[12px] font-medium leading-9 ${active ? "border-brand bg-brand text-white" : "border-line bg-card text-ink hover:border-accent hover:bg-accentSoft"}`}>
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

  const th = "sticky top-0 z-20 border-b border-r border-line bg-band px-2 py-1.5 text-left align-bottom font-mono text-[10px] font-semibold uppercase tracking-normal text-brand whitespace-nowrap";
  const td = "border-b border-r border-line px-2 py-1.5 text-[12px] leading-5 whitespace-nowrap align-top";

  return (
    <section className="rounded-lg border border-line bg-card">
      <div className="grid grid-cols-2 gap-px border-b border-line bg-line md:grid-cols-4">
        <div className="bg-band px-3 py-2">
          <div className="font-mono text-[10px] font-semibold uppercase text-muted">Tài khoản</div>
          <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">{accounts.length.toLocaleString("en-US")}</div>
        </div>
        <div className="bg-band px-3 py-2">
          <div className="font-mono text-[10px] font-semibold uppercase text-muted">Nhóm công ty</div>
          <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">{groups.length.toLocaleString("en-US")}</div>
        </div>
        <div className="bg-band px-3 py-2">
          <div className="font-mono text-[10px] font-semibold uppercase text-muted">Beginning</div>
          <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">{acct(grandBeg)}</div>
        </div>
        <div className="bg-band px-3 py-2">
          <div className="font-mono text-[10px] font-semibold uppercase text-muted">Ending Balance</div>
          <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">{acct(grandEnd)}</div>
        </div>
      </div>
      <div className="p-3">
        <StickyScrollTable minWidth={780} bodyClassName="max-h-[calc(100vh-280px)] min-h-[320px]">
          <table className="border-collapse text-[12px]" style={{ minWidth: 780 }}>
            <thead><tr>
              <th className={th}>Stt</th><th className={th}>Account Name</th><th className={th}>Account Type</th>
              <th className={th + " text-right"}>Beginning</th><th className={th + " text-right"}>Ending Balance</th>
            </tr></thead>
            <tbody>
              <tr className="bg-accentSoft font-bold">
                <td className={td} colSpan={3}>SUBTOTAL (MONTH)</td>
                <td className={td + " text-right font-mono"}>{acct(grandBeg)}</td>
                <td className={td + " text-right font-mono"}>{acct(grandEnd)}</td>
              </tr>
              {groups.map((g) => {
                const beg = g.items.reduce((s, a) => s + a.beginning, 0);
                const end = g.items.reduce((s, a) => s + a.ending, 0);
                return (
                  <Fragment key={g.entity}>
                    <tr className="bg-band font-bold text-accent">
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
        </StickyScrollTable>
      </div>
    </section>
  );
}

async function LedgerView({ company, sp }: { company: string; sp: SP }) {
  const range = periodRange(sp);
  const acc = sp.acc === "cash" || sp.acc === "bank" ? sp.acc : "all";
  const requestedPageSize = Number(sp.pageSize);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize) ? requestedPageSize : DEFAULT_PAGE_SIZE;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const startIdx = (page - 1) * pageSize;

  // acc = "all": phân trang TẠI SERVER (nhanh). cash/bank: lọc trong bộ nhớ nên kéo đủ rồi cắt trang.
  let rows, total: number;
  if (acc === "all") {
    const paged = await listTransactionsPaged({ company, from: range.from, to: range.to }, page, pageSize);
    rows = paged.rows; total = paged.total;
  } else {
    const [fetched, accounts] = await Promise.all([
      listTransactions({ company, from: range.from, to: range.to }),
      listAccounts(),
    ]);
    const filtered = fetched.filter((t) => ledgerAccountFilter(t, acc, accounts));
    total = filtered.length;
    rows = filtered.slice(startIdx, startIdx + pageSize);
  }
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const currentStartIdx = (currentPage - 1) * pageSize;
  const pageFrom = total ? currentStartIdx + 1 : 0;
  const pageTo = Math.min(total, currentStartIdx + rows.length);
  const pageAr = rows.reduce((sum, t) => sum + arTotal(t), 0);
  const pageAp = rows.reduce((sum, t) => sum + apTotal(t), 0);

  const control =
    "h-9 rounded-md border border-line bg-card px-2.5 text-[12px] text-ink outline-none hover:border-accent focus:border-brand focus:ring-1 focus:ring-brand";
  const toolbarButton =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-[12px] font-medium text-ink hover:border-accent hover:bg-accentSoft";
  const primaryButton =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-brand bg-brand px-3 text-[12px] font-medium text-white hover:bg-[#244C39]";
  const th = "sticky top-0 z-20 border-b border-r border-line bg-band px-2 py-1.5 text-left align-bottom font-mono text-[10px] font-semibold uppercase tracking-normal text-brand whitespace-nowrap";
  const td = "border-b border-r border-line px-2 py-1.5 text-[12px] leading-5 whitespace-nowrap align-top";
  const stickyEdge = "bg-card shadow-[2px_0_0_0_#D8E0D4]";
  const stickyHead = "z-40 bg-band shadow-[2px_0_0_0_#D8E0D4]";
  const stickyColumns = [
    "sticky left-0 w-[48px] min-w-[48px] max-w-[48px]",
    "sticky left-[48px] w-[82px] min-w-[82px] max-w-[82px]",
    "sticky left-[130px] w-[124px] min-w-[124px] max-w-[124px]",
    "sticky left-[254px] w-[240px] min-w-[240px] max-w-[240px]",
  ];
  const stickyClass = (index: number, head = false) => index < stickyColumns.length
    ? `${stickyColumns[index]} ${head ? stickyHead : `${stickyEdge} z-10`}`
    : "";
  const colWidth = (index: number) => {
    if (index < stickyColumns.length) return undefined;
    const col = LEDGER_COLUMNS[index];
    if (["Customer name", "Company account"].includes(col)) return 160;
    if (["Contact", "Rung Chuông"].includes(col)) return 120;
    if (isFx(col) || col.startsWith("A/")) return 118;
    return 108;
  };
  const tableMinWidth = 2200;

  return (
    <section className="rounded-lg border border-line bg-card">
      <div className="border-b border-line px-4 py-3">
        <div className="mb-3 flex gap-2 flex-wrap">
        {([["all", "Tất cả"], ["cash", "Theo dõi Cash"], ["bank", "Theo dõi Bank"]] as const).map(([v, l]) => (
          <Link key={v} href={`/usbc101?sheet=${company}&acc=${v}&pageSize=${pageSize}`}
            className={`h-9 rounded-md border px-3 text-[12px] font-medium leading-9 ${acc === v ? "border-brand bg-brand text-white" : "border-line text-ink hover:border-accent hover:bg-accentSoft"}`}>{l}</Link>
        ))}
        </div>
        <form action="/usbc101" className="flex items-center gap-2 gap-y-3 flex-wrap">
        <input type="hidden" name="sheet" value={company} />
        <input type="hidden" name="acc" value={acc} />
        <PeriodFields period={sp.period} day={sp.day} week={sp.week} month={sp.month} year={sp.year} />
        <label className="flex items-center gap-1.5 text-[12px] text-muted">
          Dòng/trang
          <select name="pageSize" defaultValue={String(pageSize)} className={control}>
            {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <button type="submit" className={primaryButton}>
          <Filter size={14} />
          Lọc
        </button>
        <Link href={`/usbc101?sheet=${company}&acc=${acc}&pageSize=${pageSize}`} className={toolbarButton}>
          <RotateCcw size={14} />
          Xóa lọc
        </Link>
        <div className="flex-1" />
        <span className="text-[12px] text-muted">Sổ {company} · {periodLabel(sp)} · {pageFrom}-{pageTo}/{total} dòng</span>
        <Link href="/rc/new" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-[12px] font-medium text-white hover:bg-accent">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Nhập RC
        </Link>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-line bg-line md:grid-cols-4">
        <div className="bg-band px-3 py-2">
          <div className="font-mono text-[10px] font-semibold uppercase text-muted">Sổ</div>
          <div className="mt-0.5 text-[14px] font-semibold text-ink">{company} · {acc === "all" ? "Tất cả" : acc.toUpperCase()}</div>
        </div>
        <div className="bg-band px-3 py-2">
          <div className="font-mono text-[10px] font-semibold uppercase text-muted">Dòng</div>
          <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">{total.toLocaleString("en-US")}</div>
        </div>
        <div className="bg-band px-3 py-2">
          <div className="font-mono text-[10px] font-semibold uppercase text-muted">A/R trang này</div>
          <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">{money(pageAr)}</div>
        </div>
        <div className="bg-band px-3 py-2">
          <div className="font-mono text-[10px] font-semibold uppercase text-muted">A/P trang này</div>
          <div className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">{money(pageAp)}</div>
        </div>
      </div>

      <div className="p-3">
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-accentSoft px-3 py-1.5 text-[11.5px] text-[#6c5320]">
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Bấm vào ô để sửa trực tiếp (Enter để lưu, Esc để hủy). Ô <span className="italic text-accent">ƒ</span> tự tính. Nút <b>Sửa</b> cuối dòng mở form đầy đủ.
      </div>
      <StickyScrollTable minWidth={tableMinWidth} bodyClassName="max-h-[calc(100vh-360px)] min-h-[320px]">
        <table className="border-collapse text-[12px]" style={{ minWidth: tableMinWidth }}>
          <thead><tr>
            {LEDGER_COLUMNS.map((c, index) => (
              <th key={c} className={`${th} ${stickyClass(index, true)}`} style={{ minWidth: colWidth(index) }}>
                {c}{isFx(c) ? " ƒ" : ""}
              </th>
            ))}
            <th className={`${th} sticky right-0 z-40 min-w-[112px] bg-band text-center shadow-[-2px_0_0_0_#D8E0D4]`}>SỬA</th>
          </tr></thead>
          <tbody>
            {rows.length ? rows.map((t, i) => (
              <tr key={t.id} className="hover:bg-accentSoft">
                {ledgerCells(t, currentStartIdx + i).map((cell, k) => {
                  const meta = LEDGER_FIELDS[k];
                  const editable = !!meta?.field && meta.kind !== "ro";
                  const fx = isFx(LEDGER_COLUMNS[k]);
                  if (k === 0)
                    return <td key={k} className={`${td} ${stickyClass(k)} text-right font-mono`}><Link href={`/rc/${t.id}`} className="text-brand hover:text-accent">{cell}</Link></td>;
                  if (editable) {
                    const raw = meta.field === "companyAccount" ? (t.accountName || t.companyAccount || "") : ((t as any)[meta.field!] ?? "");
                    return <td key={k} className={`${td} ${stickyClass(k)} p-0`} style={{ minWidth: colWidth(k) }}><EditableCell id={t.id} field={meta.field!} kind={meta.kind} value={raw} /></td>;
                  }
                  return (
                    <td key={k} title={String(cell || "")} className={`${td} ${stickyClass(k)} ${fx ? "bg-band text-muted text-right font-mono" : (/^[\d,.-]+$/.test(String(cell)) && cell !== "" ? "text-right font-mono" : "")} ${k === 3 || k === 6 || k === 9 ? "overflow-hidden text-ellipsis" : ""}`} style={{ minWidth: colWidth(k) }}>{cell}</td>
                  );
                })}
                <td className={`${td} sticky right-0 z-20 bg-card text-center shadow-[-2px_0_0_0_#D8E0D4]`}>
                  <Link href={`/rc/${t.id}`} aria-label="Sửa đơn" title="Sửa đơn"
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-line px-2.5 text-[11.5px] text-brand hover:border-accent hover:bg-accentSoft hover:text-accent">
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Sửa
                  </Link>
                </td>
              </tr>
            )) : <tr><td colSpan={LEDGER_COLUMNS.length + 1} className="border-b border-r border-line px-3 py-8 text-center text-[12px] text-muted">Sổ {company} chưa có giao dịch.</td></tr>}
          </tbody>
        </table>
      </StickyScrollTable>
      <Pagination
        basePath="/usbc101"
        sp={{ ...(sp as Record<string, string | undefined>), pageSize: String(pageSize) }}
        page={currentPage}
        totalPages={totalPages}
        total={total}
      />
      </div>
    </section>
  );
}

function AccTabs({ company, acc }: { company: string; acc: string }) {
  return (
    <div className="mb-3 flex gap-2 flex-wrap">
      {([["all", "Tất cả"], ["cash", "Theo dõi Cash"], ["bank", "Theo dõi Bank (Sao kê)"]] as const).map(([v, l]) => (
        <Link key={v} href={`/usbc101?sheet=${company}&acc=${v}`}
          className={`h-9 rounded-md border px-3 text-[12px] font-medium leading-9 ${acc === v ? "border-brand bg-brand text-white" : "border-line bg-card text-ink hover:border-accent hover:bg-accentSoft"}`}>{l}</Link>
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

  const th = "sticky top-0 z-20 border-b border-r border-line bg-band px-2 py-1.5 text-left align-bottom font-mono text-[10px] font-semibold uppercase tracking-normal text-brand whitespace-nowrap";
  const td = "border-b border-r border-line px-2 py-1.5 text-[12px] leading-5 whitespace-nowrap align-top";
  const inp = "rounded-md border border-line px-2 py-1.5 text-[12px] bg-white";
  const Card = ({ l, v, alert }: { l: string; v: string; alert?: boolean }) => (
    <div className="bg-band px-3 py-2">
      <div className="font-mono text-[10px] font-semibold uppercase text-muted">{l}</div>
      <div className={`mt-0.5 font-mono text-[15px] font-bold tabular-nums ${alert ? "text-danger" : "text-ink"}`}>{v}</div>
    </div>
  );

  return (
    <div>
      <AccTabs company={company} acc="bank" />
      <section className="rounded-lg border border-line bg-card">
        <div className="border-b border-line px-4 py-3">
          <div className="rounded-lg bg-accentSoft px-3 py-2 text-[12px] text-[#6c5320]">
            <span className="inline-flex items-start gap-1.5"><Settings className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> <span>THEO DÕI BANK — sao kê ngân hàng của {company}. <b>Đối chiếu</b>: Số dư sổ (bank) so với Số dư sao kê.</span></span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px border-b border-line bg-line md:grid-cols-4">
          <Card l="Số dư sao kê" v={money(stmtBalance)} />
          <Card l="Số dư sổ (bank)" v={money(ledgerBank)} />
          <Card l="Chênh lệch" v={money(diff)} alert={Math.abs(diff) > 0.01} />
          <Card l="Đã khớp" v={`${matched}/${lines.length}`} />
        </div>

        <div className="p-3">
        <form action={createBankLine.bind(null, company)} className="mb-3 flex flex-wrap gap-2 items-end">
          <input name="ngay" type="date" required aria-label="Ngày" className={inp} />
          <input name="description" required placeholder="Diễn giải (CHECK/ACH/BANKCARD DEPOSIT…)" aria-label="Diễn giải" className={inp + " min-w-[260px] flex-1"} />
          <input name="category" placeholder="Loại" aria-label="Loại" className={inp + " w-28"} />
          <input name="bankAccount" placeholder="Số TK" aria-label="Số tài khoản" className={inp + " w-32"} />
          <input name="amount" type="number" step="0.01" required placeholder="+ nạp / − rút" aria-label="Số tiền" className={inp + " w-32 text-right font-mono"} />
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[12px] text-white hover:bg-accent">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Thêm dòng sao kê
          </button>
        </form>

        <StickyScrollTable minWidth={900} bodyClassName="max-h-[calc(100vh-430px)] min-h-[260px]">
          <table className="border-collapse text-[12px]" style={{ minWidth: 900 }}>
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
                        {l.matched ? <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Đã khớp</span> : "Đánh dấu khớp"}
                      </button>
                    </form>
                  </td>
                </tr>
              )) : <tr><td colSpan={6} className={td + " text-center text-muted py-4"}>Chưa có dòng sao kê. Thêm ở trên hoặc import từ bank.</td></tr>}
            </tbody>
          </table>
        </StickyScrollTable>
        </div>
      </section>
    </div>
  );
}
