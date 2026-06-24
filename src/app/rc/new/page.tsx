"use client";
import { useState } from "react";
import PageHeader from "@/components/page-header";
import LegendBar from "@/components/legend-bar";
import { createRc, type RcInput } from "@/app/actions";
import { COMPANIES, SOURCES, SALES, BELL_CODES } from "@/lib/store";
import { TYPE_LABEL } from "@/lib/rules";
import { money } from "@/lib/format";

type Line = { moTa: string; soLuong: number; donGia: number; giaNo?: string };
const PAYS = [
  { v: "cash", l: "Cash" }, { v: "bank_wire", l: "Bank wire" },
  { v: "zelle", l: "Zelle" }, { v: "check", l: "Check" }, { v: "card", l: "Card" },
];

export default function NhapRC() {
  const [lines, setLines] = useState<Line[]>([{ moTa: "", soLuong: 1, donGia: 0 }]);
  const [busy, setBusy] = useState(false);
  const tong = lines.reduce((s, l) => s + (Number(l.soLuong) || 0) * (Number(l.donGia) || 0), 0);

  const setLine = (i: number, p: Partial<Line>) =>
    setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));

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
      pay: f.get("pay") as RcInput["pay"],
      lines,
      rcJmNo: String(f.get("rcJmNo") || ""),
      source1: String(f.get("source1") || ""),
      sale1: String(f.get("sale1") || ""),
      bellCode: String(f.get("bellCode") || ""),
    };
    try { await createRc(input); } finally { setBusy(false); }
  }

  const lbl = "font-mono text-[11px] text-muted";
  const inp = "border border-line rounded-lg px-2.5 py-1.5 text-[13px] w-full";

  return (
    <>
      <PageHeader crumb="Hằng ngày / Nhập RC" title="Nhập RC (USBC101)" />
      <LegendBar />
      <form onSubmit={onSubmit} className="p-6 max-w-[940px]">
        <div className="bg-accentSoft rounded-lg px-3.5 py-2.5 text-[12.5px] text-[#6c5320] mb-4">
          <b>✎ Nhập 2 bước trên cùng 1 đơn.</b> Bước 1 theo scan US (nhiều dòng sản phẩm → khi lưu hệ thống <b>gộp & tự tính</b>).
          Bước 2 bổ sung theo JM. Các cột <span className="italic text-accent">ƒ</span> Receipt/Deposit/PO/Tổng cộng hệ thống tự tính.
        </div>

        {/* Bước 1 */}
        <div className="bg-card border border-line rounded-xl p-5 mb-3.5">
          <h2 className="font-serif text-base mb-3">Bước 1 — theo scan RC từ US</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <label><div className={lbl}>Ngày *</div><input name="ngay" type="date" required defaultValue="2026-06-24" className={inp} /></label>
            <label><div className={lbl}>Công ty *</div>
              <select name="company" required className={inp}>{COMPANIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label><div className={lbl}>Loại (Type) *</div>
              <select name="type" required className={inp}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label><div className={lbl}>Mã SKU</div><input name="maSku" placeholder="24KRI…" className={inp} /></label>
            <label className="col-span-2"><div className={lbl}>Khách hàng *</div><input name="khach" required className={inp} /></label>
            <label><div className={lbl}>Liên hệ</div><input name="contact" placeholder="408-…" className={inp} /></label>
            <label><div className={lbl}>Hình thức TT</div>
              <select name="pay" className={inp}>{PAYS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}</select></label>
            <label className="col-span-2 md:col-span-4"><div className={lbl}>Diễn giải</div><input name="dienGiai" placeholder="Khách mua 1L VRP…" className={inp} /></label>
          </div>

          {/* Dòng hàng */}
          <div className="mt-4">
            <div className={lbl + " mb-1"}>Dòng sản phẩm (nhập riêng từng dòng)</div>
            <div className="divide-line">
              {lines.map((l, i) => (
                <div key={i} className="flex gap-2 items-center py-1.5">
                  <input value={l.moTa} onChange={(e) => setLine(i, { moTa: e.target.value })} placeholder="Mô tả sản phẩm" className={inp + " flex-1"} />
                  <input value={l.giaNo || ""} onChange={(e) => setLine(i, { giaNo: e.target.value })} placeholder="GIA#" className={inp + " w-28"} />
                  <input type="number" step="0.001" value={l.soLuong} onChange={(e) => setLine(i, { soLuong: +e.target.value })} placeholder="SL" className={inp + " w-20 text-right"} />
                  <input type="number" step="0.01" value={l.donGia} onChange={(e) => setLine(i, { donGia: +e.target.value })} placeholder="Đơn giá" className={inp + " w-28 text-right"} />
                  <div className="font-mono text-[13px] w-24 text-right">{money(l.soLuong * l.donGia)}</div>
                  <button type="button" onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))} className="text-muted hover:text-danger px-1">✕</button>
                </div>
              ))}
            </div>
            <div className="flex items-center mt-2">
              <button type="button" onClick={() => setLines((ls) => [...ls, { moTa: "", soLuong: 1, donGia: 0 }])}
                className="border border-line rounded-lg px-3 py-1.5 text-[12px] hover:border-accent">＋ Thêm dòng</button>
              <div className="flex-1" />
              <div className="font-mono text-[14px]"><span className="text-muted mr-2">TỔNG CỘNG <span className="italic text-accent">ƒ</span></span><b>{money(tong)}</b></div>
            </div>
          </div>
        </div>

        {/* Bước 2 */}
        <div className="bg-card border border-line rounded-xl p-5 mb-3.5">
          <h2 className="font-serif text-base mb-3">Bước 2 — theo JM <span className="text-muted text-[12px]">(có thể nhập sau)</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <label><div className={lbl}>Số RC JM</div><input name="rcJmNo" placeholder="9000…=cọc / 1000…=bán" className={inp} /></label>
            <label><div className={lbl}>Source 1</div>
              <select name="source1" className={inp}><option value="">— chưa có (thiếu nguồn) —</option>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label><div className={lbl}>Sale</div>
              <select name="sale1" className={inp}><option value="">—</option>{SALES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label><div className={lbl}>Mã rung chuông</div>
              <select name="bellCode" className={inp}><option value="">—</option>{BELL_CODES.map((b) => <option key={b}>{b}</option>)}</select></label>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <button disabled={busy} className="bg-brand text-white rounded-lg px-5 py-2.5 text-[14px] font-semibold hover:bg-accent disabled:opacity-60">
            {busy ? "Đang lưu…" : "＋ Lưu & đẩy vào sổ RC"}
          </button>
          <span className="text-[12px] text-muted">Bỏ trống Source 1 → RC vào danh sách thiếu nguồn.</span>
        </div>
      </form>
    </>
  );
}
