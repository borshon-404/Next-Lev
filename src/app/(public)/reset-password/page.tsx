import type { Metadata } from "next";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  if (!token) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-14">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
            <XCircle className="h-6 w-6 text-rose-500" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Invalid reset link</h1>
          <p className="mt-2 text-sm text-slate-500">
            This password reset link is incomplete or has expired. Request a new one.
          </p>
          <Link href="/forgot-password" className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
