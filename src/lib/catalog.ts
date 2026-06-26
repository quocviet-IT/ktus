export type CatalogGroupKey =
  | "transaction_type"
  | "source"
  | "sales_counter"
  | "sales_online"
  | "payment"
  | "bell_code"
  | "company"
  | "gold_type";

export interface CatalogItem {
  group: CatalogGroupKey;
  code: string;
  label: string;
  sort: number;
  active: boolean;
  meta?: Record<string, string>;
}

export interface CatalogGroup {
  key: CatalogGroupKey;
  title: string;
  description: string;
  items: CatalogItem[];
}

export const CATALOG_GROUPS: Omit<CatalogGroup, "items">[] = [
  { key: "transaction_type", title: "Loai giao dich", description: "Type tren so RC va bao cao" },
  { key: "source", title: "Nguon khach", description: "Nguon khach dung cho nhap RC va thieu nguon" },
  { key: "sales_counter", title: "Sales US", description: "Nhan vien tai quay" },
  { key: "sales_online", title: "Sale Online", description: "Team online ho tro don" },
  { key: "payment", title: "Hinh thuc thanh toan", description: "Thu/chi tien A/R va A/P" },
  { key: "bell_code", title: "Ma rung chuong", description: "Ma ghi nhan rung chuong" },
  { key: "company", title: "Cong ty", description: "Cong ty/sheet USBC101" },
  { key: "gold_type", title: "Loai vang & quy doi", description: "Don vi va quy doi Grain" },
];

export const DEFAULT_CATALOG_ITEMS: CatalogItem[] = [
  ...[
    ["receipt", "Receipt"],
    ["deposit", "Deposit"],
    ["pick_up", "Pick up"],
    ["extra_deposit", "Extra Deposit"],
    ["po", "PO"],
    ["return", "Return"],
    ["exchange", "Exchange"],
    ["transfer", "Transfer"],
    ["cancel", "Cancel"],
    ["memo", "Memo"],
    ["cash_report", "Cash report"],
    ["ra_rp", "Ra RP"],
  ].map(([code, label], index): CatalogItem => ({ group: "transaction_type", code, label, sort: (index + 1) * 10, active: true })),
  { group: "transaction_type", code: "repair", label: "Repair", sort: 990, active: false },
  ...["WI", "TEL", "FB", "IG-APPT", "RF-APPT", "RC", "VIP"].map((label, index): CatalogItem => ({
    group: "source", code: normalizeCatalogCode(label), label, sort: (index + 1) * 10, active: true,
  })),
  ...["T.Van", "B.Khanh", "S.Mai", "N.Y", "T.Quynh"].map((label, index): CatalogItem => ({
    group: "sales_counter", code: normalizeCatalogCode(label), label, sort: (index + 1) * 10, active: true,
  })),
  ...["Van Vuong US", "Manh Thang US", "Tra My US", "Kim Thanh US"].map((label, index): CatalogItem => ({
    group: "sales_online", code: normalizeCatalogCode(label), label, sort: (index + 1) * 10, active: true,
  })),
  ...[
    ["cash", "Cash"],
    ["bank_wire", "Bank wire"],
    ["zelle", "Zelle"],
    ["check", "Check"],
    ["card", "Card"],
  ].map(([code, label], index): CatalogItem => ({ group: "payment", code, label, sort: (index + 1) * 10, active: true })),
  ...["RC1", "RC2", "RC3", "SBO1"].map((label, index): CatalogItem => ({
    group: "bell_code", code: normalizeCatalogCode(label), label, sort: (index + 1) * 10, active: true,
  })),
  ...["PC49", "Trans", "HPLLC", "3NVY", "Other", "TDW"].map((label, index): CatalogItem => ({
    group: "company", code: normalizeCatalogCode(label), label, sort: (index + 1) * 10, active: true,
  })),
  ...[
    ["grain", "Grain", "Grain", "-"],
    ["9999", "9999", "Luong", "1 luong = 37.5 gr"],
    ["rong_phung", "Rong Phung", "Luong", "1 luong RP = 37.5 gr Grain"],
    ["maple_leaf", "Maple Leaf", "Oz", "1 oz ML = 31.105 gr Grain"],
    ["credit_suisse", "Credit Suisse", "Oz", "1 oz CS = 31.105 gr Grain"],
  ].map(([code, label, unit, conversion], index): CatalogItem => ({
    group: "gold_type",
    code,
    label,
    sort: (index + 1) * 10,
    active: true,
    meta: { unit, conversion },
  })),
];

export function normalizeCatalogCode(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function visibleCatalogItems(items: CatalogItem[]): CatalogItem[] {
  return [...items]
    .filter((item) => item.active !== false)
    .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label));
}

export function upsertCatalogItemInList(
  items: CatalogItem[],
  input: { group: CatalogGroupKey; code?: string; label: string; sort?: number; meta?: Record<string, string> },
): CatalogItem {
  const label = input.label.trim();
  const code = input.code?.trim() || normalizeCatalogCode(label);
  if (!label || !code) throw new Error("Catalog label is required");
  const existing = items.find((item) => item.group === input.group && item.code === code);
  const next: CatalogItem = {
    group: input.group,
    code,
    label,
    sort: input.sort ?? existing?.sort ?? nextSort(items, input.group),
    active: true,
    meta: input.meta ?? existing?.meta,
  };
  if (existing) Object.assign(existing, next);
  else items.push(next);
  return existing ?? next;
}

export function deleteCatalogItemInList(items: CatalogItem[], group: CatalogGroupKey, code: string): void {
  const existing = items.find((item) => item.group === group && item.code === code);
  if (existing) {
    existing.active = false;
    return;
  }
  items.push({ group, code, label: code, sort: nextSort(items, group), active: false });
}

export function buildCatalogGroups(items: CatalogItem[]): CatalogGroup[] {
  return CATALOG_GROUPS.map((group) => ({
    ...group,
    items: visibleCatalogItems(items.filter((item) => item.group === group.key)),
  }));
}

function nextSort(items: CatalogItem[], group: CatalogGroupKey): number {
  const sorts = items.filter((item) => item.group === group).map((item) => item.sort || 0);
  return Math.max(0, ...sorts) + 10;
}
