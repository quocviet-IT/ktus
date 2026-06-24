import Link from "next/link";
import PageHeader from "@/components/page-header";
import RcRow from "@/components/rc-row";
import { listTransactions } from "@/lib/data";
import { COMPANIES } from "@/lib/store";
import { STATUS_LABEL } from "@/lib/rules";

export default async function SoGiaoDich({ searchParams }: { searchParams: { company?: string; status?: string; q?: string } }) {
  const rows = await listTransactions(searchParams);
  const company = searchParams.company || "all";
  const status = searchParams.status || "all";

  return (
    <>
      <PageHeader crumb="Hằng ngày / Sổ giao dịch" title="Sổ giao dịch RC">
        <Link href="/rc/new" className="bg-brand text-white rounded-lg px-3 py-2 text-[13px] hover:bg-accent">＋ Nhập RC</Link>
      </PageHeader>

      <div className="p-6">
        <form className="flex gap-2 items-center mb-3 flex-wrap" action="/rc">
          <input name="q" defaultValue={searchParams.q} placeholder="Tìm số RC / khách…"
            className="border border-line rounded-lg px-3 py-1.5 text-[13px] min-w-[220px]" />
          <select name="company" aria-label="Công ty" defaultValue={company} className="border border-line rounded-lg px-2 py-1.5 text-[13px]">
            <option value="all">Tất cả công ty</option>
            {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="status" aria-label="Trạng thái" defaultValue={status} className="border border-line rounded-lg px-2 py-1.5 text-[13px]">
            <option value="all">Mọi trạng thái</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="submit" className="border border-line rounded-lg px-3 py-1.5 text-[13px] hover:border-accent">Lọc</button>
          <div className="flex-1" />
          <span className="text-[12px] text-muted">{rows.length} RC</span>
        </form>

        <div className="bg-card border border-line rounded-xl px-3">
          {rows.length ? rows.map((t) => <RcRow key={t.id} t={t} />)
            : <div className="text-center text-muted py-6 text-[13px]">Không có RC khớp điều kiện.</div>}
        </div>
        <p className="text-[12px] text-muted mt-2">
          Hiển thị dạng danh sách dòng (theo ui-ux-skill). Đơn <b>Cancel vẫn hiển thị</b> theo ngày gốc (BR-10).
        </p>
      </div>
    </>
  );
}
