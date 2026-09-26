import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Zap, UserCheck } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { getSponsorByReferralCode } from "@/server/auth/register-service";
import { getMlmSettings } from "@/server/mlm/settings-service";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Register",
  description: "Create your Nexlev account and get your referral link.",
};
export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const refCode = typeof params.ref === "string" ? params.ref.toUpperCase() : "";
  const sponsor = refCode ? await getSponsorByReferralCode(refCode) : null;
  const settings = await getMlmSettings();

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-5">
        {/* Left: pitch */}
        <div className="lg:col-span-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Zap className="h-5.5 w-5.5" />
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
            Create your account
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Get a unique referral link, activate a package, and start building your team. Your sponsor link is
            permanent and stored the moment you register.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Unique referral code & shareable link",
              "Transparent, configurable commission plan",
              "Immutable wallet ledger & secure withdrawals",
              "Full genealogy, team stats and rank progression",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-sm text-slate-600">
                <UserCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-indigo-500" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: form */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {refCode &&
              (sponsor ? (
                <div className="mb-5 flex items-center gap-3.5 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3.5">
                  <Avatar name={sponsor.name} src={sponsor.image} size="lg" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">
                      You joined through
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {sponsor.name} <span className="font-normal text-slate-500">@{sponsor.username}</span>
                    </p>
                    <p className="text-xs text-slate-500">Referral code: {sponsor.referralCode}</p>
                  </div>
                </div>
              ) : (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800">
                  The referral code <strong>{refCode}</strong> is not valid or belongs to an inactive account. You can
                  still register without it
                  {settings.referralRequired ? "" : " (or correct the code)"}
                  {settings.referralRequired ? " — but this platform requires a valid referral code." : "."}
                </div>
              ))}

            <RegisterForm
              initialReferralCode={refCode}
              referralRequired={settings.referralRequired}
            />
          </div>

          <p className="mt-4 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
