import { AlertTriangle } from "lucide-react";

export interface FormErrorState {
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export function FormError({ error }: { error?: FormErrorState }) {
  if (!error?.message) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{error.message}</span>
    </div>
  );
}

export function fieldError(state: FormErrorState | undefined, field: string): string | undefined {
  return state?.fieldErrors?.[field]?.[0];
}
