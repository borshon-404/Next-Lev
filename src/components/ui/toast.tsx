"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<(kind: ToastKind, message: string) => void>(() => {});

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++toastId;
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg text-sm",
              t.kind === "success" && "border-emerald-200 bg-white text-emerald-800",
              t.kind === "error" && "border-rose-200 bg-white text-rose-800",
              t.kind === "info" && "border-slate-200 bg-white text-slate-700",
            ].join(" ")}
            role="status"
          >
            {t.kind === "success" && <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600" />}
            {t.kind === "error" && <XCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-rose-600" />}
            {t.kind === "info" && <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-indigo-600" />}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
              className="rounded p-0.5 text-slate-400 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
