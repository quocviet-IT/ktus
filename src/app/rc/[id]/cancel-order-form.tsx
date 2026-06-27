"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Ban, X } from "lucide-react";
import { cancelOrder } from "@/app/actions";

export default function CancelOrderForm({ id, defaultDate, orderDate }: { id: string; defaultDate: string; orderDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError("");
    start(async () => {
      const result = await cancelOrder(id, fd);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error || "Lỗi không xác định");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-[12px] font-medium text-danger hover:border-danger hover:bg-dangerSoft"
      >
        <Ban className="h-3.5 w-3.5" aria-hidden="true" />
        Cancel đơn
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4">
          <form onSubmit={onSubmit} className="w-full max-w-[480px] rounded-lg border border-line bg-card p-4 shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              <div className="font-serif text-lg">Hủy / Cancel đơn</div>
              <div className="flex-1" />
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="grid h-8 w-8 place-items-center rounded-md hover:bg-band">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-1 text-[12px] text-muted">
                Ngày hủy
                <input name="cancelDate" type="date" min={orderDate} defaultValue={defaultDate < orderDate ? orderDate : defaultDate} className="h-9 rounded-md border border-line px-2 text-[13px] text-ink" />
              </label>
              <label className="grid gap-1 text-[12px] text-muted">
                Hình thức
                <select name="mode" defaultValue="cancel" className="h-9 rounded-md border border-line px-2 text-[13px] text-ink">
                  <option value="cancel">Cancel không hủy dữ liệu</option>
                  <option value="void">Hủy đơn</option>
                </select>
              </label>
              <label className="grid gap-1 text-[12px] text-muted">
                Lý do
                <textarea name="reason" rows={3} required className="rounded-md border border-line px-2 py-1.5 text-[13px] text-ink" placeholder="Ví dụ: khách hủy ngày 26/06, hoàn cọc..." />
              </label>
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-1.5 rounded-md bg-dangerSoft px-2 py-1.5 text-[12px] text-danger">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {error}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-md border border-line px-3 text-[12px] hover:border-accent">
                Đóng
              </button>
              <button type="submit" disabled={pending} className="h-9 rounded-md bg-danger px-3 text-[12px] font-medium text-white disabled:opacity-60">
                {pending ? "Đang lưu..." : "Lưu trạng thái hủy"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
