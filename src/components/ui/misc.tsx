import type { ReactNode } from "react";
import { initials } from "@/lib/format";

export function Avatar({ name, src, size = "md" }: { name: string; src?: string | null; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-14 w-14 text-lg" };
  return (
    <span className={["relative inline-flex shrink-0 overflow-hidden rounded-full bg-indigo-100 font-semibold text-indigo-700", sizes[size]].join(" ")}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center">{initials(name)}</span>
      )}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {breadcrumb && (
          <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400" aria-label="Breadcrumb">
            {breadcrumb.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span>/</span>}
                {c.href ? (
                  <a href={c.href} className="hover:text-slate-600">
                    {c.label}
                  </a>
                ) : (
                  <span className="text-slate-500">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  return (
    <CopyButtonClient value={value} label={label} />
  );
}

import { CopyButtonClient } from "./copy-button";
