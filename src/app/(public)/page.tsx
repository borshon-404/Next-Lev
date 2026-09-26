import Link from "next/link";
import {
  Users,
  Share2,
  Network,
  BarChart3,
  Wallet,
  LayoutDashboard,
  Package,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Calculator,
  Landmark,
  FileCheck,
} from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { getMlmSettings } from "@/server/mlm/settings-service";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: Share2,
    title: "Referral System",
    body: "Every member gets a unique referral code and shareable link. New sign-ups are linked to their sponsor permanently — no ambiguity, no manual work.",
  },
  {
    icon: Network,
    title: "Team Management",
    body: "A full genealogy tree with expand/collapse, search and per-level statistics. See your direct referrals, your whole team, and who is active.",
  },
  {
    icon: Calculator,
    title: "Commission Tracking",
    body: "A configurable unilevel engine calculates commissions server-side from the plan rules stored in the database — fully auditable, never re-processed.",
  },
  {
    icon: Wallet,
    title: "Secure Wallet",
    body: "Every credit and debit is recorded in an immutable ledger with previous and new balances. Available and pending balances are tracked separately.",
  },
  {
    icon: LayoutDashboard,
    title: "Powerful Dashboard",
    body: "Earnings over time, team growth, commission distribution and recent activity — all real data, all on one screen.",
  },
  {
    icon: Package,
    title: "Packages & Ranks",
    body: "Admin-configurable packages, personal volume and rank ladders with automatic promotion and rank bonuses.",
  },
];

const steps = [
  {
    n: "01",
    title: "Register with a referral link",
    body: "Create your account with your sponsor's referral code. Your code and link are generated instantly.",
  },
  {
    n: "02",
    title: "Activate a package",
    body: "Purchase a package to become active. Packages are configured by the platform administrator and stored in the database.",
  },
  {
    n: "03",
    title: "Build your team",
    body: "Share your unique link. As referrals join and purchase packages, commissions flow up your line per the configured plan.",
  },
  {
    n: "04",
    title: "Track, withdraw, grow",
    body: "Follow every commission in your wallet, request withdrawals, and climb the rank ladder as your team grows.",
  },
];

export default async function HomePage() {
  const settings = await getMlmSettings();
  const activeLevels = settings.rules.filter((r) => r.active);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(60rem 30rem at 70% -10%, rgba(99,102,241,0.35), transparent), radial-gradient(40rem 20rem at 10% 110%, rgba(139,92,246,0.25), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Ledger-grade financial integrity · Configurable plan
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Build, Manage &amp; Grow Your Network</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
              {siteConfig.name} is a professional multi-level marketing management platform: transparent
              commissions, an auditable wallet, a full genealogy tree, and everything your organization needs — in
              one system.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-indigo-500 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-colors hover:bg-indigo-400"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex h-12 items-center rounded-xl border border-slate-600 px-6 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-400 hover:text-white"
              >
                How It Works
              </Link>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-slate-800 pt-8">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Plan type</dt>
                <dd className="mt-1 text-sm font-semibold text-white">{settings.planType} (configurable)</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Commission levels</dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {activeLevels.map((r) => `${r.level}`).join("·") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Ledger records</dt>
                <dd className="mt-1 text-sm font-semibold text-white">Immutable &amp; auditable</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">How the platform works</h2>
          <p className="mt-3 text-slate-500">
            Everything an MLM organization needs — from first referral to payout — with the financial rails of a
            proper ledger.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">From sign-up to payout in four steps</h2>
          </div>
          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <li key={s.n} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="text-sm font-bold text-indigo-600">{s.n}</span>
                <h3 className="mt-2 text-sm font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Compensation preview (live from settings) */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              A transparent, configured plan — not a black box
            </h2>
            <p className="mt-4 text-slate-500">
              The current plan on this deployment is a <strong className="text-slate-700">unilevel</strong> structure
              with the following active levels. Every percentage below is read live from the administrator&apos;s
              configuration — change it in the admin panel and the public plan page updates instantly.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Commissions are calculated server-side from the source purchase",
                "Qualification rules (activity, KYC, packages) are enforced automatically",
                "Every commission is tied to its source transaction and permanently auditable",
                "Withdrawals are validated against limits, KYC and real available balance",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-500" />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href="/compensation-plan"
              className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Read the full compensation plan <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Current commission levels</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                {settings.planType}
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {activeLevels.map((r) => (
                <div key={r.level} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs font-semibold text-slate-500">Level {r.level}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: `${Math.min(100, r.percentage * 10)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-semibold text-slate-900 tabular-nums">
                    {r.percentage}%
                  </span>
                </div>
              ))}
              {activeLevels.length === 0 && <p className="text-sm text-slate-400">No active levels configured.</p>}
            </div>
            <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-400">
              Commissions are paid only when the source transaction completes and qualification rules are met.
              Past performance is not a guarantee of future earnings.
            </p>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-t border-slate-200 bg-slate-950 py-14 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3 sm:px-6">
          {[
            { icon: Landmark, title: "Bank-grade ledger", body: "Every balance change is an immutable event with previous and new balances." },
            { icon: FileCheck, title: "Real authorization", body: "Role-based access control on the server. Admin actions are audit-logged." },
            { icon: Users, title: "Built for organizations", body: "Configurable packages, ranks, rules and withdrawals — no hard-coded plan." },
          ].map((t) => (
            <div key={t.title} className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                <t.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-14 text-center shadow-xl sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight text-white">Ready to build your network?</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">
            Create your account, get your referral link, and start managing your team the professional way.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-12 items-center rounded-xl bg-white px-7 text-sm font-semibold text-indigo-700 shadow-lg transition-colors hover:bg-indigo-50"
            >
              Get Started
            </Link>
            <Link
              href="/compensation-plan"
              className="inline-flex h-12 items-center rounded-xl border border-white/40 px-7 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              View Compensation Plan
            </Link>
          </div>
          <p className="mt-6 text-xs text-indigo-200/70">
            Participation involves effort and results vary. {siteConfig.legalName} does not guarantee income or
            financial outcomes.
          </p>
        </div>
      </section>
    </div>
  );
}
