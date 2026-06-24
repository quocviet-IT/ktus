import { notFound } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import StatusBadge from "@/components/status-badge";
import { getTransaction, findByJm } from "@/lib/data";
import { computeCondition, paidTotal, TYPE_LABEL, jmKind, STATUS_LABEL } from "@/lib/rules";
import { money, ddmmyyyy, ddmm } from "@/lib/format";
import { setStatus, updateRcJm } from "@/app/actions";
import { SOURCES, SALES, SALES_ONLINE, BELL_CODES } from "@/lib/store";

export default async function RcDetail({ params }: { params: { id: string } }) {
  const t = await getTransaction(params.id);
  if (!t) return notFound();
  const c = computeCondition(t);
  const dep = t.oldReceiptNo ? await findByJm(t.oldReceiptNo) : undefined;
  const paid = paidTotal(t);
  const tongDon = t.lineItems.reduce((s, l) => s + l.soLuong * l.donGia, 0) || c.tongCong;

  const Field = ({ label, children, fx }: { label: string; children: React.ReactNode; fx?: boolean }) => (
    <div>
      <div className="font-mono text-[10.5px] text-muted">{label} {fx && <span className="text-accent italic">ƒ</span>}</div>
      <div className={`text-[13.5px] ${fx ? "text-muted" : ""}`}>{children}</div>
    </div>
  );

  return (
    <>
      <PageHeader crumb="Sổ giao dịch / Chi tiết" title={`Đơn ${t.rcJmNo || "(chưa có số JM)"}`}>
        <Link href="/rc" className="text-[13px] text-brand hover:text-accent">← Sổ giao dịch</Link>
      </PageHeader>
      <div className="p-6 max-w-[920px]">
        <div className="bg-card border border-line rounded-xl p-5 mb-3.5">
          <div className="flex items-center gap-3 mb-4">
            <span className="badge bg-[#eceee9] text-[#445]">{t.company}</span>
            <span className="text-[13px]">{TYPE_LABEL[t.type]}</span>
            <StatusBadge s={t.trangThai} />
            {t.bellCode && <span className="text-accent text-[13px]">🔔 {t.bellCode}</span>}
            <div className="flex-1" />
            <form action={setStatus.bind(null, t.id, "cancel")}>
              <button type="submit" className="border border-line rounded-lg px-3 py-1.5 text-[12px] hover:border-danger hover:text-danger">Cancel đơn</button>
            </form>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Field label="Ngày">{ddmmyyyy(t.ngay)}</Field>
            <Field label="Khách hàng">{t.khach}{t.contact ? ` · ${t.contact}` : ""}</Field>
            <Field label="Source 1">{t.source1 || <span className="text-danger">Thiếu nguồn</span>}</Field>
            <Field label="Sale">{t.sale1 || "—"}{t.saleOnline ? ` / ${t.saleOnline}` : ""}</Field>
            <Field label="Diễn giải">{t.dienGiai}</Field>
            <Field label="SO#">{t.soNo || "—"}</Field>
            <Field label="Appt ID">{t.apptId || "—"}</Field>
            <Field label="Số RC JM">{t.rcJmNo || "—"} {t.rcJmNo && <span className="text-muted">({jmKind(t.rcJmNo) === "deposit" ? "cọc" : jmKind(t.rcJmNo) === "sale" ? "bán/pickup" : "?"})</span>}</Field>
          </div>

          {dep && (
            <div className="bg-accentSoft rounded-lg px-3 py-2 text-[12.5px] text-[#6c5320] mb-4">
              🔗 Pickup nối đơn đặt cọc <b>{dep.rcJmNo}</b> ngày {ddmmyyyy(dep.ngay)} — đã cọc {money(paidTotal(dep))}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-line pt-4">
            <Field label="Receipt" fx>{money(c.receipt)}</Field>
            <Field label="Deposit" fx>{money(c.deposit)}</Field>
            <Field label="Return/PO" fx>{money(c.returnPo)}</Field>
            <Field label="TỔNG CỘNG" fx>{money(c.tongCong)}</Field>
          </div>
        </div>

        {t.lineItems.length > 0 && (
          <div className="bg-card border border-line rounded-xl p-5 mb-3.5">
            <h2 className="font-serif text-base mb-3">Dòng hàng <span className="text-muted text-[12px]">(nhiều dòng — gộp & tự tính)</span></h2>
            <div className="divide-line">
              {t.lineItems.map((l) => (
                <div key={l.id} className="flex items-center gap-3 py-2 text-[13px]">
                  <div className="flex-1">{l.moTa}{l.giaNo ? <span className="text-muted font-mono"> · GIA {l.giaNo}</span> : ""}</div>
                  <div className="font-mono text-muted">{l.soLuong} × {money(l.donGia)}</div>
                  <div className="font-mono font-semibold min-w-[90px] text-right">{money(l.soLuong * l.donGia)}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end font-mono text-[13px] pt-2 border-t border-line mt-1">
              <span className="text-muted mr-3">Tổng đơn</span><b>{money(tongDon)}</b>
            </div>
          </div>
        )}

        {t.payments.length > 0 && (
          <div className="bg-card border border-line rounded-xl p-5">
            <h2 className="font-serif text-base mb-3">Thanh toán <span className="text-muted text-[12px]">(đợt đầu + chú thích các đợt sau)</span></h2>
            <div className="divide-line">
              {t.payments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-1.5 text-[13px] font-mono">
                  <span className="min-w-[64px]">{ddmm(p.ngay)}</span>
                  <span className={`min-w-[90px] text-right ${p.soTien < 0 ? "text-danger" : ""}`}>{money(p.soTien)}</span>
                  <span className="text-muted">{p.hinhThuc || ""}</span>
                  {p.isDau && <span className="badge bg-okSoft text-ok">đợt đầu</span>}
                  {p.ghiChu && <span className="text-muted">· {p.ghiChu}</span>}
                  {p.nguoiXacNhan && <span className="text-muted">· {p.nguoiXacNhan} ✓</span>}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-6 font-mono text-[13px] pt-2 border-t border-line mt-1">
              <span><span className="text-muted">Đã thu</span> <b>{money(paid)}</b></span>
              <span><span className="text-muted">Còn thiếu</span> <b className={tongDon - paid > 0 ? "text-danger" : "text-ok"}>{money(tongDon - paid)}</b></span>
            </div>
          </div>
        )}

        {/* Sửa RC — cập nhật JM (bước 2) */}
        <form action={updateRcJm.bind(null, t.id)} className="bg-card border border-line rounded-xl p-5 mt-1">
          <h2 className="font-serif text-base mb-3">Sửa / Cập nhật JM (bước 2)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(() => { const lbl = "font-mono text-[11px] text-muted"; const inp = "border border-line rounded-md px-2.5 py-1.5 text-[13px] w-full bg-white"; return (<>
              <label><div className={lbl}>Số RC JM</div><input name="rcJmNo" defaultValue={t.rcJmNo || ""} placeholder="9000…/1000…" className={inp} /></label>
              <label><div className={lbl}>SO#</div><input name="soNo" defaultValue={t.soNo || ""} className={inp} /></label>
              <label><div className={lbl}>Root Appt ID</div><input name="apptId" defaultValue={t.apptId || ""} className={inp} /></label>
              <label><div className={lbl}>Trạng thái</div>
                <select name="trangThai" defaultValue={t.trangThai} className={inp}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label><div className={lbl}>Source 1</div>
                <select name="source1" defaultValue={t.source1 || ""} className={inp}><option value="">— Không có source —</option>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label><div className={lbl}>Source 2</div>
                <select name="source2" defaultValue={t.source2 || ""} className={inp}><option value="">—</option>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label><div className={lbl}>Sale US</div>
                <select name="sale1" defaultValue={t.sale1 || ""} className={inp}><option value="">—</option>{SALES.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label><div className={lbl}>Sale Online</div>
                <select name="saleOnline" defaultValue={t.saleOnline || ""} className={inp}><option value="">—</option>{SALES_ONLINE.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label><div className={lbl}>% Support</div><input name="pctSupport" type="number" step="0.01" defaultValue={t.pctSupport ?? ""} className={inp} /></label>
              <label><div className={lbl}>Transaction value</div><input name="transactionValue" defaultValue={t.transactionValue || ""} className={inp} /></label>
              <label><div className={lbl}>Mã rung chuông</div>
                <select name="bellCode" defaultValue={t.bellCode || ""} className={inp}><option value="">—</option>{BELL_CODES.map((b) => <option key={b}>{b}</option>)}</select></label>
              <label><div className={lbl}>Old Receipt # (pickup)</div><input name="oldReceiptNo" defaultValue={t.oldReceiptNo || ""} className={inp} /></label>
              <label><div className={lbl}>Deposit Date</div><input name="depositDate" type="date" defaultValue={t.depositDate || ""} className={inp} /></label>
              <label className="col-span-2 md:col-span-4"><div className={lbl}>Ghi chú</div><input name="note" defaultValue={t.note || ""} className={inp} /></label>
            </>); })()}
          </div>
          <button type="submit" className="mt-3 rounded-md bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent">Lưu cập nhật</button>
        </form>
      </div>
    </>
  );
}
