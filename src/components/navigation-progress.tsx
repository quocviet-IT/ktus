"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isInternalNavigationTarget, isInternalTarget, shouldStartNavigationForClick } from "@/lib/navigation-progress";

const MIN_VISIBLE_MS = 180;
const MAX_VISIBLE_MS = 6000;

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const startedAt = useRef(0);
  const maxTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!pending) return;
    const elapsed = Date.now() - startedAt.current;
    const timer = window.setTimeout(() => setPending(false), Math.max(0, MIN_VISIBLE_MS - elapsed));
    return () => window.clearTimeout(timer);
  }, [pathname, searchParams, pending]);

  useEffect(() => {
    function start() {
      startedAt.current = Date.now();
      setPending(true);
      if (maxTimer.current) window.clearTimeout(maxTimer.current);
      maxTimer.current = window.setTimeout(() => setPending(false), MAX_VISIBLE_MS);
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (!shouldStartNavigationForClick(event, anchor.target)) return;
      if (anchor.hasAttribute("download")) return;
      if (!isInternalNavigationTarget(window.location.href, anchor.href, window.location.origin)) return;
      start();
    }

    function onSubmit(event: SubmitEvent) {
      if (event.defaultPrevented) return;
      const form = event.target as HTMLFormElement | null;
      if (!form || form.method.toLowerCase() === "post") return;
      const action = form.action || window.location.href;
      if (!isInternalTarget(action, window.location.origin)) return;
      start();
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      if (maxTimer.current) window.clearTimeout(maxTimer.current);
    };
  }, []);

  if (!pending) return null;

  return (
    <div className="nav-progress" aria-live="polite" aria-label="Đang tải trang">
      <div className="nav-progress__bar" />
      <div className="nav-progress__pill">
        <span className="nav-progress__spinner" />
      </div>
    </div>
  );
}
