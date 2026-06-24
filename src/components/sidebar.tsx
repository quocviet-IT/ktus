"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: { group?: string; href: string; label: string; icon: string }[] = [
  { href: "/", label: "Bảng điều khiển", icon: "◧" },
  { group: "USBC101", href: "/usbc101", label: "Sổ công ty & Balance", icon: "①" },
  { group: "Hằng ngày", href: "/rc/new", label: "Nhập RC", icon: "✎" },
  { href: "/rc", label: "Sổ giao dịch RC (JM)", icon: "▤" },
  { group: "Báo cáo", href: "/reports/sales-daily", label: "Bán hàng theo ngày", icon: "▦" },
  { href: "/reports/sales-online", label: "Sales online", icon: "🌐" },
  { href: "/reports/bell", label: "Rung chuông", icon: "🔔" },
  { href: "/missing-source", label: "RC thiếu nguồn", icon: "⚑" },
  { href: "/excel", label: "Dữ liệu Excel", icon: "≡" },
  { group: "Kho & danh mục", href: "/inventory", label: "Tồn kho (KT↔US)", icon: "⚖" },
  { href: "/catalog", label: "Danh mục", icon: "⚙" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-[240px] shrink-0 bg-ink text-[#C9D3CB] flex flex-col min-h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-[#2c3a32]">
        <div className="font-mono text-[12px] tracking-widest text-accent">HPUS · KT210</div>
        <div className="font-serif text-lg text-white">Sổ vàng KTUS</div>
        <div className="text-[11px] text-[#7f8c84]">Theo dõi RC · 2026</div>
      </div>
      <nav className="p-2.5 flex-1">
        {NAV.map((n, i) => (
          <div key={n.href}>
            {n.group && <div className="font-mono text-[9.5px] tracking-widest text-[#7d8a81] px-3 pt-3 pb-1 uppercase">{n.group}</div>}
            <Link href={n.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] relative ${
                path === n.href ? "bg-ink2 text-white" : "hover:bg-ink2 hover:text-white"
              }`}>
              {path === n.href && <span className="absolute -left-2.5 top-2 bottom-2 w-[3px] bg-accent rounded-r" />}
              <span className="w-[18px] text-center text-accent">{n.icon}</span>
              {n.label}
            </Link>
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-[#2c3a32] text-[11px] text-[#7f8c84]">
        intern1@ctyhp.vn · MVP
      </div>
    </aside>
  );
}
