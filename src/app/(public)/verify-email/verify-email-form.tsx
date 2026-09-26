"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyEmailAction, type ActionResult } from "@/server/auth/actions";

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(verifyEmailAction, {});
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-14">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
          {state.error ? <XCircle className="h-6 w-6 text-rose-500" /> : <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
          {state.error ? "Verification failed" : "Verifying your email…"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {state.error ?? "Confirm to verify your email address and activate your account."}
        </p>
        {state.error ? (
          <Link href="/login" className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
            Back to login
          </Link>
        ) : (
          <form action={formAction} className="mt-5">
            <input type="hidden" name="token" value={token} />
            <Button type="submit" loading={pending}>
              Verify email address
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
