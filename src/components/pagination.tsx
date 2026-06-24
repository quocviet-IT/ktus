import Link from "next/link";
import { buildQuery } from "@/lib/period";

export default function Pagination({
  basePath, sp, page, totalPages, total,
}: { basePath: string; sp: Record<string, string | undefined>; page: number; totalPages: number; total: number }) {
  if (totalPages <= 1) return <div className="mt-2 text-[12px] text-muted">{total} dòng</div>;
  const href = (p: number) => `${basePath}?${buildQuery(sp, { page: p })}`;
  const nums: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) nums.push(p);

  const btn = "rounded-md border border-line px-2.5 py-1 text-[12px] font-mono hover:border-accent";
  const active = "bg-brand text-white border-brand";

  return (
    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
      <span className="text-[12px] text-muted mr-2">{total} dòng · trang {page}/{totalPages}</span>
      {page > 1 && <Link href={href(1)} className={btn}>«</Link>}
      {page > 1 && <Link href={href(page - 1)} className={btn}>‹</Link>}
      {nums[0] > 1 && <span className="text-muted px-1">…</span>}
      {nums.map((p) => <Link key={p} href={href(p)} className={`${btn} ${p === page ? active : ""}`}>{p}</Link>)}
      {nums[nums.length - 1] < totalPages && <span className="text-muted px-1">…</span>}
      {page < totalPages && <Link href={href(page + 1)} className={btn}>›</Link>}
      {page < totalPages && <Link href={href(totalPages)} className={btn}>»</Link>}
    </div>
  );
}
