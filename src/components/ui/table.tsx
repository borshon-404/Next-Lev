import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { EmptyState } from "./empty-state";

export function Table({ children, className = "" }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={["w-full min-w-[640px] text-left text-sm", className].join(" ")}>{children}</table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50/70">
      <tr>{children}</tr>
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function TableRow({ className = "", ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={["transition-colors hover:bg-slate-50/60", className].join(" ")} {...props} />;
}

export function TableHead({ className = "", ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={["px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500", className].join(" ")}
      {...props}
    />
  );
}

export function TableCell({ className = "", ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={["px-4 py-3 align-middle text-slate-700", className].join(" ")} {...props} />;
}

export function TableEmpty({ message, description }: { message: string; description?: string }) {
  return (
    <tr>
      <td colSpan={99}>
        <EmptyState message={message} description={description} />
      </td>
    </tr>
  );
}
