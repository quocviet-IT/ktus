export function money(n: number): string {
  return "$" + Math.round(n || 0).toLocaleString("en-US");
}
export function num(n?: number | null): string {
  return (n || 0).toLocaleString("en-US");
}
export function ddmm(iso: string): string {
  // iso = YYYY-MM-DD
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
export function ddmmyyyy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
