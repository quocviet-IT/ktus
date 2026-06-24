"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/page-header";
import { createRc, type RcInput } from "@/app/actions";
import { COMPANIES, SOURCES, SALES, SALES_ONLINE, BELL_CODES } from "@/lib/store";
import { computeCondition, TYPE_LABEL } from "@/lib/rules";
import { money } from "@/lib/format";
import { USBC101_COLUMNS } from "@/lib/excel-ledger";

type Line = { moTa: string; soLuong: number; donGia: number; giaNo?: string; sku?: string };

const PAYS = [
  { v: "cash", l: "Cash" },
  { v: "bank_wire", l: "Bank wire" },
  { v: "zelle", l: "Zelle" },
  { v: "check", l: "Check" },
  { v: "card", l: "Card" },
];

export default function NhapRC() {
  const [lines, setLines] = useState<Line[]>([{ moTa: "", soLuong: 1, donGia: 0 }]);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<RcInput["type"]>("receipt");
  const [amounts, setAmounts] = useState({ expense: 0, arCash: 0, arBankwire: 0, arZelle: 0, arCheck: 0 });

  const lineTotal = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.soLuong) || 0) * (Number(l.donGia) || 0), 0),
    [lines],
  );
  const condition = computeCondition({
    type,
    expense: amounts.expense,
    arCash: amounts.arCash,
    arBankwire: amounts.arBankwire,
    arZelle: amounts.arZelle,
    arCheck: amounts.arCheck,
  });

  const setLine = (i: number, p: Partial<Line>) =>
    setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));
  const setAmount = (key: keyof typeof amounts, value: string) =>
    setAmounts((prev) => ({ ...prev, [key]: Number(value) || 0 }));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const input: RcInput = {
      ngay: String(f.get("ngay")),
      company: f.get("company") as RcInput["company"],
      type: f.get("type") as RcInput["type"],
      khach: String(f.get("khach")),
      contact: String(f.get("contact") || ""),
      maSku: String(f.get("maSku") || ""),
      dienGiai: String(f.get("dienGiai") || ""),
      expense: Number(f.get("expense")) || 0,
      arCash: Number(f.get("arCash")) || 0,
      arBankwire: Number(f.get("arBankwire")) || 0,
      arZelle: Number(f.get("arZelle")) || 0,
      arCheck: Number(f.get("arCheck")) || 0,
      companyAccount: String(f.get("companyAccount") || ""),
      apCash: Number(f.get("apCash")) || 0,
      apBankwire: Number(f.get("apBankwire")) || 0,
      apZelle: Number(f.get("apZelle")) || 0,
      apCheck: Number(f.get("apCheck")) || 0,
      pay: f.get("pay") as RcInput["pay"],
      lines,
      soNo: String(f.get("soNo") || ""),
      apptId: String(f.get("apptId") || ""),
      rcJmNo: String(f.get("rcJmNo") || ""),
      oldReceiptNo: String(f.get("oldReceiptNo") || ""),
      depositDate: String(f.get("depositDate") || ""),
      source1: String(f.get("source1") || ""),
      source2: String(f.get("source2") || ""),
      sale1: String(f.get("sale1") || ""),
      saleOnline: String(f.get("saleOnline") || ""),
      transactionValue: String(f.get("transactionValue") || ""),
      pctSupport: Number(f.get("pctSupport")) || undefined,
      bellCode: String(f.get("bellCode") || ""),
      note: String(f.get("note") || ""),
    };
    try {
      await createRc(input);
    } finally {
      setBusy(false);
    }
  }

  const lbl = "font-mono text-[11px] text-muted";
  const inp = "border border-line rounded-md px-2.5 py-1.5 text-[13px] w-full bg-white";
  const th = "border border-line bg-band px-2 py-1.5 text-left font-mono text-[10px] text-brand uppercase whitespace-nowrap";
  const td = "border border-line px-2 py-1.5";

  return (
    <>
      <PageHeader crumb="Hang ngay / Nhap RC" title="Nhap lieu USBC101" />
      <form onSubmit={onSubmit} className="p-6">
        <div className="mb-4 rounded-md border border-line bg-card p-3 text-[12px] text-muted">
          <b className="text-ink">USBC101 - ACCOUNT BALANCE:</b> nhap tay cac cot giao dich, tien A/R va thong tin JM tren cung mot don.
          Cac cot CONDITION Return/PO, Receipt, Deposit va Tong cong la cot tu tinh.
        </div>

        <div className="mb-4 overflow-x-auto rounded-md border border-line bg-card">
          <table className="min-w-[1380px] border-collapse text-[12px]">
            <thead>
              <tr>{USBC101_COLUMNS.map((c) => <th key={c} className={th}>{c}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td className={td}>Auto</td>
                <td className={td}><input name="ngay" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inp} /></td>
                <td className={td}>
                  <select name="type" required value={type} onChange={(e) => setType(e.target.value as RcInput["type"])} className={inp}>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td className={td}><input name="maSku" placeholder="24KRI, VRP..." className={inp} /></td>
                <td className={td}><input name="dienGiai" placeholder="Khach mua / dat coc..." className={inp + " min-w-[260px]"} /></td>
                <td className={td}><input name="khach" required placeholder="Ten khach" className={inp + " min-w-[180px]"} /></td>
                <td className={td}><input name="contact" placeholder="Phone" className={inp + " min-w-[140px]"} /></td>
                <td className={td}><input name="expense" type="number" step="0.01" value={amounts.expense || ""} onChange={(e) => setAmount("expense", e.target.value)} className={inp + " text-right font-mono"} /></td>
                <td className={td + " bg-band text-right font-mono text-muted"}>{money(condition.returnPo)}</td>
                <td className={td + " bg-band text-right font-mono text-muted"}>{money(condition.receipt)}</td>
                <td className={td + " bg-band text-right font-mono text-muted"}>{money(condition.deposit)}</td>
                <td className={td}><input name="arCash" type="number" step="0.01" value={amounts.arCash || ""} onChange={(e) => setAmount("arCash", e.target.value)} className={inp + " text-right font-mono"} /></td>
                <td className={td}><input name="arBankwire" type="number" step="0.01" value={amounts.arBankwire || ""} onChange={(e) => setAmount("arBankwire", e.target.value)} className={inp + " text-right font-mono"} /></td>
                <td className={td}><input name="arZelle" type="number" step="0.01" value={amounts.arZelle || ""} onChange={(e) => setAmount("arZelle", e.target.value)} className={inp + " text-right font-mono"} /></td>
                <td className={td}><input name="arCheck" type="number" step="0.01" value={amounts.arCheck || ""} onChange={(e) => setAmount("arCheck", e.target.value)} className={inp + " text-right font-mono"} /></td>
                <td className={td}><input name="soNo" placeholder="SO#" className={inp + " min-w-[110px]"} /></td>
                <td className={td}><input name="apptId" placeholder="AP-..." className={inp + " min-w-[140px]"} /></td>
                <td className={td}><input name="rcJmNo" placeholder="9000... / 1000..." className={inp + " min-w-[140px]"} /></td>
                <td className={td}>
                  <select name="source1" className={inp + " min-w-[120px]"}><option value="">Khong co source</option>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>
                </td>
                <td className={td}>
                  <select name="source2" className={inp + " min-w-[120px]"}><option value="">-</option>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>
                </td>
                <td className={td}>
                  <select name="sale1" className={inp + " min-w-[130px]"}><option value="">-</option>{SALES.map((s) => <option key={s}>{s}</option>)}</select>
                </td>
                <td className={td}>
                  <select name="saleOnline" className={inp + " min-w-[150px]"}><option value="">-</option>{SALES_ONLINE.map((s) => <option key={s}>{s}</option>)}</select>
                </td>
                <td className={td}><input name="pctSupport" type="number" step="0.01" placeholder="0.8" className={inp + " text-right font-mono"} /></td>
                <td className={td}><input name="transactionValue" placeholder="1 luong / 2 oz..." className={inp + " min-w-[130px]"} /></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <section className="rounded-md border border-line bg-card p-4">
            <div className="mb-2 flex items-center">
              <h2 className="font-serif text-base">Dong hang / GIA#</h2>
              <div className="flex-1" />
              <span className="font-mono text-[13px]"><span className="text-muted">Tong dong hang </span><b>{money(lineTotal)}</b></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-[12.5px]">
                <thead><tr><th className={th}>DECRIPTION</th><th className={th}>SKU</th><th className={th}>GIA#</th><th className={th}>SL</th><th className={th}>DON GIA</th><th className={th}>THANH TIEN</th><th className={th}></th></tr></thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td className={td}><input value={l.moTa} onChange={(e) => setLine(i, { moTa: e.target.value })} className={inp} /></td>
                      <td className={td}><input value={l.sku || ""} onChange={(e) => setLine(i, { sku: e.target.value })} className={inp} /></td>
                      <td className={td}><input value={l.giaNo || ""} onChange={(e) => setLine(i, { giaNo: e.target.value })} className={inp} /></td>
                      <td className={td}><input type="number" step="0.001" value={l.soLuong} onChange={(e) => setLine(i, { soLuong: +e.target.value })} className={inp + " text-right font-mono"} /></td>
                      <td className={td}><input type="number" step="0.01" value={l.donGia} onChange={(e) => setLine(i, { donGia: +e.target.value })} className={inp + " text-right font-mono"} /></td>
                      <td className={td + " text-right font-mono"}>{money((l.soLuong || 0) * (l.donGia || 0))}</td>
                      <td className={td}><button type="button" onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))} className="text-danger">Xoa</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => setLines((ls) => [...ls, { moTa: "", soLuong: 1, donGia: 0 }])}
              className="mt-3 rounded-md border border-line px-3 py-1.5 text-[12px] hover:border-accent">Them dong</button>
          </section>

          <section className="rounded-md border border-line bg-card p-4">
            <h2 className="mb-3 font-serif text-base">Cot JM / Pickup / ghi chu</h2>
            <div className="grid grid-cols-2 gap-3">
              <label><div className={lbl}>Company</div><select name="company" required className={inp}>{COMPANIES.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label><div className={lbl}>Hinh thuc TT dot dau</div><select name="pay" className={inp}>{PAYS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}</select></label>
              <label className="col-span-2"><div className={lbl}>Company account (cash/bank)</div>
                <select name="companyAccount" className={inp}>
                  <option value="">- chọn tài khoản -</option>
                  {COMPANIES.flatMap((c) => [`${c} cash`, `${c} bank`]).map((a) => <option key={a} value={a}>{a}</option>)}
                </select></label>
              <label><div className={lbl}>A/P Cash (chi)</div><input name="apCash" type="number" step="0.01" className={inp + " text-right font-mono"} /></label>
              <label><div className={lbl}>A/P Bank wire</div><input name="apBankwire" type="number" step="0.01" className={inp + " text-right font-mono"} /></label>
              <label><div className={lbl}>A/P Zelle</div><input name="apZelle" type="number" step="0.01" className={inp + " text-right font-mono"} /></label>
              <label><div className={lbl}>A/P Check</div><input name="apCheck" type="number" step="0.01" className={inp + " text-right font-mono"} /></label>
              <label><div className={lbl}>Old Receipt Number</div><input name="oldReceiptNo" placeholder="9000..." className={inp} /></label>
              <label><div className={lbl}>Deposit Date</div><input name="depositDate" type="date" className={inp} /></label>
              <label><div className={lbl}>Ma rung chuong</div><select name="bellCode" className={inp}><option value="">-</option>{BELL_CODES.map((b) => <option key={b}>{b}</option>)}</select></label>
              <label className="col-span-2"><div className={lbl}>Ghi chu thanh toan / ly do / note</div><textarea name="note" rows={4} className={inp} placeholder="Cac dot sau: ngay - so tien - hinh thuc - xac nhan" /></label>
            </div>
          </section>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button disabled={busy} className="rounded-md bg-brand px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-accent disabled:opacity-60">
            {busy ? "Dang luu..." : "Luu vao USBC101 va so RC JM"}
          </button>
          <span className="text-[12px] text-muted">Cot CONDITION chi hien thi tu tinh, khong ghi tay.</span>
        </div>
      </form>
    </>
  );
}
