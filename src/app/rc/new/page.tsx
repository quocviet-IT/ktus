"use client";

import { useMemo, useState, cloneElement, isValidElement } from "react";
import { ArrowRight, Plus, Save, X } from "lucide-react";
import PageHeader from "@/components/page-header";
import { createRc, type RcInput } from "@/app/actions";
import { COMPANIES, SOURCES, SALES, SALES_ONLINE, BELL_CODES } from "@/lib/store";
import { TYPE_LABEL } from "@/lib/rules";
import { money } from "@/lib/format";

type Line = { moTa: string; soLuong: number; donGia: number; giaNo?: string; sku?: string };
const PAYS = [
  { v: "cash", l: "Cash" }, { v: "bank_wire", l: "Bank wire" },
  { v: "zelle", l: "Zelle" }, { v: "check", l: "Check" }, { v: "card", l: "Card" },
];
const RECEIPT_T = ["receipt", "pick_up", "repair"];
const DEPOSIT_T = ["deposit", "extra_deposit"];
const RETURN_T = ["po", "return", "exchange"];

// Đặt NGOÀI component để không bị tạo lại mỗi lần render (tránh input mất focus)
const lbl = "font-mono text-[11px] text-muted mb-0.5";
const inp = "w-full rounded-md border border-line px-2.5 py-1.5 text-[13px] bg-white";
const fx = "rounded-md border border-line bg-band px-2.5 py-1.5 text-right font-mono text-[13px]";
function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-card p-4 mb-3.5">
      <h2 className="font-serif text-[15px] mb-3"><span className="text-accent font-mono text-[13px] mr-1.5">{n}</span>{title}</h2>
      {children}
    </section>
  );
}
function fld(label: string, node: React.ReactNode) {
  return (
    <label className="block"><div className={lbl}>{label}</div>
      {isValidElement(node) ? cloneElement(node as React.ReactElement<any>, { "aria-label": label }) : node}
    </label>
  );
}
function amt(val: number, set: (v: number) => void) {
  return <input type="number" step="0.01" value={val || ""} onChange={(e) => set(Number(e.target.value) || 0)} className={inp + " text-right font-mono"} />;
}

export default function NhapRC() {
  const [company, setCompany] = useState<string>("PC49");
  const [type, setType] = useState<RcInput["type"]>("receipt");
  const [lines, setLines] = useState<Line[]>([{ moTa: "", soLuong: 1, donGia: 0 }]);
  const [ar, setAr] = useState({ arCash: 0, arBankwire: 0, arZelle: 0, arCheck: 0 });
  const [ap, setAp] = useState({ apCash: 0, apBankwire: 0, apZelle: 0, apCheck: 0 });
  const [busy, setBusy] = useState(false);

  const lineTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.soLuong) || 0) * (Number(l.donGia) || 0), 0), [lines]);
  const arTotal = ar.arCash + ar.arBankwire + ar.arZelle + ar.arCheck;
  const apTotal = ap.apCash + ap.apBankwire + ap.apZelle + ap.apCheck;
  const receipt = RECEIPT_T.includes(type) ? arTotal : 0;
  const deposit = DEPOSIT_T.includes(type) ? arTotal : 0;
  const returnPo = RETURN_T.includes(type) ? (apTotal || lineTotal) : 0;
  const tongCong = receipt + deposit - returnPo;

  const setLine = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));

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
      companyAccount: String(f.get("companyAccount") || ""),
      arCash: ar.arCash, arBankwire: ar.arBankwire, arZelle: ar.arZelle, arCheck: ar.arCheck,
      apCash: ap.apCash, apBankwire: ap.apBankwire, apZelle: ap.apZelle, apCheck: ap.apCheck,
      pay: f.get("pay") as RcInput["pay"],
      lines,
      rcJmNo: String(f.get("rcJmNo") || ""),
      soNo: String(f.get("soNo") || ""),
      apptId: String(f.get("apptId") || ""),
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
    try { await createRc(input); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader crumb="Hàng ngày / Nhập RC" title="Nhập RC (USBC101)" />
      <form onSubmit={onSubmit} className="p-6 max-w-[920px]">
        {/* 1. Thông tin chung */}
        <Section n="1" title="Thông tin chung">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fld("Date *", <input name="ngay" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inp} />)}
            {fld("Company *", <select name="company" required value={company} onChange={(e) => setCompany(e.target.value)} className={inp}>{COMPANIES.map((c) => <option key={c}>{c}</option>)}</select>)}
            {fld("Company account *", <select name="companyAccount" required className={inp}><option value="">- chọn -</option>{[`${company} cash`, `${company} bank`].map((a) => <option key={a} value={a}>{a}</option>)}</select>)}
            {fld("Type *", <select name="type" required value={type} onChange={(e) => setType(e.target.value as RcInput["type"])} className={inp}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>)}
            {fld("Customer name *", <input name="khach" required placeholder="Tên khách" className={inp} />)}
            {fld("Contact", <input name="contact" placeholder="408-…" className={inp} />)}
            {fld("Mã SKU", <input name="maSku" placeholder="24KRI / VRP…" className={inp} />)}
            {fld("Mã rung chuông", <select name="bellCode" className={inp}><option value="">—</option>{BELL_CODES.map((b) => <option key={b}>{b}</option>)}</select>)}
            <div className="md:col-span-4">{fld("Diễn giải", <input name="dienGiai" placeholder="Khách mua 1L VRP / Mua vào 3.9gr vàng 18K…" className={inp} />)}</div>
          </div>
        </Section>

        {/* 2. Dòng hàng */}
        <Section n="2" title="Dòng hàng / sản phẩm">
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_110px_70px_100px_100px_auto] gap-2 items-center">
                <input value={l.moTa} onChange={(e) => setLine(i, { moTa: e.target.value })} placeholder="Description" className={inp} />
                <input value={l.sku || ""} onChange={(e) => setLine(i, { sku: e.target.value })} placeholder="SKU" className={inp} />
                <input value={l.giaNo || ""} onChange={(e) => setLine(i, { giaNo: e.target.value })} placeholder="GIA#" className={inp} />
                <input type="number" step="0.001" value={l.soLuong} onChange={(e) => setLine(i, { soLuong: +e.target.value })} placeholder="Quantity" className={inp + " text-right font-mono"} />
                <input type="number" step="0.01" value={l.donGia} onChange={(e) => setLine(i, { donGia: +e.target.value })} placeholder="Unit Price" className={inp + " text-right font-mono"} />
                <div className="text-right font-mono text-[13px]">{money(l.soLuong * l.donGia)}</div>
                <button type="button" onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-dangerSoft hover:text-danger" aria-label="Xóa dòng">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center">
            <button type="button" onClick={() => setLines((ls) => [...ls, { moTa: "", soLuong: 1, donGia: 0 }])} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12px] hover:border-accent">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Thêm dòng
            </button>
            <div className="flex-1" />
            <span className="font-mono text-[13px]"><span className="text-muted mr-2">Tổng dòng hàng</span><b>{money(lineTotal)}</b></span>
          </div>
        </Section>

        {/* 3 + 4: A/R & A/P */}
        <div className="grid md:grid-cols-2 gap-3.5">
          <Section n="3" title="Thu tiền (A/R)">
            {fld("Hình thức TT đợt đầu", <select name="pay" className={inp}>{PAYS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}</select>)}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {fld("Cash", amt(ar.arCash, (v) => setAr((s) => ({ ...s, arCash: v }))))}
              {fld("Bank wire", amt(ar.arBankwire, (v) => setAr((s) => ({ ...s, arBankwire: v }))))}
              {fld("Zelle", amt(ar.arZelle, (v) => setAr((s) => ({ ...s, arZelle: v }))))}
              {fld("Check", amt(ar.arCheck, (v) => setAr((s) => ({ ...s, arCheck: v }))))}
            </div>
          </Section>
          <Section n="4" title="Chi tiền (A/P) — PO / mua vào">
            <div className="grid grid-cols-2 gap-3">
              {fld("Cash", amt(ap.apCash, (v) => setAp((s) => ({ ...s, apCash: v }))))}
              {fld("Bank wire", amt(ap.apBankwire, (v) => setAp((s) => ({ ...s, apBankwire: v }))))}
              {fld("Zelle", amt(ap.apZelle, (v) => setAp((s) => ({ ...s, apZelle: v }))))}
              {fld("Check", amt(ap.apCheck, (v) => setAp((s) => ({ ...s, apCheck: v }))))}
            </div>
          </Section>
        </div>

        {/* CONDITION tự tính */}
        <Section n="ƒ" title="CONDITION — tự tính">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fld("Return/PO ƒ", <div className={fx}>{money(returnPo)}</div>)}
            {fld("Receipt ƒ", <div className={fx}>{money(receipt)}</div>)}
            {fld("Deposit ƒ", <div className={fx}>{money(deposit)}</div>)}
            {fld("TỔNG CỘNG ƒ", <div className={fx + " font-bold"}>{money(tongCong)}</div>)}
          </div>
        </Section>

        {/* 5. JM / Pickup / Sales */}
        <Section n="5" title="Thông tin JM / Nguồn / Sales (bước 2 — có thể nhập sau)">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fld("Số RC JM", <input name="rcJmNo" placeholder="9000…=cọc / 1000…=bán" className={inp} />)}
            {fld("SO#", <input name="soNo" className={inp} />)}
            {fld("Root Appt ID", <input name="apptId" placeholder="AP-…" className={inp} />)}
            {fld("Source 1", <select name="source1" className={inp}><option value="">— Không có source —</option>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>)}
            {fld("Source 2", <select name="source2" className={inp}><option value="">—</option>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>)}
            {fld("Sale US", <select name="sale1" className={inp}><option value="">—</option>{SALES.map((s) => <option key={s}>{s}</option>)}</select>)}
            {fld("Sale Online", <select name="saleOnline" className={inp}><option value="">—</option>{SALES_ONLINE.map((s) => <option key={s}>{s}</option>)}</select>)}
            {fld("% Support", <input name="pctSupport" type="number" step="0.01" placeholder="0.8" className={inp + " text-right font-mono"} />)}
            {fld("Transaction value", <input name="transactionValue" placeholder="1 lượng / 1 oz…" className={inp} />)}
            {fld("Old Receipt # (pickup)", <input name="oldReceiptNo" placeholder="9000…" className={inp} />)}
            {fld("Deposit Date", <input name="depositDate" type="date" className={inp} />)}
          </div>
          <div className="mt-3">{fld("Ghi chú / các đợt thanh toán sau", <textarea name="note" rows={2} placeholder="ngày – số tiền – hình thức – xác nhận…" className={inp} />)}</div>
        </Section>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className="rounded-md bg-brand px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-accent disabled:opacity-60">
            {busy ? "Đang lưu…" : <span className="inline-flex items-center gap-2"><Save className="h-4 w-4" aria-hidden="true" />Lưu vào USBC101 & sổ RC</span>}
          </button>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted">Bỏ trống Source 1 <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> RC vào danh sách thiếu nguồn.</span>
        </div>
      </form>
    </>
  );
}
