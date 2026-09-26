import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about Nexlev membership, commissions, wallets and withdrawals.",
};

const faqs: { q: string; a: string }[] = [
  {
    q: "What is Nexlev?",
    a: "Nexlev is a multi-level marketing management platform. It handles member registration and referral linking, package activation, team/genealogy tracking, commission calculation, a secure wallet, withdrawals, KYC verification, ranks and full administration.",
  },
  {
    q: "How do I get my referral code?",
    a: "You receive a unique referral code immediately after registering. It is available on your dashboard and referral page, with copy and share buttons, and can be used as a link like /register?ref=YOURCODE.",
  },
  {
    q: "How are commissions calculated?",
    a: "Commissions are calculated server-side when a qualifying package purchase is completed. The engine walks up the buyer's sponsor chain, applies the configured percentage for each level, and checks qualification rules (active status, KYC, package ownership, volume thresholds). The exact levels and percentages are configured by the administrator and displayed on the Compensation Plan page.",
  },
  {
    q: "Can I change my sponsor?",
    a: "No. The sponsor relationship is set at registration from the referral code used and is permanent. This is a core integrity rule of the genealogy system — it prevents disputes and keeps the tree consistent.",
  },
  {
    q: "What is the difference between available and pending balance?",
    a: "Available balance is what you can withdraw. Pending balance is earnings that have been credited but not yet released (for example, commissions awaiting approval under the current plan settings). The wallet shows both separately, and every movement is recorded in an immutable ledger.",
  },
  {
    q: "How do withdrawals work?",
    a: "From your Wallet page you request a withdrawal with an amount, payment method and account details. The amount must be within the configured minimum and maximum, your account must be active, and KYC must be approved if required. Funds are held immediately, an administrator reviews the request, and payout is completed or rejected (with automatic refund) — every step is recorded.",
  },
  {
    q: "Do I need KYC verification?",
    a: "KYC (Know Your Customer) verification requires a legal name, identification document and supporting information. It is required before withdrawals when the platform has that requirement enabled. Documents are stored privately and are only accessible to you and authorized administrators.",
  },
  {
    q: "How do ranks work?",
    a: "Ranks are configured with requirements such as direct referrals, team size and sales volume. When your metrics meet a higher rank's minimums, you are promoted automatically and receive the configured one-time rank bonus. Ranks are never downgraded.",
  },
  {
    q: "Is income guaranteed?",
    a: "No. We are explicit about this: Nexlev is a management platform, not a financial product. Earnings depend on your own activity and the purchases made by you and your downline. Nothing on this site is a guarantee of income, returns or financial results.",
  },
  {
    q: "What happens if my account is suspended?",
    a: "A suspended account cannot log in or perform operations. You can contact support to understand the reason. Suspensions are recorded in the audit log.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Frequently Asked Questions</h1>
      <p className="mt-3 text-slate-500">
        Can&apos;t find what you&apos;re looking for? <Link href="/contact" className="font-medium text-indigo-600 underline">Contact us</Link>.
      </p>
      <dl className="mt-10 space-y-4">
        {faqs.map((f) => (
          <details key={f.q} className="group rounded-xl border border-slate-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="text-slate-400 transition-transform group-open:rotate-45">＋</span>
            </summary>
            <p className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600">{f.a}</p>
          </details>
        ))}
      </dl>
    </div>
  );
}
