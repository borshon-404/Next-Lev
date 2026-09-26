"use client";

import type { ReactNode } from "react";

export function Tabs({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={["flex gap-1 overflow-x-auto border-b border-slate-200", className].join(" ")} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={[
            "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
            active === tab.id
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
          ].join(" ")}
        >
          {tab.label}
          {typeof tab.count === "number" && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
