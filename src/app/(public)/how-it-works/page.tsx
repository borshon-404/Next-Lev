import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus, KeyRound, Users, ShoppingCart, Calculator, Wallet, Landmark, Award } from "lucide-react";

export const metadata: Metadata = {
  title: "How It Works",
  description: "A step-by-step explanation of how membership, referrals, commissions, wallets and withdrawals work on Nexlev.",
};

const steps = [
  {
    icon: UserPlus,
    title: "1 · Register",
    body: "Sign up with your name, email, phone and password. If you have a referral code from your sponsor, add it — your account is then linked to them permanently, and a record of that referral is stored.",
  },
  {
    icon: KeyRound,
    title: "2 · Get your referral code",
    body: "Immediately after registration you receive a unique referral code and a link like /register?ref=YOURCODE. Share it with friends, social media or email — it appears throughout your dashboard with copy and share buttons.",
  },
  {
    icon: ShoppingCart,
    title: "3 · Activate a package",
    body: "Purchase one of the configured packages to become an active member. Package prices, personal volume and commission eligibility are set by the platform administrator. Until payment is confirmed, the purchase stays in a PENDING state.",
  },
  {
    icon: Users,
    title: "4 · Build your team",
    body: "Every person who registers with your link becomes your direct referral. Their referrals form the next level, and so on — a full genealogy tree is computed from these relationships and visible to you and to admins.",
  },
  {
    icon: Calculator,
    title: "5 · Commissions are calculated",
    body: "When a qualifying purchase completes, the commission engine walks up the sponsor chain level by level, applies the configured percentage for each level, checks qualification rules (active status, KYC, packages, volume thresholds) and records a commission for each eligible upline member.",
  },
  {
    icon: Wallet,
    title: "6 · Track it in your wallet",
    body: "Commissions appear in your wallet — either in the pending bucket (until approved) or the available bucket, depending on the plan configuration. Every movement creates an immutable ledger entry with previous and new balances.",
  },
  {
    icon: Landmark,
    title: "7 · Withdraw your earnings",
    body: "Request a withdrawal within the configured minimum and maximum limits. Funds are held immediately, reviewed by an administrator, and paid out via the method you specify. Rejected requests refund your wallet automatically.",
  },
  {
    icon: Award,
    title: "8 · Grow your rank",
    body: "Ranks are configured by the administrator with direct-referral, team-size and volume requirements. When you meet the minimums for a higher rank, you are promoted automatically and receive the configured rank bonus.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">How It Works</h1>
      <p className="mt-3 max-w-2xl text-slate-500">
        From registration to your first commission — here is exactly how the platform works, in the order it happens.
      </p>
      <ol className="mt-10 space-y-5">
        {steps.map((s) => (
          <li key={s.title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:gap-5 sm:p-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <s.icon className="h-5.5 w-5.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">{s.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-12 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm leading-relaxed text-amber-900">
        <strong>Please understand:</strong> participating in a network marketing business requires consistent effort.
        Commissions depend on purchases made by you and your downline, which are not controlled by the platform.
        Nothing on Nexlev constitutes a guarantee of income or financial results.
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/register" className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
          Get Started
        </Link>
        <Link href="/compensation-plan" className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          See the Compensation Plan
        </Link>
      </div>
    </div>
  );
}
