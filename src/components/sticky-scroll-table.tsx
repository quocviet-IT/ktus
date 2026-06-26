"use client";

import { ReactNode, UIEvent, useRef } from "react";

type Props = {
  children: ReactNode;
  minWidth: number;
  className?: string;
  bodyClassName?: string;
};

export default function StickyScrollTable({ children, minWidth, className = "", bodyClassName = "" }: Props) {
  const topRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  const syncScroll = (source: "top" | "body") => (event: UIEvent<HTMLDivElement>) => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }

    const target = source === "top" ? bodyRef.current : topRef.current;
    if (!target) return;

    syncingRef.current = true;
    target.scrollLeft = event.currentTarget.scrollLeft;
  };

  return (
    <div className={`rounded-lg border border-line bg-card ${className}`}>
      <div className="sticky top-0 z-30 border-b border-line bg-band/95 px-2 py-1 shadow-sm">
        <div
          ref={topRef}
          onScroll={syncScroll("top")}
          className="h-4 overflow-x-auto overflow-y-hidden"
          aria-label="Cuộn ngang bảng"
        >
          <div style={{ width: minWidth, height: 1 }} />
        </div>
      </div>
      <div
        ref={bodyRef}
        onScroll={syncScroll("body")}
        className={`overflow-auto ${bodyClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
