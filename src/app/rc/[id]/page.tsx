import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, Check, Link2 } from "lucide-react";
import PageHeader from "@/components/page-header";
import StatusBadge from "@/components/status-badge";
import { findByJm, getTransaction, listCatalogGroups, listPaymentMethods } from "@/lib/data";
import { computeCondition, paidTotal, TYPE_LABEL, jmKind } from "@/lib/rules";
import { money, ddmmyyyy, ddmm } from "@/lib/format";
import JmEditForm from "./jm-edit-form";
import CancelOrderForm from "./cancel-order-form";
import { amountByPaymentMethod, paymentTotal } from "@/lib/payments";

export default async function RcDetail({ params }: { params: { id: string } }) {
  const t = await getTransaction(params.id);
  if (!t) return notFound();
  const [paymentMethods, catalogGroups] = await Promise.all([listPaymentMethods(), listCatalogGroups()]);
  const labels = (key: string) => catalogGroups.find((group) => group.key === key)?.items.map((item) => item.label) ?? [];
  const sources = labels("source");
  const sales = labels("sales_counter");
  const salesOnline = labels("sales_online");
  const bellCodes = labels("bell_code");
  const c = computeCondition(t);
  const dep = t.oldReceiptNo ? await findByJm(t.oldReceiptNo) : undefined;
  const paid = paidTotal(t);
  const tongDon = t.orderTotal || t.lineItems.reduce((s, l) => s + l.soLuong * l.donGia, 0) || c.tongCong;
  const apTotal = paymentTotal(t, "ap");
  const isPO = t.type === "po" || t.type === "return" || t.type === "exchange";
  const salesList = [
    { ten: t.sale1, pct: t.sale1Pct }, { ten: t.sale2, pct: t.sale2Pct }, { ten: t.sale3, pct: t.sale3Pct },
  ].filter((s) => s.ten);
  const onlineList = [t.saleOnline, t.saleOnline2, t.saleOnline3].filter(Boolean);

  const Field = ({ label, children, fx }: { label: string; children: React.ReactNode; fx?: boolean }) => (
    <div>
      <div className="font-mono text-[10.5px] text-muted">{label} {fx && <span className="text-accent italic">ƒ</span>}</div>
      <div className={`text-[13.5px] ${fx ? "text-muted" : ""}`}>{children}</div>
    </div>
  );

  return (
    <>
      <PageHeader crumb="Sổ giao dịch / Chi tiết" title={`Đơn ${t.rcJmNo || "(chưa có số JM)"}`}>
        <Link href="/rc" className="inline-flex items-center gap-1 text-[13px] text-brand hover:text-accent">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Sổ giao dịch
        </Link>
      </PageHeader>
      <div className="p-6 max-w-[920px]">
        <div className="bg-card border border-line rounded-xl p-5 mb-3.5">
          <div className="flex items-center gap-3 mb-4">
            <span className="badge bg-[#eceee9] text-[#445]">{t.company}</span>
            <span className="text-[13px]">{TYPE_LABEL[t.type]}</span>
            <StatusBadge s={t.trangThai} />
            {t.bellCode && <span className="inline-flex items-center gap-1 text-accent text-[13px]"><Bell className="h-3.5 w-3.5" aria-hidden="true" /> {t.bellCode}</span>}
            <div className="flex-1" />
            <CancelOrderForm id={t.id} orderDate={t.ngay} defaultDate={new Date().toISOString().slice(0, 10)} />
          </div>

          {t.trangThai === "cancel" && (
            <div className="mb-4 rounded-md border border-danger/25 bg-dangerSoft px-3 py-2 text-[12.5px] text-danger">
              <b>Don da huy</b>
              {t.canceledAt ? ` ngay ${ddmmyyyy(t.canceledAt)}` : ""}
              {t.cancelReason ? ` - ${t.cancelReason}` : ""}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Field label="Ngày">{ddmmyyyy(t.ngay)}</Field>
            <Field label="Khách hàng">{t.khach}{t.contact ? ` · ${t.contact}` : ""}</Field>
            <Field label="Source 1 / 2">{t.source1 || <span className="text-danger">Thiếu nguồn</span>}{t.source2 ? ` / ${t.source2}` : ""}</Field>
            <Field label="Sales (tỷ lệ %)">{salesList.length ? salesList.map((s, i) => <span key={i}>{i > 0 ? ", " : ""}{s.ten}{s.pct != null ? ` (${s.pct}%)` : ""}</span>) : "—"}</Field>
            <Field label="Sale Online (% support)">{onlineList.length ? `${onlineList.join(", ")}${t.pctSupport != null ? ` · ${t.pctSupport}` : ""}` : "—"}</Field>
            <Field label="Diễn giải">{t.dienGiai}</Field>
            <Field label="SO#">{t.soNo || "—"}</Field>
            <Field label="Số RC JM">{t.rcJmNo || "—"} {t.rcJmNo && <span className="text-muted">({jmKind(t.rcJmNo) === "deposit" ? "cọc" : jmKind(t.rcJmNo) === "sale" ? "bán/pickup" : "?"})</span>}</Field>
          </div>

          {dep && (
            <div className="bg-accentSoft rounded-lg px-3 py-2 text-[12.5px] text-[#6c5320] mb-4">
              <span className="inline-flex items-start gap-1.5"><Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> <span>Pickup nối đơn đặt cọc <b>{dep.rcJmNo}</b> ngày {ddmmyyyy(dep.ngay)} — đã cọc {money(paidTotal(dep))}</span></span>
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

        {(isPO || apTotal > 0) && (
          <div className="bg-card border border-line rounded-xl p-5 mb-3.5">
            <h2 className="font-serif text-base mb-3">Hình thức thanh toán — đơn mua vào (A/P)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[13px]">
              {paymentMethods.map((method) => (
                <Field key={method.code} label={method.label}>{money(amountByPaymentMethod(t, method.code, "ap"))}</Field>
              ))}
            </div>
            <div className="flex justify-end font-mono text-[13px] pt-2 border-t border-line mt-2">
              <span className="text-muted mr-3">Tổng chi ra</span><b className="text-danger">{money(apTotal || c.returnPo)}</b>
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
                  {p.nguoiXacNhan && <span className="inline-flex items-center gap-1 text-muted">· {p.nguoiXacNhan} <Check className="h-3.5 w-3.5" aria-hidden="true" /></span>}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-6 font-mono text-[13px] pt-2 border-t border-line mt-1">
              <span><span className="text-muted">Đã thu</span> <b>{money(paid)}</b></span>
              <span><span className="text-muted">Còn thiếu</span> <b className={tongDon - paid > 0 ? "text-danger" : "text-ok"}>{money(tongDon - paid)}</b></span>
            </div>
          </div>
        )}

        {/* Sửa RC — cập nhật JM (bước 2) — client form có thông báo Lưu */}
        <JmEditForm t={t} sources={sources} sales={sales} salesOnline={salesOnline} bellCodes={bellCodes} />
      </div>
    </>
  );
}
