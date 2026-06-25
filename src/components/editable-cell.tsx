"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateRcField } from "@/app/actions";
import { TYPE_LABEL } from "@/lib/rules";
import type { LedgerCellKind } from "@/lib/usbc101";

// Ô sửa trực tiếp trên sổ (click → nhập → Enter/blur để lưu, Esc để hủy)
export default function EditableCell({
  id, field, kind, value,
}: { id: string; field: string; kind: LedgerCellKind; value: string | number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState<string>(value == null ? "" : String(value));
  const [busy, setBusy] = useState(false);

  const numeric = kind === "number";
  const display =
    numeric ? (Number(value) ? Number(value).toLocaleString("en-US") : "")
    : kind === "date" ? String(value || "").slice(5)
    : kind === "type" ? (TYPE_LABEL[value as keyof typeof TYPE_LABEL] || String(value || ""))
    : String(value || "");

  async function save() {
    setEditing(false);
    const next = numeric ? String(Number(val) || 0) : val;
    if (next === String(value ?? "")) return;       // không đổi → bỏ qua
    setBusy(true);
    await updateRcField(id, field, numeric ? Number(val) || 0 : val);
    router.refresh();
    setBusy(false);
  }

  const cls = `block w-full px-2.5 py-1.5 ${numeric ? "text-right font-mono" : ""}`;

  if (!editing) {
    return (
      <span
        onClick={() => { setVal(value == null ? "" : String(value)); setEditing(true); }}
        title="Bấm để sửa"
        className={`${cls} cursor-pointer hover:bg-accentSoft ${busy ? "opacity-50" : ""}`}
      >
        {display || <span className="text-line">—</span>}
      </span>
    );
  }

  const common = {
    autoFocus: true,
    value: val,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setVal(e.target.value),
    onBlur: save,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); save(); }
      if (e.key === "Escape") { setVal(String(value ?? "")); setEditing(false); }
    },
    className: `w-full px-2 py-1 border border-accent rounded outline-none bg-white text-[12px] ${numeric ? "text-right font-mono" : ""}`,
    "aria-label": field,
  };

  if (kind === "type") {
    return (
      <select {...common}>
        {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    );
  }
  return <input type={numeric ? "number" : kind === "date" ? "date" : "text"} step={numeric ? "0.01" : undefined} {...common} />;
}
