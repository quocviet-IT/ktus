"use client";

import { useMemo, useRef, useState, cloneElement, isValidElement } from "react";
import { ChevronDown, ChevronRight, Plus, RotateCcw, Save, X } from "lucide-react";
import PageHeader from "@/components/page-header";
import { createRc, lookupDepositInfo, type RcInput } from "@/app/actions";
import { COMPANIES } from "@/lib/store";
import { ACTIVE_TYPE_OPTIONS, TYPE_LABEL } from "@/lib/rules";
import { money } from "@/lib/format";
import type { PaymentMethod } from "@/lib/payments";

type Line = { moTa: string; soLuong: number; donGia: number; giaNo?: string; sku?: string };
const RECEIPT_T = ["receipt", "pick_up"];
const DEPOSIT_T = ["deposit", "extra_deposit"];
const RETURN_T = ["po", "return", "exchange"];

// Đặt NGOÀI component để không bị tạo lại mỗi lần render (tránh input mất focus)
const lbl = "text-[11.5px] text-muted mb-0.5";
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
// Combobox: chọn từ danh mục HOẶC gõ giá trị mới (feedback: cho phép bổ sung khi phát sinh)
function combo(name: string, listId: string, placeholder?: string, defaultValue?: string) {
  return <input name={name} list={listId} placeholder={placeholder} defaultValue={defaultValue} autoComplete="off" className={inp} />;
}
function pctInp(name: string, placeholder?: string) {
  return <input name={name} type="number" step="0.01" placeholder={placeholder} className={inp + " text-right font-mono"} />;
}

export default function NhapRCForm({
  paymentMethods,
  catalogOptions,
}: {
  paymentMethods: PaymentMethod[];
  catalogOptions: { sources: string[]; sales: string[]; salesOnline: string[]; bellCodes: string[] };
}) {
  const [company, setCompany] = useState<string>("PC49");
  const [type, setType] = useState<RcInput["type"]>("receipt");
  const [lines, setLines] = useState<Line[]>([{ moTa: "", soLuong: 1, donGia: 0 }]);
  const [ar, setAr] = useState<Record<string, number>>({});
  const [ap, setAp] = useState<Record<string, number>>({});
  const [orderTotalRaw, setOrderTotalRaw] = useState<string>("");
  const [taxRaw, setTaxRaw] = useState<string>("");
  const [oldReceiptNo, setOldReceiptNo] = useState("");
  const [depositDate, setDepositDate] = useState("");
  const [depLookup, setDepLookup] = useState("");
  const [busy, setBusy] = useState(false);
  const [showStep2, setShowStep2] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function resetForm() {
    formRef.current?.reset();
    setCompany("PC49"); setType("receipt");
    setLines([{ moTa: "", soLuong: 1, donGia: 0 }]);
    setAr({}); setAp({});
    setOrderTotalRaw(""); setTaxRaw("");
    setOldReceiptNo(""); setDepositDate(""); setDepLookup("");
    setShowStep2(false);
  }

  // Gõ Old Receipt # → tra đơn cọc khớp → tự điền Deposit Date (thay INDEX/MATCH của Excel)
  async function onOldReceiptBlur() {
    const v = oldReceiptNo.trim();
    if (!v) { setDepLookup(""); return; }
    setDepLookup("Đang tra…");
    const info = await lookupDepositInfo(v);
    if (info?.date) {
      setDepositDate(info.date);
      setDepLookup(`✓ Đơn cọc${info.khach ? " · " + info.khach : ""} ngày ${info.date.split("-").reverse().join("/")}`);
    } else {
      setDepLookup("Không tìm thấy đơn cọc khớp số này");
    }
  }

  // TRANS = 3 sale, PC49 (và còn lại) = 2 sale (theo file Excel thật)
  const salesCount = 3; // luôn hiển thị 3 sale

  const lineTotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.soLuong) || 0) * (Number(l.donGia) || 0), 0), [lines]);
  // Mã SKU + Diễn giải GỘP từ các dòng hàng (nhiều dòng → 1 ô)
  const skuJoined = useMemo(() => lines.map((l) => (l.sku || "").trim()).filter(Boolean).join(", "), [lines]);
  const descJoined = useMemo(() => lines.map((l) => (l.moTa || "").trim()).filter(Boolean).join(", "), [lines]);
  // Thuế theo loại đơn: cọc 9.375% / bán 10% / khác 0% — tự tính, sửa được
  const taxRate = DEPOSIT_T.includes(type) ? 9.375 : RECEIPT_T.includes(type) ? 10 : 0;
  const taxAuto = lineTotal * taxRate / 100;
  const tax = taxRaw === "" ? taxAuto : Number(taxRaw) || 0;
  const subtotalWithTax = lineTotal + tax;
  const arTotal = Object.values(ar).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const apTotal = Object.values(ap).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const receipt = RECEIPT_T.includes(type) ? arTotal : 0;
  const deposit = DEPOSIT_T.includes(type) ? arTotal : 0;
  const returnPo = RETURN_T.includes(type) ? (apTotal || lineTotal) : 0;
  const tongCong = receipt + deposit - returnPo;

  // Tổng đơn / đã thanh toán / còn lại (đơn bán & cọc)
  const orderTotal = orderTotalRaw === "" ? subtotalWithTax : Number(orderTotalRaw) || 0;
  const paid = arTotal;
  const remaining = orderTotal - paid;
  const isPO = RETURN_T.includes(type);

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
      maSku: skuJoined,
      dienGiai: descJoined,
      companyAccount: String(f.get("companyAccount") || ""),
      arCash: ar.cash || 0, arBankwire: ar.bank_wire || 0, arZelle: ar.zelle || 0, arCheck: ar.check || 0,
      apCash: ap.cash || 0, apBankwire: ap.bank_wire || 0, apZelle: ap.zelle || 0, apCheck: ap.check || 0,
      arPayments: ar,
      apPayments: ap,
      pay: (Object.keys(ar).find((k) => (ar[k] || 0) > 0)) || "cash",
      lines,
      rcJmNo: String(f.get("rcJmNo") || ""),
      soNo: String(f.get("soNo") || ""),
      oldReceiptNo: String(f.get("oldReceiptNo") || ""),
      depositDate: String(f.get("depositDate") || ""),
      source1: String(f.get("source1") || ""),
      source2: String(f.get("source2") || ""),
      sale1: String(f.get("sale1") || ""),
      sale2: String(f.get("sale2") || ""),
      sale3: String(f.get("sale3") || ""),
      sale1Pct: Number(f.get("sale1Pct")) || undefined,
      sale2Pct: Number(f.get("sale2Pct")) || undefined,
      sale3Pct: Number(f.get("sale3Pct")) || undefined,
      saleOnline: String(f.get("saleOnline") || ""),
      saleOnline2: String(f.get("saleOnline2") || ""),
      saleOnline3: String(f.get("saleOnline3") || ""),
      transactionValue: String(f.get("transactionValue") || ""),
      pctSupport: Number(f.get("pctSupport")) || undefined,
      orderTotal: orderTotal || undefined,
      taxRate: taxRate || undefined,
      taxAmount: tax || undefined,
      bellCode: String(f.get("bellCode") || ""),
      note: String(f.get("note") || ""),
    };
    try { await createRc(input); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader crumb="Hàng ngày / Nhập RC" title="Nhập RC (USBC101)" />
      <form ref={formRef} onSubmit={onSubmit} className="p-6 max-w-[920px]">
        {/* 1. Thông tin chung */}
        <Section n="1" title="Thông tin chung">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fld("Date *", <input name="ngay" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inp} />)}
            {fld("Company *", <select name="company" required value={company} onChange={(e) => setCompany(e.target.value)} className={inp}>{COMPANIES.map((c) => <option key={c}>{c}</option>)}</select>)}
            {fld("Company account *", <select name="companyAccount" required className={inp}><option value="">- chọn -</option>{[`${company} cash`, `${company} bank`].map((a) => <option key={a} value={a}>{a}</option>)}</select>)}
            {fld("Type *", <select name="type" required value={type} onChange={(e) => setType(e.target.value as RcInput["type"])} className={inp}>{ACTIVE_TYPE_OPTIONS.map((k) => <option key={k} value={k}>{TYPE_LABEL[k]}</option>)}</select>)}
            {fld("Customer name *", <input name="khach" required placeholder="Tên khách" className={inp} />)}
            {fld("Contact", <input name="contact" placeholder="408-…" className={inp} />)}
          </div>
          {/* Mã SKU & Diễn giải tự gộp từ Dòng hàng (cách nhau bằng dấu phẩy) — ẩn khỏi form */}
        </Section>

        {/* 2. Dòng hàng */}
        <Section n="2" title="Dòng hàng / sản phẩm">
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_70px_100px_100px_auto] gap-2 items-center">
                <input value={l.moTa} onChange={(e) => setLine(i, { moTa: e.target.value })} placeholder="Description" className={inp} />
                <input value={l.sku || ""} onChange={(e) => setLine(i, { sku: e.target.value })} placeholder="SKU" className={inp} />
                <input type="number" step="0.001" value={l.soLuong} onChange={(e) => setLine(i, { soLuong: +e.target.value })} placeholder="Quantity" className={inp + " text-right font-mono"} />
                <input type="number" step="0.01" value={l.donGia} onChange={(e) => setLine(i, { donGia: +e.target.value })} placeholder="Unit Price" className={inp + " text-right font-mono"} />
                <div className="text-right font-mono text-[13px]">{money(l.soLuong * l.donGia)}</div>
                <button type="button" onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-dangerSoft hover:text-danger" aria-label="Xóa dòng">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-3">
            <button type="button" onClick={() => setLines((ls) => [...ls, { moTa: "", soLuong: 1, donGia: 0 }])} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[12px] hover:border-accent">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Thêm dòng
            </button>
            <div className="flex-1" />
            <div className="min-w-[280px] text-[13px] space-y-1">
              <div className="flex items-center justify-between"><span className="text-muted">Tổng dòng hàng</span><b className="font-mono">{money(lineTotal)}</b></div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted">Thuế ({taxRate}%) <span className="text-accent italic">ƒ</span></span>
                <input type="number" step="0.01" aria-label="Thuế"
                  value={taxRaw === "" ? (taxAuto ? taxAuto.toFixed(2) : "") : taxRaw}
                  onChange={(e) => setTaxRaw(e.target.value)}
                  className="w-[120px] rounded-md border border-line px-2 py-1 text-right font-mono text-[13px]" />
              </div>
              <div className="flex items-center justify-between border-t border-line pt-1"><span className="text-muted">Tổng cộng (gồm thuế)</span><b className="font-mono">{money(subtotalWithTax)}</b></div>
            </div>
          </div>
        </Section>

        {/* 3 + 4: A/R & A/P */}
        <div className="grid md:grid-cols-2 gap-3.5">
          <Section n="3" title="Thu tiền (A/R) — khách trả">
            <p className="text-[11.5px] text-muted mb-2">Chọn <b>nhiều hình thức</b> bằng cách nhập số tiền vào các ô tương ứng (để trống nếu không dùng) — hệ thống tự cộng.</p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {paymentMethods.map((method) => (
                <div key={method.code}>{fld(method.label, amt(ar[method.code] || 0, (v) => setAr((s) => ({ ...s, [method.code]: v }))))}</div>
              ))}
            </div>
            <div className="mt-2 flex justify-end font-mono text-[12.5px]"><span className="text-muted mr-2">Đã thu đợt này</span><b>{money(paid)}</b></div>
          </Section>
          <Section n="4" title="Chi tiền (A/P) — PO / mua vào">
            <p className="text-[11.5px] text-muted mb-2">Hình thức thanh toán <b>đơn mua vào</b>: nhập số tiền chi ra theo từng hình thức.</p>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <div key={method.code}>{fld(method.label, amt(ap[method.code] || 0, (v) => setAp((s) => ({ ...s, [method.code]: v }))))}</div>
              ))}
            </div>
            <div className="mt-2 flex justify-end font-mono text-[12.5px]"><span className="text-muted mr-2">Đã chi đợt này</span><b className="text-danger">{money(apTotal)}</b></div>
          </Section>
        </div>

        {/* Tổng đơn / Đã thanh toán / Còn lại + CONDITION tự tính */}
        <Section n="ƒ" title="Tổng đơn & CONDITION — tự tính">
          {!isPO && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              {fld("Tổng đơn (gồm thuế) ƒ", <div className={fx}>{money(subtotalWithTax)}</div>)}
              {fld("Số tiền thanh toán ƒ", <div className={fx}>{money(paid)}</div>)}
              {fld("Số tiền còn lại ƒ", <div className={fx + (remaining > 0 ? " text-danger" : " text-ok")}>{money(remaining)}</div>)}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fld("Return/PO ƒ", <div className={fx}>{money(returnPo)}</div>)}
            {fld("Receipt ƒ", <div className={fx}>{money(receipt)}</div>)}
            {fld("Deposit ƒ", <div className={fx}>{money(deposit)}</div>)}
            {fld("TỔNG CỘNG ƒ", <div className={fx + " font-bold"}>{money(tongCong)}</div>)}
          </div>
        </Section>

        {/* Bước 2 — thu gọn (JM / Nguồn / Sales / Rung chuông) */}
        <button type="button" onClick={() => setShowStep2((s) => !s)}
          className="mb-3.5 w-full flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-3 font-serif text-[15px] hover:border-accent">
          {showStep2 ? <ChevronDown className="h-4 w-4 text-accent" aria-hidden="true" /> : <ChevronRight className="h-4 w-4 text-accent" aria-hidden="true" />}
          Bước 2 — JM / Nguồn / Sales / Rung chuông
          <span className="text-muted text-[12px] font-sans">(có thể nhập sau)</span>
        </button>

        {showStep2 && (<>
        {/* 5. JM / Pickup / Nguồn */}
        <Section n="5" title="Thông tin JM / Nguồn (bước 2 — có thể nhập sau)">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fld("Số RC JM", <input name="rcJmNo" placeholder="9000…=cọc / 1000…=bán" className={inp} />)}
            {fld("SO#", <input name="soNo" className={inp} />)}
            {fld("Source 1", combo("source1", "dl-sources", "WI / TEL / FB… (gõ mới được)"))}
            {fld("Source 2", combo("source2", "dl-sources", "— hoặc gõ mới —"))}
            {fld("Old Receipt # (pickup)", <input name="oldReceiptNo" value={oldReceiptNo} onChange={(e) => setOldReceiptNo(e.target.value)} onBlur={onOldReceiptBlur} placeholder="9000… (tự tra ngày cọc)" className={inp} />)}
            {fld("Deposit Date (tự nhảy)", <input name="depositDate" type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} className={inp} />)}
          </div>
          {depLookup && <p className="mt-2 text-[11.5px] text-muted">{depLookup}</p>}
        </Section>

        {/* 6. Sales & phân bổ */}
        <Section n="6" title="Sales & tỷ lệ phân bổ (tối đa 3 sale)">
          <div className="space-y-2">
            {Array.from({ length: salesCount }).map((_, i) => (
              <div key={i} className="grid grid-cols-[24px_1fr_120px] gap-2 items-end">
                <div className="font-mono text-[12px] text-muted pb-1.5">#{i + 1}</div>
                {fld(`Sale #${i + 1}`, combo(`sale${i + 1}`, "dl-sales", i === 0 ? "Sale chính (gõ mới được)" : "— hoặc gõ mới —"))}
                {fld("Tỷ lệ %", pctInp(`sale${i + 1}Pct`, i === 0 ? "80" : "20"))}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 border-t border-line pt-3">
            {fld("Sale Online #1", combo("saleOnline", "dl-online", "Team VN…"))}
            {fld("Sale Online #2", combo("saleOnline2", "dl-online", "—"))}
            {fld("Sale Online #3", combo("saleOnline3", "dl-online", "—"))}
            {fld("% Support (hỗ trợ online)", pctInp("pctSupport", "0.8"))}
            {fld("Transaction value", <input name="transactionValue" placeholder="1 lượng / 1 oz…" className={inp} />)}
          </div>
          <p className="text-[11px] text-muted mt-2">Lưu ý: <b>% Support</b> là mức hỗ trợ đơn của sale online — khác với <b>Tỷ lệ %</b> phân bổ giữa các sale.</p>
        </Section>

        {/* 7. Rung chuông & ghi chú */}
        <Section n="7" title="Rung chuông & ghi chú">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fld("Mã rung chuông", combo("bellCode", "dl-bell", "RC1 / RC2… (gõ mới được)"))}
          </div>
          <div className="mt-3">{fld("Ghi chú / các đợt thanh toán sau", <textarea name="note" rows={2} placeholder="ngày – số tiền – hình thức – xác nhận…" className={inp} />)}</div>
        </Section>
        </>)}

        {/* Danh mục gợi ý (combobox) — cho phép chọn hoặc gõ giá trị mới */}
        <datalist id="dl-sources">{catalogOptions.sources.map((s) => <option key={s} value={s} />)}</datalist>
        <datalist id="dl-sales">{catalogOptions.sales.map((s) => <option key={s} value={s} />)}</datalist>
        <datalist id="dl-online">{catalogOptions.salesOnline.map((s) => <option key={s} value={s} />)}</datalist>
        <datalist id="dl-bell">{catalogOptions.bellCodes.map((b) => <option key={b} value={b} />)}</datalist>

        {/* Thanh hành động cố định */}
        <div className="sticky bottom-0 -mx-6 mt-4 flex items-center gap-3 border-t border-line bg-card/95 px-6 py-3 backdrop-blur">
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-accent disabled:opacity-60">
            <Save className="h-4 w-4" aria-hidden="true" /> {busy ? "Đang lưu…" : "Lưu RC"}
          </button>
          <button type="button" onClick={resetForm} disabled={busy} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-[13px] text-muted hover:border-danger hover:text-danger disabled:opacity-60">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
          </button>
          <div className="flex-1" />
          <span className="text-[12px] text-muted">Bỏ trống Source 1 → RC vào danh sách thiếu nguồn.</span>
        </div>
      </form>
    </>
  );
}
