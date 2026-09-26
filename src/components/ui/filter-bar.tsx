import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Select } from "./input";

/**
 * Reusable search + filter row. `search` is controlled: pass the current value
 * and a URL-building function (server-side search via query params).
 */
export function FilterBar({
  search,
  searchHref,
  searchPlaceholder = "Search…",
  children,
}: {
  search?: string;
  searchHref: (query: string) => string;
  searchPlaceholder?: string;
  children?: ReactNode; // additional filter controls
}) {
  return (
    <form method="GET" className="flex flex-wrap items-center gap-2">
      {searchHref !== undefined && (
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>
      )}
      {children}
      <button
        type="submit"
        className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
      >
        Filter
      </button>
    </form>
  );
}

export function FilterSelect({
  name,
  value,
  options,
  label,
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  label?: string;
}) {
  return (
    <Select name={name} defaultValue={value} className="w-40">
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

export function DateRangeSelect({
  preset,
  from,
  to,
  options,
}: {
  preset: string;
  from?: string;
  to?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select name="range" defaultValue={preset} className="w-44">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {preset === "custom" && (
        <>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm"
          />
          <span className="text-xs text-slate-400">→</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm"
          />
        </>
      )}
    </div>
  );
}
