"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  ChevronLeft,
  ClipboardList,
  FileSpreadsheet,
  Globe2,
  Layers,
  LayoutDashboard,
  PencilLine,
  Scale,
  type LucideIcon,
} from "lucide-react";

// Äiá»u hÆ°á»›ng theo nghiá»‡p vá»¥ (kiá»ƒu pháº§n má»m káº¿ toÃ¡n)
const NAV: { group?: string; href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Tá»•ng quan", icon: LayoutDashboard },
  { group: "RC Tracking", href: "/rc/new", label: "Nháº­p RC", icon: PencilLine },
  { href: "/rc", label: "Sá»• RC JM", icon: ClipboardList },
  { href: "/missing-source", label: "RC thiáº¿u nguá»“n", icon: Scale },
  { group: "Deals", href: "/deals", label: "Quáº£n lÃ½ Deal", icon: Layers },
  { group: "Bank", href: "/bank", label: "Sao kÃª ngÃ¢n hÃ ng", icon: Banknote },
  { group: "Reconciliation", href: "/reconciliation", label: "Äá»‘i chiáº¿u KT â†” US", icon: ArrowLeftRight },
  { group: "Reports", href: "/reports/sales-daily", label: "BÃ¡n hÃ ng theo ngÃ y", icon: BarChart3 },
  { href: "/reports/sales-online", label: "Sales online", icon: Globe2 },
  { href: "/reports/bell", label: "Rung chuÃ´ng", icon: Bell },
  { group: "Master Data", href: "/catalog", label: "Danh má»¥c", icon: BookOpen },
  { href: "/excel", label: "Dá»¯ liá»‡u Excel", icon: FileSpreadsheet },
];

const STORAGE_KEY = "ktus.sidebar.collapsed";

export default function Sidebar() {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Äá»c tráº¡ng thÃ¡i Ä‘Ã£ lÆ°u sau khi mount (trÃ¡nh lá»‡ch hydration)
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
      className={`${collapsed ? "w-[68px]" : "w-[240px]"} shrink-0 flex flex-col min-h-screen sticky top-0 bg-[#24463A] text-[#E7E1D2] transition-[width] duration-200 ease-in-out`}
    >
      {/* ThÆ°Æ¡ng hiá»‡u */}
      <div className={`flex items-center border-b border-white/10 ${collapsed ? "px-2 py-4 justify-center" : "px-5 py-4"}`}>
        {collapsed ? (
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-[#C9A24B]/50 font-serif text-[15px] text-[#E6C77A]">KT</div>
        ) : (
          <div className="min-w-0">
            <div className="font-mono text-[11px] tracking-widest text-[#C9A24B]">HPUS Â· KT210</div>
            <div className="font-serif text-lg text-[#F2ECDD] truncate">Sá»• vÃ ng KTUS</div>
            <div className="text-[11px] text-[#9DB0A2]">Theo dÃµi RC Â· 2026</div>
          </div>
        )}
      </div>

      {/* NÃºt thu gá»n (phÃ­a trÃªn, cÃ³ nhÃ£n) */}
      <div className="px-2.5 pt-2.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Má»Ÿ rá»™ng menu" : "Thu gá»n menu"}
          title={collapsed ? "Má»Ÿ rá»™ng menu" : "Thu gá»n menu"}
          className={`flex items-center gap-2.5 w-full rounded-lg text-[12.5px] text-[#CFE0D5] hover:bg-white/[0.06] hover:text-white ${collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2"}`}
        >
          <ChevronLeft className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} aria-hidden="true" strokeWidth={1.8} />
          {!collapsed && <span>Thu gá»n menu</span>}
        </button>
      </div>

      {/* Äiá»u hÆ°á»›ng */}
      <nav className="px-2.5 pb-2.5 flex-1 overflow-y-auto">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = path === n.href;
          return (
            <div key={n.href}>
              {n.group && !collapsed && (
                <div className="font-mono text-[9.5px] tracking-widest text-[#88A091] px-3 pt-3 pb-1 uppercase">{n.group}</div>
              )}
              {n.group && collapsed && <div className="my-2 border-t border-white/10" />}
              <Link
                href={n.href}
                title={collapsed ? n.label : undefined}
                className={`flex items-center gap-2.5 rounded-lg text-[13px] relative ${collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2"} ${
                  active ? "bg-[#C9A24B]/15 text-[#F0D89B] font-semibold" : "text-[#E7E1D2] hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {active && <span className={`absolute top-1.5 bottom-1.5 w-[3px] bg-[#C9A24B] rounded-r ${collapsed ? "left-0" : "-left-2.5"}`} />}
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#E6C77A]" : "text-[#BFA15E]"}`} aria-hidden="true" strokeWidth={1.8} />
                {!collapsed && <span className="truncate">{n.label}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* ChÃ¢n menu */}
      {!collapsed && (
        <div className="px-5 py-3 border-t border-white/10 text-[11px] text-[#7E9387]">intern1@ctyhp.vn Â· MVP</div>
      )}
    </aside>
  );
}
