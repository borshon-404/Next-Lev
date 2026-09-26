"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/input";
import { fieldError } from "@/components/ui/form-error";
import { registerAction, type ActionResult } from "@/server/auth/actions";

export function RegisterForm({
  initialReferralCode,
  referralRequired,
}: {
  initialReferralCode?: string;
  referralRequired: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(registerAction, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name"
          name="fullName"
          placeholder="Jane Doe"
          autoComplete="name"
          required
          error={fieldError(state, "fullName")}
        />
        <Input
          label="Username"
          name="username"
          placeholder="janedoe"
          autoComplete="username"
          required
          hint="Letters, numbers and underscores only."
          error={fieldError(state, "username")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          error={fieldError(state, "email")}
        />
        <Input
          label="Phone"
          name="phone"
          type="tel"
          placeholder="+1 555 000 1234"
          autoComplete="tel"
          required
          error={fieldError(state, "phone")}
        />
      </div>
      <Input
        label={`Referral code${referralRequired ? " (required)" : ""}`}
        name="referralCode"
        placeholder="e.g. BORSHON123"
        defaultValue={initialReferralCode}
        className="sm:col-span-2"
        hint={referralRequired ? "This platform requires a sponsor's referral code." : "Optional — enter your sponsor's code if you have one."}
        error={fieldError(state, "referralCode")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint="Min 8 characters, with a letter and a number."
          error={fieldError(state, "password")}
        />
        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={fieldError(state, "confirmPassword")}
        />
      </div>

      <Checkbox
        name="acceptTerms"
        required
        error={fieldError(state, "acceptTerms")}
        label={
          <>
            I accept the{" "}
            <Link href="/terms" className="font-medium text-indigo-600 hover:underline">
              Terms &amp; Conditions
            </Link>{" "}
            and the{" "}
            <Link href="/privacy" className="font-medium text-indigo-600 hover:underline">
              Privacy Policy
            </Link>
            . I understand that use of this platform does not guarantee income or financial results.
          </>
        }
      />

      <Button type="submit" loading={pending} size="lg" className="w-full">
        Create account
      </Button>
    </form>
  );
}
