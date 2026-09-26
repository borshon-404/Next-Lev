import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a password reset link.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Reset your password</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Enter the email associated with your account and we&apos;ll send you a reset link.
          </p>
          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
        </div>
        <p className="mt-5 text-center text-sm text-slate-500">
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
