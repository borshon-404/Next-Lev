import type { HTMLAttributes } from "react";

type Tone = "default" | "success" | "warning" | "danger" | "info" | "purple";

const tones: Record<Tone, string> = {
  default: "bg-slate-100 text-slate-700 ring-slate-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
  info: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({ tone = "default", className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        tones[tone],
        className,
      ].join(" ")}
      {...props}
    />
  );
}

/** Maps a domain status string to a sensible badge tone. */
export function statusTone(status: string): Tone {
  const map: Record<string, Tone> = {
    ACTIVE: "success",
    APPROVED: "success",
    PAID: "success",
    COMPLETED: "success",
    PENDING: "warning",
    PROCESSING: "info",
    INACTIVE: "default",
    NOT_SUBMITTED: "default",
    REJECTED: "danger",
    CANCELLED: "default",
    REVERSED: "danger",
    FAILED: "danger",
    SUSPENDED: "danger",
    REFUNDED: "purple",
  };
  return map[status] ?? "default";
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{status.replaceAll("_", " ")}</Badge>;
}
