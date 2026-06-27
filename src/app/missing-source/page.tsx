import Link from "next/link";
import { CircleCheck, Filter, RotateCcw, Send } from "lucide-react";
import PageHeader from "@/components/page-header";
import Pagination from "@/components/pagination";
import PeriodFields from "@/components/period-fields";
import { listCatalogGroups, listMissingSourcePaged } from "@/lib/data";
import { ddmmyyyy } from "@/lib/format";
import { periodLabel, periodRange } from "@/lib/period";
import { PAGE_SIZE_OPTIONS, normalizePage, normalizePageSize, normalizeSortDir } from "@/lib/list-controls";
import { sendToUS } from "@/app/actions";
import SourceForm from "./source-form";

export const dynamic = "force-dynamic";

type SP = {
  company?: string;
  q?: string;
  sort?: string;
  period?: string;
  day?: string;
  week?: string;
  month?: string;
  year?: string;
  page?: string;
  pageSize?: string;
};

export default async function MissingSource({ searchParams }: { searchParams: SP }) {
  const catalogGroups = await listCatalogGroups();
  const sources = catalogGroups.find((group) => group.key === "source")?.items.map((item) => item.label) ?? [];
  const page = normalizePage(searchParams.page);
  const pageSize = normalizePageSize(searchParams.pageSize);
  const sort = normalizeSortDir(searchParams.sort);
  const company = searchParams.company || "all";
  const range = periodRange(searchParams);
  const { rows, total } = await listMissingSourcePaged(
    { company, q: searchParams.q, from: range.from, to: range.to, sort },
    page,
    pageSize,
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageFrom = total ? start + 1 : 0;
  const pageTo = Math.min(total, start + rows.length);

  const th = "sticky top-0 z-20 border border-line bg-band px-2.5 py-2 text-left font-mono text-[10px] font-semibold uppercase text-brand whitespace-nowrap";
  const td = "border border-line px-2.5 py-1.5 align-top text-[12.5px]";
  const control = "h-9 rounded-md border border-line bg-card px-2.5 text-[12px] text-ink outline-none hover:border-accent focus:border-brand focus:ring-1 focus:ring-brand";

  return (
    <>
      <PageHeader crumb="Bao cao / RC thieu nguon" title="Thong ke RC thieu thong tin nguon KH 2026" />
      <div className="p-4 lg:p-6">
        <form action="/missing-source" className="mb-3 flex flex-wrap items-center gap-2 gap-y-3 rounded-lg border border-line bg-card px-3 py-3">
          <input name="q" defaultValue={searchParams.q} placeholder="Tim RC#, khach, dien giai..." className={`${control} min-w-[240px] flex-1`} />
          <select name="company" defaultValue={company} className={control}>
            {["all", "PC49", "Trans", "TDW", "HPLLC", "3NVY", "Other"].map((c) => <option key={c} value={c}>{c === "all" ? "Tat ca cong ty" : c}</option>)}
          </select>
          <select name="sort" defaultValue={sort} className={control}>
            <option value="newest">Ngay moi nhat</option>
            <option value="oldest">Ngay cu nhat</option>
          </select>
          <PeriodFields period={searchParams.period} day={searchParams.day} week={searchParams.week} month={searchParams.month} year={searchParams.year} />
          <label className="flex items-center gap-1.5 text-[12px] text-muted">
            Dong/trang
            <select name="pageSize" defaultValue={String(pageSize)} className={control}>
              {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-[12px] font-medium text-white hover:bg-accent">
            <Filter className="h-3.5 w-3.5" /> Loc
          </button>
          <Link href="/missing-source" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-[12px] hover:border-accent">
            <RotateCcw className="h-3.5 w-3.5" /> Xoa loc
          </Link>
          <span className="ml-auto text-[12px] text-muted">{periodLabel(searchParams)} - {pageFrom}-{pageTo}/{total} don</span>
        </form>

        <div className="mb-3 text-[12px] text-muted">
          {total} don thieu nguon - dien <b>Source 1</b> roi bam Cap nhat de don roi danh sach. Nut Gui US hien la mo phong.
        </div>

        {rows.length ? (
          <div className="overflow-x-auto rounded-md border border-line bg-card">
            <table className="min-w-[1180px] w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className={th}>NO</th>
                  <th className={th}>DATE</th>
                  <th className={th}>COMPANY</th>
                  <th className={th}>JM US RECEIPT N#</th>
                  <th className={th}>DESCRIPTION</th>
                  <th className={th}>CUSTOMER</th>
                  <th className={th}>CONTACT</th>
                  <th className={th}>CAP NHAT NGUON</th>
                  <th className={`${th} text-center`}>GUI US</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t, i) => {
                  const sent = (t.note || "").includes("Đã gửi US") || (t.note || "").includes("Da gui US");
                  return (
                    <tr key={t.id} className="even:bg-band hover:bg-accentSoft">
                      <td className={`${td} text-right font-mono text-muted`}>{start + i + 1}</td>
                      <td className={`${td} whitespace-nowrap`}>{ddmmyyyy(t.ngay)}</td>
                      <td className={td}><span className="badge bg-[#eceee9] text-[#445]">{t.company}</span></td>
                      <td className={`${td} whitespace-nowrap font-mono text-brand`}>{t.rcJmNo || "-"}</td>
                      <td className={`${td} max-w-[280px] whitespace-normal break-words`}>{t.dienGiai}</td>
                      <td className={`${td} whitespace-nowrap`}>{t.khach}</td>
                      <td className={`${td} whitespace-nowrap`}>{t.contact || "-"}</td>
                      <td className={td}>
                        <SourceForm id={t.id} source1={t.source1 || ""} source2={t.source2 || ""} />
                      </td>
                      <td className={`${td} text-center whitespace-nowrap`}>
                        <form action={sendToUS.bind(null, t.id)}>
                          <button type="submit" title="Mo phong - chua ket noi he thong US that"
                            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[12px] ${sent ? "border-[#caa24b] bg-[#FBEFD6] text-[#8a6512]" : "border-line hover:border-accent"}`}>
                            <Send className="h-3.5 w-3.5" aria-hidden="true" /> {sent ? "Da gui" : "Gui US"}
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
          <div className="flex items-center justify-center gap-1.5 rounded-md border border-line bg-card py-8 text-center text-[13px] text-muted">
            <CircleCheck className="h-4 w-4 text-ok" aria-hidden="true" /> Tat ca RC da du thong tin nguon
          </div>
        )}

        <Pagination basePath="/missing-source" sp={{ ...(searchParams as Record<string, string | undefined>), pageSize: String(pageSize), sort }} page={page} totalPages={totalPages} total={total} />
        <datalist id="dl-src-miss">{sources.map((s) => <option key={s} value={s} />)}</datalist>
      </div>
    </>
  );
}
