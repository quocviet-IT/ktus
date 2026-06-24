// Lọc theo kỳ: ngày / tuần / tháng / năm → trả khoảng [from, to] (YYYY-MM-DD, bao gồm 2 đầu)
export type PeriodMode = "all" | "day" | "week" | "month" | "year";

export interface PeriodParams {
  period?: string;
  day?: string;    // YYYY-MM-DD
  week?: string;   // YYYY-Www  (input type=week)
  month?: string;  // YYYY-MM
  year?: string;   // YYYY
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

// Khoảng của ISO week ("2026-W26") → {from: thứ 2, to: chủ nhật}
export function isoWeekRange(w: string): { from: string; to: string } | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(w || "");
  if (!m) return null;
  const year = +m[1], week = +m[2];
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = (jan4.getUTCDay() + 6) % 7; // Mon=0
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - dow);
  const start = new Date(week1Mon);
  start.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { from: iso(start), to: iso(end) };
}

export function lastDayOfMonth(year: number, month1: number): string {
  const d = new Date(Date.UTC(year, month1, 0)); // month1 = 1..12 → ngày 0 của tháng sau
  return iso(d);
}

// Trả {from, to} hoặc {} nếu không lọc
export function periodRange(sp: PeriodParams): { from?: string; to?: string } {
  switch (sp.period) {
    case "day":
      return sp.day ? { from: sp.day, to: sp.day } : {};
    case "week":
      return sp.week ? (isoWeekRange(sp.week) ?? {}) : {};
    case "month":
      if (!sp.month) return {};
      const [y, mm] = sp.month.split("-").map(Number);
      return { from: `${sp.month}-01`, to: lastDayOfMonth(y, mm) };
    case "year":
      return sp.year ? { from: `${sp.year}-01-01`, to: `${sp.year}-12-31` } : {};
    default:
      return {};
  }
}

export function periodLabel(sp: PeriodParams): string {
  switch (sp.period) {
    case "day": return sp.day ? `Ngày ${sp.day.split("-").reverse().join("/")}` : "Theo ngày";
    case "week": return sp.week ? `Tuần ${sp.week.replace("-W", " / ")}` : "Theo tuần";
    case "month": return sp.month ? `Tháng ${sp.month.split("-").reverse().join("/")}` : "Theo tháng";
    case "year": return sp.year ? `Năm ${sp.year}` : "Theo năm";
    default: return "Tất cả kỳ";
  }
}

// Giữ lại query khi tạo link (phân trang) — bỏ 'page'
export function buildQuery(sp: Record<string, string | undefined>, extra: Record<string, string | number>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v && k !== "page") q.set(k, String(v));
  for (const [k, v] of Object.entries(extra)) q.set(k, String(v));
  return q.toString();
}
