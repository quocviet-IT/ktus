import PageHeader from "@/components/page-header";
import { Plus } from "lucide-react";
import { SOURCES, SALES, SALES_ONLINE, BELL_CODES, COMPANIES } from "@/lib/store";
import { listPaymentMethods } from "@/lib/data";
import { createPaymentMethod } from "@/app/actions";

function Group({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-card border border-line rounded-xl p-4">
      <div className="flex items-center mb-2">
        <h2 className="font-serif text-[15px] m-0">{title}</h2>
        <div className="flex-1" />
        <button className="inline-flex items-center gap-1.5 border border-line rounded-lg px-2.5 py-1 text-[12px] hover:border-accent">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Thêm
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => <span key={i} className="font-mono text-[11.5px] bg-band border border-line rounded-full px-2.5 py-1">{i}</span>)}
      </div>
    </div>
  );
}

function EditablePaymentGroup({ items }: { items: { code: string; label: string }[] }) {
  return (
    <div className="bg-card border border-line rounded-xl p-4">
      <div className="flex items-center mb-2">
        <h2 className="font-serif text-[15px] m-0">Hình thức thanh toán</h2>
      </div>
      <form action={createPaymentMethod} className="flex gap-2 mb-3">
        <label className="sr-only" htmlFor="payment-method-label">Tên hình thức thanh toán</label>
        <input id="payment-method-label" name="label" placeholder="Venmo / ACH / ..." className="min-w-0 flex-1 rounded-md border border-line px-2.5 py-1.5 text-[13px] bg-white" />
        <button className="inline-flex items-center gap-1.5 border border-line rounded-lg px-2.5 py-1 text-[12px] hover:border-accent">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Thêm
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => <span key={i.code} className="font-mono text-[11.5px] bg-band border border-line rounded-full px-2.5 py-1">{i.label}</span>)}
      </div>
    </div>
  );
}

const GOLD = [
  ["Grain", "Grain", "Gram", "—"],
  ["9999", "9999", "Lượng", "1 lượng = 37.5 gr"],
  ["Rong Phung", "RP", "Lượng", "1 lượng RP = 37.5 gr Grain"],
  ["Maple Leaf", "ML", "Oz", "1 oz ML = 31.105 gr Grain"],
  ["Credit Suisse", "CS", "Oz", "1 oz CS = 31.105 gr Grain"],
];

export default async function Catalog() {
  const paymentMethods = await listPaymentMethods();
  return (
    <>
      <PageHeader crumb="Kho & danh mục / Danh mục" title="Danh mục dùng chung (Validation List)" />
      <div className="p-6">
        <div className="bg-accentSoft rounded-lg px-3.5 py-2.5 text-[12.5px] text-[#6c5320] mb-3.5">
          Nơi quản lý các danh sách chọn (dropdown) dùng chung — nền tảng database. Tất cả do người dùng tự thêm/sửa.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Group title="Loại giao dịch (Type)" items={["Receipt", "Deposit", "Pick up", "Extra deposit", "PO", "Return", "Exchange", "Transfer", "Repair"]} />
          <Group title="Nguồn khách (Source)" items={SOURCES} />
          <Group title="Sales US (tại quầy)" items={SALES} />
          <Group title="Sale Online (Team VN)" items={SALES_ONLINE} />
          <EditablePaymentGroup items={paymentMethods} />
          <Group title="Mã rung chuông" items={BELL_CODES} />
          <Group title="Công ty" items={[...COMPANIES]} />
        </div>

        <div className="bg-card border border-line rounded-xl p-4 mt-3.5">
          <div className="flex items-center mb-2">
            <h2 className="font-serif text-[15px] m-0">Loại vàng &amp; quy đổi</h2>
            <div className="flex-1" />
            <button className="inline-flex items-center gap-1.5 border border-line rounded-lg px-2.5 py-1 text-[12px] hover:border-accent">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Thêm
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="border-collapse text-[12.5px] min-w-[520px]">
              <thead><tr>
                {["Loại vàng", "Kí hiệu", "ĐVT", "Quy đổi sang Grain"].map((h) => (
                  <th key={h} className="px-2.5 py-2 border border-line bg-band font-mono text-[10px] uppercase text-brand text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {GOLD.map((r) => (
                  <tr key={r[0]} className="even:bg-band">
                    {r.map((c, i) => <td key={i} className="px-2.5 py-1.5 border border-line">{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
