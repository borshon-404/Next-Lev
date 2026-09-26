"use client";

export function ReportControls({
  type,
  range,
  from,
  to,
  types,
  ranges,
}: {
  type: string;
  range: string;
  from: string;
  to: string;
  types: { value: string; label: string }[];
  ranges: { value: string; label: string }[];
}) {
  return (
    <form method="GET" action="/admin/reports" className="flex flex-wrap items-center gap-2">
      <select name="type" defaultValue={type} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm">
        {types.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <select name="range" defaultValue={range} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm">
        {ranges.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {range === "custom" && (
        <>
          <input type="date" name="from" defaultValue={from} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm" />
          <span className="text-xs text-slate-400">→</span>
          <input type="date" name="to" defaultValue={to} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm" />
        </>
      )}
      <button type="submit" className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800">
        Apply
      </button>
    </form>
  );
}
