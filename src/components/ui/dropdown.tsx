"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function Dropdown({
  trigger,
  children,
  align = "right",
  width = "w-56",
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={[
            "absolute z-40 mt-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg",
            width,
            align === "right" ? "right-0" : "left-0",
          ].join(" ")}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  onClick,
  children,
  danger = false,
}: {
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function DropdownButton({
  label,
  icon,
  className = "",
}: {
  label: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        btn.setAttribute("data-dropdown", "true");
        // The parent Dropdown trigger handles state; this is purely presentational.
      }}
      className={["inline-flex items-center gap-1", className].join(" ")}
    >
      {icon}
      {label && <span>{label}</span>}
      <ChevronDown className="h-3.5 w-3.5" />
    </button>
  );
}
