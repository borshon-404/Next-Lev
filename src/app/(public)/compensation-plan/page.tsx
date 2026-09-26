import type { Metadata } from "next";
import Link from "next/link";
import { Users, UserCheck, FileSearch, Banknote, Landmark, Award } from "lucide-react";
import { getMlmSettings } from "@/server/mlm/settings-service";

export const metadata: Metadata = {
  title: "Compensation Plan",
  description: "The current Nexlev compensation plan, including commission levels, qualification rules and withdrawal requirements.",
};
export const dynamic = "force-dynamic";

export default async function CompensationPlanPage() {
  const s = await getMlmSettings();
  const activeRules = s.rules.filter((r) => r.active).sort((a, b) => a.level - b.level);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Compensation Plan</h1>
      <p className="mt-3 max-w-2xl text-slate-500">
        This page is generated live from the administrator&apos;s configuration. The plan below is a{" "}
        <strong className="text-slate-700">{s.planType.toLowerCase()}</strong> plan: commissions are calculated on
        purchases by your downline, distributed up the sponsor chain, and governed by the qualification rules listed
        here.
      </p>

      {/* Levels */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900">Commission levels</h2>
        <p className="mt-2 text-sm text-slate-500">
          When a qualifying purchase of <strong className="text-slate-700">{s.currency}</strong> completes, each
          eligible level in the buyer&apos;s upline receives the configured percentage of the purchase amount.
        </p>
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {activeRules.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">No active commission levels are currently configured.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Level</th>
                  <th className="px-5 py-3">Relationship</th>
                  <th className="px-5 py-3 text-right">Percentage</th>
                  <th className="px-5 py-3 text-right">Example on a 100.00 purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeRules.map((r, i) => (
                  <tr key={r.level}>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">Level {r.level}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {i === 0 ? "Your direct referral (sponsor)" : `${r.level} levels below the buyer`}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-indigo-600 tabular-nums">{r.percentage}%</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-slate-600">
                      {(100 * r.percentage) / 100 >= 0 ? `—` : ""}
                      {`100.00 × ${r.percentage}% = ${((100 * r.percentage) / 100).toFixed(2)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Example only. Actual commissions depend on the price of the purchased package and the configuration at the
          time of purchase.
        </p>
      </section>

      {/* Qualification */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900">Qualification requirements</h2>
        <p className="mt-2 text-sm text-slate-500">
          A member is only paid a commission when <em>all</em> enabled requirements are met at the moment the
          commission is generated.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            { on: s.qualification.requireActiveMembership, label: "Active membership required", icon: UserCheck },
            { on: s.qualification.requireKyc, label: "KYC verification required", icon: FileSearch },
            { on: s.qualification.requirePackage, label: "An active package purchase required", icon: Banknote },
            {
              on: s.qualification.minDirectReferrals > 0,
              label: `Minimum ${s.qualification.minDirectReferrals} direct referral${s.qualification.minDirectReferrals === 1 ? "" : "s"}`,
              icon: Users,
            },
            {
              on: s.qualification.minPersonalVolume > 0,
              label: `Minimum personal volume of ${s.qualification.minPersonalVolume}`,
              icon: Banknote,
            },
            {
              on: s.qualification.minTeamVolume > 0,
              label: `Minimum team volume of ${s.qualification.minTeamVolume}`,
              icon: Users,
            },
            {
              on: s.qualification.minMonthlySales > 0,
              label: `Minimum monthly sales of ${s.qualification.minMonthlySales}`,
              icon: Banknote,
            },
          ]
            .filter((r) => r.on)
            .map((r) => (
              <li key={r.label} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                <r.icon className="h-4.5 w-4.5 text-indigo-500" />
                {r.label}
              </li>
            ))}
        </ul>
        {s.qualification.requireActiveMembership || s.qualification.requireKyc || s.qualification.requirePackage
          ? null
          : (
            <p className="mt-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-500">
              No qualification rules are currently enabled — eligible upline members are paid at the levels above.
            </p>
          )}
      </section>

      {/* Commissions lifecycle */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900">How commissions are handled</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Calculation &amp; recording</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              The commission engine runs server-side when a purchase is confirmed. It walks the sponsor chain, applies
              the configured percentage per level, and creates a commission record linked to the source transaction.
              The same transaction can never generate the same commission twice.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Statuses</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Commissions move through clear states:{" "}
              {s.commissionAutoApprove
                ? "new commissions are credited as available immediately."
                : "new commissions start as pending and become available after administrative approval."}{" "}
              Approved commissions can be paid out; cancellations and reversals adjust the wallet through the same
              audited ledger.
            </p>
          </div>
        </div>
      </section>

      {/* Withdrawals */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900">Withdrawal rules</h2>
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex items-center justify-between px-5 py-3.5">
              <dt className="text-slate-500">Minimum withdrawal</dt>
              <dd className="font-semibold text-slate-900 tabular-nums">{s.minWithdrawalNum.toFixed(2)} {s.currency}</dd>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <dt className="text-slate-500">Maximum withdrawal</dt>
              <dd className="font-semibold text-slate-900 tabular-nums">{s.maxWithdrawalNum.toFixed(2)} {s.currency}</dd>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <dt className="text-slate-500">Withdrawal fee</dt>
              <dd className="font-semibold text-slate-900 tabular-nums">
                {s.withdrawalFeePercentNum}%
                {s.withdrawalFeeFixedNum > 0 ? ` + ${s.withdrawalFeeFixedNum.toFixed(2)} ${s.currency}` : ""}
              </dd>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <dt className="text-slate-500">KYC verification for withdrawals</dt>
              <dd className="font-semibold text-slate-900">{s.kycRequiredForWithdrawal ? "Required" : "Not required"}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          When you request a withdrawal, the amount is held from your available balance immediately. Administrators
          review requests; rejected or cancelled requests refund the held amount automatically. You can never withdraw
          more than your available balance.
        </p>
      </section>

      {/* Package requirements */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900">Package requirements</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Members must activate a package to be considered active
          {s.qualification.requirePackage ? " and to receive commissions" : ""}.{" "}
          {s.autoActivate
            ? "Accounts are activated automatically upon registration; package activation drives commission qualification."
            : "Accounts may require administrative activation — see the registration requirements."}
          Current packages are listed on the <Link href="/packages" className="font-medium text-indigo-600 underline">Packages</Link> page.
        </p>
      </section>

      <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-start gap-3">
          <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <p className="text-xs leading-relaxed text-slate-500">
            <strong className="text-slate-600">Disclaimer:</strong> This compensation plan describes how commissions
            are calculated when qualifying transactions occur. It is not a promise of income. Earnings depend entirely
            on the number and value of purchases by you and your team, which are not guaranteed. Past performance is
            not indicative of future results.
          </p>
        </div>
      </div>

      <div className="mt-10 flex gap-3">
        <Link href="/register" className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
          Get Started
        </Link>
        <Link href="/faq" className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Read the FAQ
        </Link>
      </div>
    </div>
  );
}
