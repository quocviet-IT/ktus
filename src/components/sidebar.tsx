"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  ClipboardList,
  FileSpreadsheet,
  Globe2,
  Landmark,
  LayoutDashboard,
  PackageSearch,
  PencilLine,
  Scale,
  type LucideIcon,
} from "lucide-react";

const NAV: { group?: string; href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Bảng điều khiển", icon: LayoutDashboard },
  { group: "USBC101", href: "/usbc101", label: "Sổ công ty & Balance", icon: Landmark },
  { group: "Hằng ngày", href: "/rc/new", label: "Nhập RC", icon: PencilLine },
  { href: "/rc", label: "Sổ giao dịch RC (JM)", icon: ClipboardList },
  { group: "Báo cáo", href: "/reports/sales-daily", label: "Bán hàng theo ngày", icon: BarChart3 },
  { href: "/reports/sales-online", label: "Sales online", icon: Globe2 },
  { href: "/reports/bell", label: "Rung chuông", icon: Bell },
  { href: "/missing-source", label: "RC thiếu nguồn", icon: Scale },
  { href: "/excel", label: "Dữ liệu Excel", icon: FileSpreadsheet },
  { group: "Kho & danh mục", href: "/inventory", label: "Tồn kho (KT↔US)", icon: PackageSearch },
  { href: "/catalog", label: "Danh mục", icon: BookOpen },
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
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
          <div key={n.href}>
            {n.group && <div className="font-mono text-[9.5px] tracking-widest text-[#7d8a81] px-3 pt-3 pb-1 uppercase">{n.group}</div>}
            <Link href={n.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] relative ${
                path === n.href ? "bg-ink2 text-white" : "hover:bg-ink2 hover:text-white"
              }`}>
              {path === n.href && <span className="absolute -left-2.5 top-2 bottom-2 w-[3px] bg-accent rounded-r" />}
              <Icon className="h-[18px] w-[18px] shrink-0 text-accent" aria-hidden="true" strokeWidth={1.8} />
              {n.label}
            </Link>
          </div>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-[#2c3a32] text-[11px] text-[#7f8c84]">
        intern1@ctyhp.vn · MVP
      </div>
    </aside>
  );
}
