import Link from "next/link";
import type { Transaction } from "@/lib/types";
import { computeCondition, isMissingSource, isBell, TYPE_LABEL } from "@/lib/rules";
import { money } from "@/lib/format";
import StatusBadge from "./status-badge";

export default function RcRow({ t }: { t: Transaction }) {
  const c = computeCondition(t);
  const amt = t.type === "po" ? c.returnPo : c.receipt || c.deposit;
  const meta = [TYPE_LABEL[t.type], t.khach];
  if (t.source1) meta.push("· " + t.source1);
  if (t.sale1) meta.push("· " + t.sale1);

  return (
    <Link href={`/rc/${t.id}`} className="rcrow block">
      <div className="flex items-center gap-4">
        <div className="font-mono font-semibold text-brand min-w-[104px] text-[12.5px]">{t.rcJmNo || "—"}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] truncate flex items-center gap-2">
            <span className="badge bg-[#eceee9] text-[#445]">{t.company}</span>
            {t.dienGiai}
            {isBell(t) && <span className="text-accent">🔔{t.bellCode ? " " + t.bellCode : ""}</span>}
          </div>
          <div className="text-[11.5px] text-muted mt-0.5">
            {meta.join(" ")}
            {t.oldReceiptNo && <span className="text-brand"> · 🔗 cọc {t.oldReceiptNo}</span>}
          </div>
        </div>
        <div className="text-right font-mono whitespace-nowrap">
          <div className={`font-bold text-[13.5px] ${t.type === "po" ? "text-danger" : ""}`}>
            {t.type === "po" ? "-" : ""}{money(amt)}
          </div>
        </div>
        <div className="min-w-[96px] text-right">
          {isMissingSource(t) ? <span className="badge bg-dangerSoft text-danger">Thiếu nguồn</span> : <StatusBadge s={t.trangThai} />}
        </div>
      </div>
    </Link>
  );
}
