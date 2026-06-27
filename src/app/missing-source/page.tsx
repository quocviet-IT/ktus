import PageHeader from "@/components/page-header";
import { ArrowRight, Check, CircleCheck, Send } from "lucide-react";
import { listCatalogGroups, listTransactions } from "@/lib/data";
import { isMissingSource } from "@/lib/rules";
import { ddmm } from "@/lib/format";
import { sendToUS, resolveSourceDetail } from "@/app/actions";

export default async function MissingSource() {
  const rows = (await listTransactions()).filter(isMissingSource);
  const catalogGroups = await listCatalogGroups();
  const sources = catalogGroups.find((group) => group.key === "source")?.items.map((item) => item.label) ?? [];
  const inp = "border border-line rounded-lg px-2 py-1 text-[12px] bg-white";

  return (
    <>
      <PageHeader crumb="Báo cáo / RC thiếu nguồn" title="Thống kê RC thiếu thông tin nguồn" />
      <div className="p-6">
        <div className="bg-card border border-line rounded-xl px-3">
          {rows.length ? rows.map((t) => {
            const sent = (t.note || "").includes("Đã gửi US");
            return (
              <div key={t.id} className="py-2.5 border-b border-line text-[13px]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-muted min-w-[52px]">{ddmm(t.ngay)}</span>
                  <span className="font-mono text-brand min-w-[100px]">{t.rcJmNo || "—"}</span>
                  <span className="flex-1 truncate">{t.dienGiai} <span className="text-muted">· {t.khach}</span></span>
                  <span className="badge bg-dangerSoft text-danger">{sent ? "Chờ US bổ sung" : "Thiếu nguồn"}</span>
                  {!sent && (
                    <form action={sendToUS.bind(null, t.id)}>
                      <button type="submit" className="inline-flex items-center gap-1.5 border border-line rounded-lg px-3 py-1 text-[12px] hover:border-accent">
                        <Send className="h-3.5 w-3.5" aria-hidden="true" /> Gửi US <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </form>
                  )}
                </div>
                {/* Cập nhật CHI TIẾT nguồn (luôn dùng được, không chỉ sau khi gửi US) */}
                <form action={resolveSourceDetail.bind(null, t.id)} className="flex flex-wrap gap-1.5 items-center mt-2 pl-[52px]">
                  <input name="source1" list="dl-src-miss" defaultValue={t.source1 || ""} placeholder="Source 1 (gõ mới được)" autoComplete="off" aria-label="Source 1" className={inp + " min-w-[170px]"} />
                  <input name="source2" list="dl-src-miss" defaultValue={t.source2 || ""} placeholder="Source 2" autoComplete="off" aria-label="Source 2" className={inp + " min-w-[120px]"} />
                  <input name="rcJmNo" defaultValue={t.rcJmNo || ""} placeholder="Mã đơn JM" aria-label="Mã đơn JM" className={inp + " min-w-[120px] font-mono"} />
                  <button type="submit" className="inline-flex items-center gap-1.5 bg-brand text-white rounded-lg px-3 py-1 text-[12px] hover:bg-accent">
                    Cập nhật nguồn <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </form>
              </div>
            );
          }) : <div className="flex items-center justify-center gap-1.5 text-center text-muted py-6 text-[13px]"><CircleCheck className="h-4 w-4 text-ok" aria-hidden="true" /> Tất cả RC đã đủ thông tin nguồn</div>}
        </div>
        <datalist id="dl-src-miss">{sources.map((s) => <option key={s} value={s} />)}</datalist>
      </div>
    </>
  );
}
