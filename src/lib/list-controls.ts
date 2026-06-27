export type SortDir = "newest" | "oldest";

export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

export function normalizePageSize(value?: string | number): number {
  const n = Number(value);
  return PAGE_SIZE_OPTIONS.includes(n as any) ? n : DEFAULT_PAGE_SIZE;
}

export function normalizePage(value?: string | number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export function normalizeSortDir(value?: string): SortDir {
  return value === "oldest" ? "oldest" : "newest";
}

export function pageOffset(page: string | number | undefined, pageSize: number): number {
  return (normalizePage(page) - 1) * pageSize;
}

export function sortAscending(sort: SortDir): boolean {
  return sort === "oldest";
}
