"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction, type ActionResult } from "@/server/auth/actions";
import Link from "next/link";

export function LoginForm({ banner }: { banner?: { tone: "success"; text: string } }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(loginAction, {});

  return (
    <form action={formAction} className="space-y-4">
      {banner && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {banner.text}
        </div>
      )}
      {state.error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}
      <Input
        label="Email"
        name="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
      />
      <div>
        <Input label="Password" name="password" type="password" autoComplete="current-password" required />
        <div className="mt-1.5 text-right">
          <Link href="/forgot-password" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
            Forgot password?
          </Link>
        </div>
      </div>
      <Button type="submit" loading={pending} className="w-full">
        Log in
      </Button>
    </form>
  );
}
