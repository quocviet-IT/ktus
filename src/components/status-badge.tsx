import { STATUS_LABEL, statusClass } from "@/lib/rules";
import type { TxStatus } from "@/lib/types";

export default function StatusBadge({ s }: { s: TxStatus }) {
  return <span className={`badge ${statusClass(s)}`}>{STATUS_LABEL[s]}</span>;
}
