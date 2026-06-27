export type CancelMode = "cancel" | "void";

const CANCEL_LINE_RE = /\n?\[(?:CANCEL|VOID) \d{4}-\d{2}-\d{2}\].*$/s;

export function buildCancelNote(input: {
  existingNote?: string;
  orderDate: string;
  cancelDate: string;
  reason: string;
  mode: CancelMode;
}): string {
  const base = (input.existingNote || "").replace(CANCEL_LINE_RE, "").trim();
  const label = input.mode === "void" ? "VOID" : "CANCEL";
  const reason = input.reason.trim();
  const cancelLine = `[${label} ${input.cancelDate}] ${reason} (order date: ${input.orderDate})`;
  return [base, cancelLine].filter(Boolean).join("\n");
}

export function isCancelDateValid(orderDate: string, cancelDate: string): boolean {
  if (!orderDate || !cancelDate) return false;
  return cancelDate >= orderDate;
}

export function transactionMatchesOrderOrCancelDate(
  tx: { ngay: string; trangThai?: string; canceledAt?: string },
  from?: string,
  to?: string,
): boolean {
  const inRange = (date?: string) => {
    if (!date) return false;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  };
  return inRange(tx.ngay) || (tx.trangThai === "cancel" && inRange(tx.canceledAt));
}
