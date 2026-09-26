"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, rightSlot, className = "", id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          className={[
            "h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors",
            "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500",
            error ? "border-rose-400" : "border-slate-300",
            rightSlot ? "pr-24" : "",
          ].join(" ")}
          {...props}
        />
        {rightSlot && <div className="absolute inset-y-0 right-2 flex items-center">{rightSlot}</div>}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string; hint?: string }
>(function Textarea({ label, error, hint, className = "", id, ...props }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={[
          "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors",
          "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500",
          error ? "border-rose-400" : "border-slate-300",
        ].join(" ")}
        {...props}
      />
      {error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; hint?: string }
>(function Select({ label, error, hint, className = "", id, children, ...props }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        className={[
          "h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500",
          error ? "border-rose-400" : "border-slate-300",
        ].join(" ")}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
});

export const Checkbox = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; error?: string; onCheckedChange?: (checked: boolean) => void }
>(function Checkbox({ label, error, className = "", onCheckedChange, onChange, ...props }, ref) {
  return (
    <div className={className}>
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          ref={ref}
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/40"
          onChange={(e) => {
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
          }}
          {...props}
        />
        {label && <span className="text-sm text-slate-700">{label}</span>}
      </label>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
});
