"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Save } from "lucide-react";
import { updateRcJm } from "@/app/actions";
import { STATUS_LABEL } from "@/lib/rules";
import type { Transaction } from "@/lib/types";

export default function JmEditForm({
  t, sources, sales, salesOnline, bellCodes,
}: {
  t: Transaction;
  sources: string[]; sales: string[]; salesOnline: string[]; bellCodes: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    start(async () => {
      const res = await updateRcJm(t.id, fd);
      if (res.ok) { setMsg({ ok: true, text: "Đã lưu cập nhật ✓" }); router.refresh(); }
      else setMsg({ ok: false, text: "Lưu thất bại: " + (res.error || "") });
    });
  }

  const lbl = "font-mono text-[11px] text-muted";
  const inp = "border border-line rounded-md px-2.5 py-1.5 text-[13px] w-full bg-white";

  return (
    <form onSubmit={onSubmit} className="bg-card border border-line rounded-xl p-5 mt-1">
      <h2 className="font-serif text-base mb-3">Sửa / Cập nhật JM (bước 2)</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label><div className={lbl}>Số RC JM</div><input name="rcJmNo" defaultValue={t.rcJmNo || ""} placeholder="9000…/1000…" className={inp} /></label>
        <label><div className={lbl}>SO#</div><input name="soNo" defaultValue={t.soNo || ""} className={inp} /></label>
        <label><div className={lbl}>Trạng thái</div>
          <select name="trangThai" aria-label="Trạng thái" defaultValue={t.trangThai} className={inp}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label><div className={lbl}>Source 1</div><input name="source1" list="dl-sources" defaultValue={t.source1 || ""} placeholder="WI / TEL… (gõ mới được)" autoComplete="off" className={inp} /></label>
        <label><div className={lbl}>Source 2</div><input name="source2" list="dl-sources" defaultValue={t.source2 || ""} placeholder="— hoặc gõ mới —" autoComplete="off" className={inp} /></label>
        <label><div className={lbl}>Tổng tiền đơn hàng</div><input name="orderTotal" type="number" step="0.01" defaultValue={t.orderTotal ?? ""} className={inp} /></label>
        <label><div className={lbl}>Transaction value</div><input name="transactionValue" defaultValue={t.transactionValue || ""} className={inp} /></label>
        <label><div className={lbl}>Sale #1</div><input name="sale1" list="dl-sales" defaultValue={t.sale1 || ""} autoComplete="off" className={inp} /></label>
        <label><div className={lbl}>Tỷ lệ % #1</div><input name="sale1Pct" type="number" step="0.01" defaultValue={t.sale1Pct ?? ""} className={inp} /></label>
        <label><div className={lbl}>Sale #2</div><input name="sale2" list="dl-sales" defaultValue={t.sale2 || ""} autoComplete="off" className={inp} /></label>
        <label><div className={lbl}>Tỷ lệ % #2</div><input name="sale2Pct" type="number" step="0.01" defaultValue={t.sale2Pct ?? ""} className={inp} /></label>
        <label><div className={lbl}>Sale #3 (TRANS)</div><input name="sale3" list="dl-sales" defaultValue={t.sale3 || ""} autoComplete="off" className={inp} /></label>
        <label><div className={lbl}>Tỷ lệ % #3</div><input name="sale3Pct" type="number" step="0.01" defaultValue={t.sale3Pct ?? ""} className={inp} /></label>
        <label><div className={lbl}>Sale Online #1</div><input name="saleOnline" list="dl-online" defaultValue={t.saleOnline || ""} autoComplete="off" className={inp} /></label>
        <label><div className={lbl}>% Support (hỗ trợ online)</div><input name="pctSupport" type="number" step="0.01" defaultValue={t.pctSupport ?? ""} className={inp} /></label>
        <label><div className={lbl}>Sale Online #2</div><input name="saleOnline2" list="dl-online" defaultValue={t.saleOnline2 || ""} autoComplete="off" className={inp} /></label>
        <label><div className={lbl}>Sale Online #3</div><input name="saleOnline3" list="dl-online" defaultValue={t.saleOnline3 || ""} autoComplete="off" className={inp} /></label>
        <label><div className={lbl}>Mã rung chuông</div><input name="bellCode" list="dl-bell" defaultValue={t.bellCode || ""} placeholder="RC1 / RC2… (gõ mới được)" autoComplete="off" className={inp} /></label>
        <label><div className={lbl}>Old Receipt # (pickup)</div><input name="oldReceiptNo" defaultValue={t.oldReceiptNo || ""} className={inp} /></label>
        <label><div className={lbl}>Deposit Date</div><input name="depositDate" type="date" defaultValue={t.depositDate || ""} className={inp} /></label>
        <label className="col-span-2 md:col-span-4"><div className={lbl}>Ghi chú</div><input name="note" defaultValue={t.note || ""} className={inp} /></label>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent disabled:opacity-60">
          {pending ? "Đang lưu…" : <span className="inline-flex items-center gap-2"><Save className="h-4 w-4" aria-hidden="true" /> Lưu cập nhật</span>}
        </button>
        {msg && (
          <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${msg.ok ? "text-ok" : "text-danger"}`}>
            {msg.ok ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <AlertCircle className="h-4 w-4" aria-hidden="true" />}
            {msg.text}
          </span>
        )}
      </div>

      <datalist id="dl-sources">{sources.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="dl-sales">{sales.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="dl-online">{salesOnline.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="dl-bell">{bellCodes.map((b) => <option key={b} value={b} />)}</datalist>
    </form>
  );
}
