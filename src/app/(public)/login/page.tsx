import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Zap } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Nexlev account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Zap className="h-5.5 w-5.5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500">Log in to your Nexlev account</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <LoginForm
            banner={
              params.registered
                ? { tone: "success", text: "Your account was created successfully. Log in to get started." }
                : params.verified
                  ? { tone: "success", text: "A verification email has been sent. Please check your inbox." }
                  : params["email-verified"]
                    ? { tone: "success", text: "Your email address has been verified. You can log in now." }
                    : params.reset
                      ? { tone: "success", text: "Your password has been reset. Log in with your new password." }
                      : undefined
            }
          />
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          New to Nexlev?{" "}
          <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
