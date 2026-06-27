"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import { resolveSourceDetail } from "@/app/actions";

const inp = "border border-line rounded-md px-2 py-1 text-[12px] bg-white";

export default function SourceForm({ id, source1, source2 }: { id: string; source1: string; source2: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    start(async () => {
      const r = await resolveSourceDetail(id, fd);
      if (r.ok) { setMsg({ ok: true, text: "Đã cập nhật ✓" }); router.refresh(); }
      else setMsg({ ok: false, text: r.error || "Lỗi" });
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-1.5 flex-wrap">
      <input name="source1" list="dl-src-miss" defaultValue={source1} placeholder="Source 1 *" autoComplete="off" aria-label="Source 1" className={inp + " min-w-[110px]"} />
      <input name="source2" list="dl-src-miss" defaultValue={source2} placeholder="Source 2" autoComplete="off" aria-label="Source 2" className={inp + " min-w-[100px]"} />
      <button type="submit" disabled={pending} className="inline-flex items-center gap-1 bg-brand text-white rounded-md px-2.5 py-1 text-[12px] hover:bg-accent disabled:opacity-60 whitespace-nowrap">
        <Check className="h-3.5 w-3.5" aria-hidden="true" /> {pending ? "Đang lưu…" : "Cập nhật"}
      </button>
      {msg && (
        <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${msg.ok ? "text-ok" : "text-danger"}`}>
          {!msg.ok && <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}{msg.text}
        </span>
      )}
    </form>
  );
}
