import PageHeader from "@/components/page-header";
import Pagination from "@/components/pagination";
import { CircleCheck, Send } from "lucide-react";
import { listCatalogGroups, listTransactions } from "@/lib/data";
import { isMissingSource } from "@/lib/rules";
import { ddmmyyyy } from "@/lib/format";
import { sendToUS } from "@/app/actions";
import SourceForm from "./source-form";

const PAGE_SIZE = 50;

// Thống kê các RC thiếu thông tin nguồn KH — dạng bảng giống sheet HPUS-KT210
export default async function MissingSource({ searchParams }: { searchParams: { page?: string } }) {
  const all = (await listTransactions()).filter(isMissingSource);
  const catalogGroups = await listCatalogGroups();
  const sources = catalogGroups.find((group) => group.key === "source")?.items.map((item) => item.label) ?? [];

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const rows = all.slice(start, start + PAGE_SIZE);

  const th = "px-2.5 py-2 border border-line bg-band font-mono text-[10px] uppercase text-brand text-left whitespace-nowrap";
  const td = "px-2.5 py-1.5 border border-line align-top";

  return (
    <>
      <PageHeader crumb="Báo cáo / RC thiếu nguồn" title="Thống kê các RC thiếu thông tin nguồn KH 2026" />
      <div className="p-6">
        <div className="mb-3 text-[12px] text-muted">{total} đơn thiếu nguồn · điền <b>Source 1</b> rồi bấm Cập nhật → đơn rời danh sách. "Gửi US" là mô phỏng (chưa kết nối hệ thống US).</div>

        {rows.length ? (
          <div className="overflow-x-auto rounded-md border border-line bg-card">
            <table className="min-w-[1180px] w-full border-collapse text-[12.5px]">
              <thead><tr>
                <th className={th}>NO</th>
                <th className={th}>DATE</th>
                <th className={th}>COMPANY</th>
                <th className={th}>JM US RECEIPT N#</th>
                <th className={th}>DECRIPTION</th>
                <th className={th}>CUSTOMER</th>
                <th className={th}>CONTACT</th>
                <th className={th}>CẬP NHẬT NGUỒN (Source 1 * / Source 2)</th>
                <th className={`${th} text-center`}>GỬI US</th>
              </tr></thead>
              <tbody>
                {rows.map((t, i) => {
                  const sent = (t.note || "").includes("Đã gửi US");
                  return (
                    <tr key={t.id} className="even:bg-band hover:bg-accentSoft">
                      <td className={td + " text-right font-mono text-muted"}>{start + i + 1}</td>
                      <td className={td + " whitespace-nowrap"}>{ddmmyyyy(t.ngay)}</td>
                      <td className={td}><span className="badge bg-[#eceee9] text-[#445]">{t.company}</span></td>
                      <td className={td + " font-mono text-brand whitespace-nowrap"}>{t.rcJmNo || "—"}</td>
                      <td className={td + " max-w-[280px] whitespace-normal break-words"}>{t.dienGiai}</td>
                      <td className={td + " whitespace-nowrap"}>{t.khach}</td>
                      <td className={td + " whitespace-nowrap"}>{t.contact || "—"}</td>
                      <td className={td}>
                        <SourceForm id={t.id} source1={t.source1 || ""} source2={t.source2 || ""} />
                      </td>
                      <td className={td + " text-center whitespace-nowrap"}>
                        <form action={sendToUS.bind(null, t.id)}>
                          <button type="submit" title="Mô phỏng — chưa kết nối hệ thống US thật"
                            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[12px] ${sent ? "border-[#caa24b] text-[#8a6512] bg-[#FBEFD6]" : "border-line hover:border-accent"}`}>
                            <Send className="h-3.5 w-3.5" aria-hidden="true" /> {sent ? "Đã gửi" : "Gửi US"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 rounded-md border border-line bg-card text-center text-muted py-8 text-[13px]">
            <CircleCheck className="h-4 w-4 text-ok" aria-hidden="true" /> Tất cả RC đã đủ thông tin nguồn
          </div>
        )}

        <Pagination basePath="/missing-source" sp={searchParams as Record<string, string | undefined>} page={page} totalPages={totalPages} total={total} />
        <datalist id="dl-src-miss">{sources.map((s) => <option key={s} value={s} />)}</datalist>
      </div>
    </>
  );
}
