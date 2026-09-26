import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Server-side pagination control. `hrefForPage` lets pages build query-string
 * URLs (searchParams are preserved by the caller).
 */
export function Pagination({
  page,
  pages,
  hrefForPage,
}: {
  page: number;
  pages: number;
  hrefForPage: (page: number) => string;
}) {
  if (pages <= 1) return null;
  const nums: number[] = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  for (let i = start; i <= Math.min(pages, start + 4); i++) nums.push(i);

  return (
    <nav className="flex items-center justify-between gap-3 px-1 pt-4" aria-label="Pagination">
      <div className="flex items-center gap-1">
        <a
          href={page > 1 ? hrefForPage(page - 1) : "#"}
          aria-disabled={page <= 1}
          className={[
            "flex h-8 w-8 items-center justify-center rounded-lg border text-slate-600 transition-colors",
            page > 1 ? "border-slate-300 bg-white hover:bg-slate-50" : "border-transparent opacity-40",
          ].join(" ")}
        >
          <ChevronLeft className="h-4 w-4" />
        </a>
        {nums.map((n) => (
          <a
            key={n}
            href={hrefForPage(n)}
            aria-current={n === page ? "page" : undefined}
            className={[
              "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm font-medium transition-colors",
              n === page ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            {n}
          </a>
        ))}
        <a
          href={page < pages ? hrefForPage(page + 1) : "#"}
          aria-disabled={page >= pages}
          className={[
            "flex h-8 w-8 items-center justify-center rounded-lg border text-slate-600 transition-colors",
            page < pages ? "border-slate-300 bg-white hover:bg-slate-50" : "border-transparent opacity-40",
          ].join(" ")}
        >
          <ChevronRight className="h-4 w-4" />
        </a>
      </div>
      <p className="text-xs text-slate-500 tabular-nums">
        Page {page} of {pages}
      </p>
    </nav>
  );
}
