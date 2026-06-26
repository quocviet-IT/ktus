"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronLeft,
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

const STORAGE_KEY = "ktus.sidebar.collapsed";

export default function Sidebar() {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Đọc trạng thái đã lưu sau khi mount (tránh lệch hydration)
  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  }

  return (
    <aside
      className={`${collapsed ? "w-[68px]" : "w-[240px]"} relative shrink-0 bg-card text-text border-r border-line flex flex-col min-h-screen sticky top-0 transition-[width] duration-200 ease-in-out`}
    >
      {/* Nút thu/mở: tròn trắng, viền rõ, nổi trên cạnh phải */}
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
        title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
        className="absolute -right-3.5 top-[24px] z-20 grid h-7 w-7 place-items-center rounded-full border border-line bg-card text-brand shadow-[0_2px_10px_rgba(30,45,35,0.16)] transition-colors hover:border-brand hover:bg-brand hover:text-white"
      >
        <ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      <div className={`flex items-center border-b border-line ${collapsed ? "px-2 py-4 justify-center" : "px-5 py-4"}`}>
        {collapsed ? (
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand font-serif text-[15px] text-white">KT</div>
        ) : (
          <div className="min-w-0">
            <div className="font-mono text-[11px] tracking-widest text-accent">HPUS · KT210</div>
            <div className="font-serif text-lg text-brand truncate">Sổ vàng KTUS</div>
            <div className="text-[11px] text-muted">Theo dõi RC · 2026</div>
          </div>
        )}
      </div>

      <nav className="p-2.5 flex-1">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = path === n.href;
          return (
            <div key={n.href}>
              {n.group && !collapsed && (
                <div className="font-mono text-[9.5px] tracking-widest text-muted px-3 pt-3 pb-1 uppercase">{n.group}</div>
              )}
              {n.group && collapsed && <div className="my-2 border-t border-line" />}
              <Link
                href={n.href}
                title={collapsed ? n.label : undefined}
                className={`flex items-center gap-2.5 rounded-lg text-[13px] relative ${collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2"} ${
                  active ? "bg-accentSoft text-brand font-semibold" : "text-text hover:bg-band"
                }`}
              >
                {active && <span className={`absolute top-1.5 bottom-1.5 w-[3px] bg-accent rounded-r ${collapsed ? "left-0" : "-left-2.5"}`} />}
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-accent" : "text-brand"}`} aria-hidden="true" strokeWidth={1.8} />
                {!collapsed && <span className="truncate">{n.label}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-4 py-3 border-t border-line text-[11px] text-muted">
          intern1@ctyhp.vn · MVP
        </div>
      )}
    </aside>
  );
}
