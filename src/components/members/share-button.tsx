"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export function ShareButtonClient({ url, title }: { url: string; title: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
      onClick={async () => {
        try {
          if (navigator.share) {
            await navigator.share({ title, url });
            return;
          }
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* user cancelled */
        }
      }}
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
      {done ? "Copied" : "Share"}
    </button>
  );
}
