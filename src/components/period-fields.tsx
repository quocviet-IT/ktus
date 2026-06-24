"use client";
import { useState } from "react";

// Bộ chọn kỳ (đặt trong 1 <form method=GET>). Server đọc period + (day|week|month|year).
export default function PeriodFields({
  period = "all", day = "", week = "", month = "", year = "",
}: { period?: string; day?: string; week?: string; month?: string; year?: string }) {
  const [mode, setMode] = useState(period);
  const cls = "rounded-md border border-line px-2 py-1.5 text-[13px]";

  return (
    <>
      <select name="period" aria-label="Kỳ lọc" value={mode} onChange={(e) => setMode(e.target.value)} className={cls}>
        <option value="all">Tất cả kỳ</option>
        <option value="day">Theo ngày</option>
        <option value="week">Theo tuần</option>
        <option value="month">Theo tháng</option>
        <option value="year">Theo năm</option>
      </select>
      {mode === "day" && <input type="date" name="day" defaultValue={day} aria-label="Ngày" className={cls} />}
      {mode === "week" && <input type="week" name="week" defaultValue={week} aria-label="Tuần" className={cls} />}
      {mode === "month" && <input type="month" name="month" defaultValue={month} aria-label="Tháng" className={cls} />}
      {mode === "year" && (
        <input type="number" name="year" defaultValue={year} placeholder="2026" min="2020" max="2099"
          aria-label="Năm" className={cls + " w-24"} />
      )}
    </>
  );
}
