"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError } from "@/components/ui/form-error";
import { resetPasswordAction, type ActionResult } from "@/server/auth/actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(resetPasswordAction, {});
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Choose a new password</h1>
              <p className="text-xs text-slate-500">This link is single-use and expires after one hour.</p>
            </div>
          </div>
          <form action={formAction} className="mt-6 space-y-4">
            {state.error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                {state.error}
              </div>
            )}
            <input type="hidden" name="token" value={token} />
            <Input
              label="New password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              hint="Min 8 characters, with a letter and a number."
              error={fieldError(state, "password")}
            />
            <Input
              label="Confirm new password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              error={fieldError(state, "confirmPassword")}
            />
            <Button type="submit" loading={pending} className="w-full">
              Reset password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
