import PageHeader from "@/components/page-header";
import { INVENTORY, different } from "@/lib/inventory";
import { money, num } from "@/lib/format";

// Tồn kho PC49 — đối chiếu KT ↔ US (② PC49 DASHBOARD)
export default function Inventory() {
  const lech = INVENTORY.filter((g) => different(g) !== 0).length;
  const th = "px-2.5 py-2 border border-line bg-band font-mono text-[10px] uppercase text-brand text-left whitespace-nowrap align-bottom";
  const td = "px-2.5 py-1.5 border border-line";

  return (
    <>
      <PageHeader crumb="Kho & danh mục / Tồn kho" title="Tồn kho vàng — đối chiếu KT ↔ US" />
      <div className="p-6">
        <div className="bg-card border border-line rounded-xl p-4">
          <div className="bg-accentSoft rounded-lg px-3 py-2 text-[12px] text-[#6c5320] mb-3">
            ⚙️ Cột <span className="italic text-accent">ƒ</span> Beginning/Book/Different tự tính. <span className="text-brand">✎</span> Available (US) &amp; Unit Price nhập tay để đối chiếu.
            {lech > 0 && <b className="text-danger"> · Đang lệch {lech} loại.</b>}
          </div>
          <div className="overflow-x-auto">
            <table className="border-collapse text-[12.5px] min-w-[860px]">
              <thead><tr>
                <th className={th}>Description</th><th className={th}>Unit</th><th className={th}>Beginning ƒ</th>
                <th className={th}>Sale ƒ</th><th className={th}>Deposit ƒ</th><th className={th}>PO ƒ</th>
                <th className={th}>Book Inv. (KT) ƒ</th><th className={th}>Available (US) ✎</th><th className={th}>Unit Price ✎</th>
                <th className={th}>Different ƒ</th><th className={th}>Trạng thái</th>
              </tr></thead>
              <tbody>
                {INVENTORY.map((g) => {
                  const d = different(g);
                  return (
                    <tr key={g.loai} className="even:bg-band hover:bg-accentSoft">
                      <td className={td + " font-semibold"}>{g.loai}</td>
                      <td className={td}>{g.dvt}</td>
                      <td className={td + " text-right font-mono"}>{num(g.beginning)}</td>
                      <td className={td + " text-right font-mono"}>{num(g.sale)}</td>
                      <td className={td + " text-right font-mono"}>{num(g.deposit)}</td>
                      <td className={td + " text-right font-mono"}>{num(g.po)}</td>
                      <td className={td + " text-right font-mono"}>{num(g.bookKT)}</td>
                      <td className={td + " text-right font-mono"}>{num(g.availUS)}</td>
                      <td className={td + " text-right font-mono"}>{money(g.unitPrice)}</td>
                      <td className={td + ` text-right font-mono font-bold ${d !== 0 ? "text-danger" : ""}`}>{d > 0 ? "+" : ""}{d}</td>
                      <td className={td}>{d === 0 ? <span className="badge bg-okSoft text-ok">Khớp</span> : <span className="badge bg-dangerSoft text-danger">Lệch</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-muted mt-2">Different = Book Inventory (KT) − Available (US). Lấy tồn tiền PC49 từ USBC101 (BALANCE ACCOUNT) — giai đoạn sau.</p>
        </div>
      </div>
    </>
  );
}
