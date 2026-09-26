import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description: "What Nexlev is, who it is for, and the principles behind the platform.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">About Nexlev</h1>
      <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-slate-600">
        <p>
          Nexlev is a multi-level marketing management platform built for modern organizations that run referral-based
          businesses. We provide the full operational stack — member onboarding, genealogy, package management,
          commission calculation, wallet, withdrawals and administration — as a single, coherent system.
        </p>
        <p>
          Our core belief is that MLM software should be <strong className="text-slate-800">transparent</strong>. The
          compensation plan is not buried in code: it is a configuration, stored in the database and visible to members
          on the public compensation-plan page. Every financial event is recorded in an immutable ledger, and every
          admin action is audit-logged.
        </p>
        <p>
          The platform is plan-agnostic by design. The current deployment runs a configurable unilevel structure, but
          the architecture is organized so that binary, matrix or other compensation models can be added without
          rewriting the application.
        </p>
        <h2 className="pt-4 text-xl font-semibold text-slate-900">Who uses Nexlev</h2>
        <p>
          Network marketing teams, affiliate-style organizations and direct sales companies that need reliable team
          management, trustworthy commission tracking and a secure payout process. Members get their dashboard, wallet
          and genealogy; administrators get user management, plan configuration, KYC review, withdrawal processing and
          reporting.
        </p>
        <h2 className="pt-4 text-xl font-semibold text-slate-900">A note on earnings</h2>
        <p>
          We are intentionally direct about this: <strong className="text-slate-800">Nexlev is a tool, not a promise.</strong>{" "}
          Results for members depend on the business being run, market conditions, personal effort and many factors
          outside the platform&apos;s control. We do not market guaranteed income or guaranteed returns, and we advise
          our customers to be transparent with their members about realistic outcomes.
        </p>
      </div>
      <div className="mt-10 rounded-xl border border-indigo-100 bg-indigo-50 p-6">
        <h3 className="text-sm font-semibold text-indigo-900">Questions?</h3>
        <p className="mt-1.5 text-sm text-indigo-800">
          Visit our <Link className="font-medium underline" href="/how-it-works">How It Works</Link> page or{" "}
          <Link className="font-medium underline" href="/contact">contact us</Link>.
        </p>
      </div>
      <Link
        href="/register"
        className="mt-10 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
      >
        Create an account <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
