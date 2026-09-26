"use client";

import { useActionState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError } from "@/components/ui/form-error";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<
    { error?: string; info?: string; fieldErrors?: Record<string, string[]> },
    FormData
  >(changePasswordAction, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </div>
      )}
      {state.info && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {state.info}
        </div>
      )}
      <Input label="Current password" name="currentPassword" type="password" autoComplete="current-password" required error={fieldError(state, "currentPassword")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="New password" name="newPassword" type="password" autoComplete="new-password" required hint="Min 8 chars, letter + number." error={fieldError(state, "newPassword")} />
        <Input label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required error={fieldError(state, "confirmPassword")} />
      </div>
      <Button type="submit" loading={pending}>
        Update password
      </Button>
    </form>
  );
}

async function changePasswordAction(_prev: { error?: string; info?: string; fieldErrors?: Record<string, string[]> }, formData: FormData) {
  const { changePasswordAction: action } = await import("@/server/members/actions");
  return action(_prev, formData);
}
