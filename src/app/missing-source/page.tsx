import PageHeader from "@/components/page-header";
import { listTransactions } from "@/lib/data";
import { isMissingSource } from "@/lib/rules";
import { money, ddmm } from "@/lib/format";
import { sendToUS, resolveSource } from "@/app/actions";

export default async function MissingSource() {
  const rows = (await listTransactions()).filter(isMissingSource);

  return (
    <>
      <PageHeader crumb="Báo cáo / RC thiếu nguồn" title="Thống kê RC thiếu thông tin nguồn" />
      <div className="p-6">
        <div className="bg-accentSoft rounded-lg px-3.5 py-2.5 text-[12.5px] text-[#6c5320] mb-3.5">
          Vòng xử lý: <b>Gửi US → US bổ sung → KT cập nhật JM</b>. Khi có Source, RC tự rời danh sách (BR-03).
        </div>
        <div className="bg-card border border-line rounded-xl px-3">
          {rows.length ? rows.map((t) => {
            const sent = (t.note || "").includes("Đã gửi US");
            return (
              <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-line text-[13px]">
                <span className="font-mono text-muted min-w-[52px]">{ddmm(t.ngay)}</span>
                <span className="font-mono text-brand min-w-[100px]">{t.rcJmNo || "—"}</span>
                <span className="flex-1 truncate">{t.dienGiai} <span className="text-muted">· {t.khach}</span></span>
                <span className="font-mono min-w-[80px] text-right">{money(t.type === "deposit" ? 0 : 0) || ""}</span>
                <span className="badge bg-dangerSoft text-danger">{sent ? "Chờ US bổ sung" : "Thiếu nguồn"}</span>
                {!sent ? (
                  <form action={sendToUS.bind(null, t.id)}>
                    <button type="submit" className="border border-line rounded-lg px-3 py-1 text-[12px] hover:border-accent">Gửi US →</button>
                  </form>
                ) : (
                  <form action={async (fd: FormData) => { "use server"; await resolveSource(t.id, String(fd.get("src") || "WI")); }} className="flex gap-1 items-center">
                    <select name="src" aria-label="Chọn nguồn" className="border border-line rounded-lg px-2 py-1 text-[12px]">
                      <option>WI</option><option>TEL</option><option>FB</option><option>IG-APPT</option><option>RC</option>
                    </select>
                    <button type="submit" className="bg-brand text-white rounded-lg px-3 py-1 text-[12px] hover:bg-accent">Cập nhật JM ✓</button>
                  </form>
                )}
              </div>
            );
          }) : <div className="text-center text-muted py-6 text-[13px]">Tất cả RC đã đủ thông tin nguồn 🎉</div>}
        </div>
      </div>
    </>
  );
}
