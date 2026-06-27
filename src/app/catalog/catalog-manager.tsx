"use client";

import { useMemo, useState, useTransition } from "react";
import { Edit3, ListFilter, Plus, Save, Search, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";
import { removeCatalogItem, saveCatalogItem, toggleCatalogActive } from "@/app/actions";
import type { CatalogGroup, CatalogItem } from "@/lib/catalog";

type DialogState =
  | { kind: "edit"; item?: CatalogItem }
  | { kind: "delete"; item: CatalogItem }
  | null;

const shell = "p-6";
const panel = "rounded-lg border border-line bg-card";
const th = "px-3 py-2 border-b border-line bg-band text-left font-mono text-[10px] uppercase text-brand whitespace-nowrap";
const td = "px-3 py-2 border-b border-line align-middle text-[13px]";
const input = "w-full rounded-md border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-accent focus:ring-2 focus:ring-accentSoft";
const iconBtn = "inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted hover:border-accent hover:text-brand disabled:opacity-50";

export default function CatalogManager({ groups }: { groups: CatalogGroup[] }) {
  const [activeKey, setActiveKey] = useState(groups[0]?.key ?? "source");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [pending, startTransition] = useTransition();

  const active = groups.find((group) => group.key === activeKey) ?? groups[0];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!active) return [];
    if (!q) return active.items;
    return active.items.filter((item) => `${item.code} ${item.label} ${item.meta?.unit ?? ""} ${item.meta?.conversion ?? ""}`.toLowerCase().includes(q));
  }, [active, query]);
  const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);

  function submitSave(formData: FormData) {
    startTransition(async () => {
      await saveCatalogItem(formData);
      setDialog(null);
    });
  }

  function submitDelete(formData: FormData) {
    startTransition(async () => {
      await removeCatalogItem(formData);
      setDialog(null);
    });
  }

  function submitToggle(item: CatalogItem) {
    const fd = new FormData();
    fd.set("group", item.group);
    fd.set("code", item.code);
    fd.set("active", item.active ? "false" : "true");
    startTransition(async () => { await toggleCatalogActive(fd); });
  }

  if (!active) return null;

  return (
    <div className={shell}>
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Nhóm danh mục" value={groups.length} />
          <Metric label="Giá trị đang dùng" value={totalItems} />
          <Metric label="Nhóm hiện tại" value={active.items.length} />
          <Metric label="Trạng thái" value="Active" />
        </div>
        <button onClick={() => setDialog({ kind: "edit" })} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-4 text-[13px] font-semibold text-white hover:bg-accent">
          <Plus className="h-4 w-4" aria-hidden="true" /> Thêm danh mục
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside className={`${panel} overflow-hidden`}>
          <div className="border-b border-line px-4 py-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-brand">
              <ListFilter className="h-4 w-4" aria-hidden="true" /> Danh sách
            </div>
          </div>
          <div className="divide-y divide-line">
            {groups.map((group) => {
              const selected = group.key === active.key;
              return (
                <button
                  key={group.key}
                  onClick={() => setActiveKey(group.key)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-band ${selected ? "bg-accentSoft" : ""}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-accent" : "bg-line"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{group.title}</span>
                    <span className="block truncate text-[11.5px] text-muted">{group.description}</span>
                  </span>
                  <span className="rounded-md bg-band px-2 py-1 font-mono text-[11px] text-muted">{group.items.length}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={`${panel} overflow-hidden`}>
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="font-serif text-[18px] leading-tight">{active.title}</h2>
              <p className="mt-0.5 text-[12px] text-muted">{active.description}</p>
            </div>
            <div className="flex-1" />
            <label className="relative min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" aria-hidden="true" />
              <span className="sr-only">Tìm kiếm danh mục</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm code hoặc tên" className={`${input} pl-9`} />
            </label>
            <button onClick={() => setDialog({ kind: "edit" })} className="inline-flex h-10 items-center gap-2 rounded-md border border-brand px-3 text-[13px] font-semibold text-brand hover:bg-brand hover:text-white">
              <Plus className="h-4 w-4" aria-hidden="true" /> Thêm
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Tên hiển thị</th>
                  {active.key === "gold_type" && <th className={th}>ĐVT</th>}
                  {active.key === "gold_type" && <th className={th}>Quy đổi</th>}
                  <th className={th}>Sort</th>
                  <th className={th}>Trạng thái</th>
                  <th className={`${th} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={`${item.group}-${item.code}`} className={`hover:bg-band ${item.active ? "" : "opacity-50"}`}>
                    <td className={td}>{item.label}</td>
                    {active.key === "gold_type" && <td className={`${td} font-mono`}>{item.meta?.unit || ""}</td>}
                    {active.key === "gold_type" && <td className={td}>{item.meta?.conversion || ""}</td>}
                    <td className={`${td} font-mono text-muted`}>{item.sort}</td>
                    <td className={td}>
                      <button type="button" onClick={() => submitToggle(item)} disabled={pending}
                        title={item.active ? "Bấm để TẮT (ẩn khỏi form)" : "Bấm để BẬT lại"}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-semibold disabled:opacity-50 ${item.active ? "bg-okSoft text-ok" : "bg-band text-muted"}`}>
                        {item.active
                          ? <><ToggleRight className="h-4 w-4" aria-hidden="true" /> Hoạt động</>
                          : <><ToggleLeft className="h-4 w-4" aria-hidden="true" /> Đã tắt</>}
                      </button>
                    </td>
                    <td className={`${td} text-right`}>
                      <div className="inline-flex gap-2">
                        <button className={iconBtn} onClick={() => setDialog({ kind: "edit", item })} aria-label={`Sửa ${item.label}`}>
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button className={`${iconBtn} hover:border-danger hover:text-danger`} onClick={() => setDialog({ kind: "delete", item })} aria-label={`Xóa ${item.label}`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td className="px-3 py-8 text-center text-[13px] text-muted" colSpan={active.key === "gold_type" ? 6 : 4}>Không có dữ liệu.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {dialog?.kind === "edit" && (
        <EditDialog
          group={active}
          item={dialog.item}
          pending={pending}
          onClose={() => setDialog(null)}
          onSubmit={submitSave}
        />
      )}
      {dialog?.kind === "delete" && (
        <DeleteDialog item={dialog.item} pending={pending} onClose={() => setDialog(null)} onSubmit={submitDelete} />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-line bg-card px-4 py-3">
      <div className="font-mono text-[10px] uppercase text-muted">{label}</div>
      <div className="mt-1 text-[20px] font-semibold text-brand">{value}</div>
    </div>
  );
}

function EditDialog({
  group,
  item,
  pending,
  onClose,
  onSubmit,
}: {
  group: CatalogGroup;
  item?: CatalogItem;
  pending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-[520px] rounded-lg bg-card shadow-xl">
        <div className="flex items-center border-b border-line px-5 py-4">
          <h2 className="font-serif text-[18px]">{item ? "Sửa danh mục" : "Thêm danh mục"}</h2>
          <div className="flex-1" />
          <button className={iconBtn} onClick={onClose} aria-label="Đóng popup">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <form action={onSubmit} className="space-y-4 px-5 py-4">
          <input type="hidden" name="group" value={group.key} />
          {item && <input type="hidden" name="code" value={item.code} />}
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] text-muted">Nhóm</span>
            <input value={group.title} readOnly className={`${input} bg-band`} />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] text-muted">Tên hiển thị *</span>
            <input name="label" required defaultValue={item?.label ?? ""} className={input} autoFocus />
          </label>
          {group.key === "gold_type" && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block font-mono text-[11px] text-muted">ĐVT</span>
                <input name="unit" defaultValue={item?.meta?.unit ?? ""} className={input} />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[11px] text-muted">Quy đổi</span>
                <input name="conversion" defaultValue={item?.meta?.conversion ?? ""} className={input} />
              </label>
            </div>
          )}
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] text-muted">Sort</span>
            <input name="sort" type="number" defaultValue={item?.sort ?? ""} className={input} />
          </label>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-4 py-2 text-[13px] hover:border-accent">Hủy</button>
            <button disabled={pending} className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent disabled:opacity-60">
              <Save className="h-4 w-4" aria-hidden="true" /> Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteDialog({
  item,
  pending,
  onClose,
  onSubmit,
}: {
  item: CatalogItem;
  pending: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-[440px] rounded-lg bg-card shadow-xl">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-serif text-[18px]">Xóa danh mục</h2>
        </div>
        <form action={onSubmit} className="px-5 py-4">
          <input type="hidden" name="group" value={item.group} />
          <input type="hidden" name="code" value={item.code} />
          <p className="text-[13px] text-muted">Mục <b className="text-ink">{item.label}</b> sẽ không còn xuất hiện trong danh sách chọn mới.</p>
          <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
            <button type="button" onClick={onClose} className="rounded-md border border-line px-4 py-2 text-[13px] hover:border-accent">Hủy</button>
            <button disabled={pending} className="inline-flex items-center gap-2 rounded-md bg-danger px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60">
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Xóa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
