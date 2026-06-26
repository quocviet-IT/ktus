import PageHeader from "@/components/page-header";
import { Layers } from "lucide-react";
import { listDeals } from "@/lib/data";
import { money, ddmmyyyy } from "@/lib/format";

const STATUS_VI: Record<string, string> = {
  open: "Đang mở", collecting: "Đang thu", ready: "Sẵn sàng",
  completed: "Hoàn tất", cancelled: "Đã huỷ", returned: "Trả hàng",
};

// Deals — gom các đơn nhiều bước (cọc → … → pickup)
export default async function DealsPage() {
  const deals = await listDeals();
  const th = "px-2.5 py-2 border border-line bg-band font-mono text-[10px] uppercase text-brand text-left whitespace-nowrap";
  const td = "px-2.5 py-1.5 border border-line";

  return (
    <>
      <PageHeader crumb="Deals / Danh sách" title="Quản lý Deal" />
      <div className="p-6">
        <div className="bg-card border border-line rounded-xl p-4">
          <div className="text-[12px] text-muted mb-3 inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" /> {deals.length} deal · gom giao dịch nhiều bước, theo dõi đã thu / còn lại
          </div>
          <div className="overflow-x-auto">
            <table className="border-collapse text-[12.5px] min-w-[680px]">
              <thead><tr>
                <th className={th}>Ngày mở</th><th className={th}>Công ty</th><th className={th}>Khách hàng</th>
                <th className={th}>Giá trị đơn</th><th className={th}>Trạng thái</th>
              </tr></thead>
              <tbody>
                {deals.length ? deals.map((d) => (
                  <tr key={d.id} className="even:bg-band hover:bg-accentSoft">
                    <td className={td}>{d.openedDate ? ddmmyyyy(d.openedDate) : "—"}</td>
                    <td className={td}><span className="badge bg-[#eceee9] text-[#445]">{d.company || "—"}</span></td>
                    <td className={td}>{d.khach || "—"}</td>
                    <td className={td + " text-right font-mono"}>{d.dealValue ? money(d.dealValue) : "—"}</td>
                    <td className={td}>{STATUS_VI[d.status] || d.status || "—"}</td>
                  </tr>
                )) : <tr><td colSpan={5} className={td + " text-center text-muted py-6"}>Chưa có deal. (Bật USE_RC_READS + nhập đơn cọc để tạo deal.)</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
