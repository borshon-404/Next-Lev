"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { timeAgo } from "@/lib/format";

export function NotificationRow({
  id,
  unread,
  icon,
  title,
  body,
  link,
  date,
}: {
  id: string;
  unread: boolean;
  icon: React.ReactNode;
  title: string;
  body: string | null;
  link: string | null;
  date: Date;
}) {
  const [pending, setPending] = useState(false);

  return (
    <div className="flex items-start gap-3.5 px-5 py-4">
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${unread ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${unread ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
          {title}
          {unread && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 align-middle" />}
        </p>
        {body && <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{body}</p>}
        <p className="mt-1 text-xs text-slate-400">{timeAgo(date)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {link && (
          <Link href={link} className="hidden text-xs font-semibold text-indigo-600 hover:text-indigo-700 sm:block">
            View
          </Link>
        )}
        {unread && (
          <button
            onClick={async () => {
              setPending(true);
              const { markNotificationReadAction } = await import("@/server/members/actions");
              const fd = new FormData();
              fd.set("id", id);
              await markNotificationReadAction({}, fd);
              setPending(false);
              location.reload();
            }}
            disabled={pending}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50"
            title="Mark as read"
            aria-label="Mark as read"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
