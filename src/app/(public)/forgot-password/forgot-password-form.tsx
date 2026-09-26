"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError } from "@/components/ui/form-error";
import { forgotPasswordAction, type ActionResult } from "@/server/auth/actions";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(forgotPasswordAction, {});
  return (
    <form action={formAction} className="space-y-4">
      {state.info && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {state.info}
        </div>
      )}
      <Input label="Email" name="email" type="email" placeholder="you@example.com" required error={fieldError(state, "email")} />
      <Button type="submit" loading={pending} className="w-full">
        Send reset link
      </Button>
    </form>
  );
}
