import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms and conditions governing use of the Nexlev platform.",
};

export default function TermsPage() {
  const sections: { h: string; p: string[] }[] = [
    {
      h: "1 · Acceptance of Terms",
      p: [
        "By creating an account or using the Nexlev platform, you agree to be bound by these Terms & Conditions and the Privacy Policy. If you do not agree, you must not use the platform.",
        "You represent that you are at least 18 years of age and capable of entering into a binding agreement.",
      ],
    },
    {
      h: "2 · The Service",
      p: [
        "Nexlev is a technology platform for managing referral-based businesses: account management, referral and genealogy tracking, package activation, commission calculation, wallet and withdrawal processing, and administrative tooling.",
        "Nexlev is not a financial institution, a bank, or a payment processor. Balances shown in the wallet are records of credits and debits maintained by the platform, and are not deposits in a bank or a promise of payment.",
      ],
    },
    {
      h: "3 · Your Account",
      p: [
        "You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. You must provide accurate registration information and keep it up to date.",
        "Your sponsor relationship is established at registration from the referral code used and is permanent. You may not use another person's account or attempt to manipulate the referral tree.",
        "We may suspend or terminate accounts that violate these terms, engage in fraud, or otherwise harm the platform or its members.",
      ],
    },
    {
      h: "4 · Packages and Payments",
      p: [
        "Packages are configured and priced by the platform operator. Purchase amounts, package availability and personal volume values may change over time as configured by the operator.",
        "A purchase is not confirmed until payment is verified. Pending purchases can be cancelled by the member or the operator.",
      ],
    },
    {
      h: "5 · Commissions — No Guarantee of Earnings",
      p: [
        "Commissions are calculated according to the compensation plan in effect at the time a qualifying transaction occurs, as displayed on the Compensation Plan page and configured by the operator.",
        "The platform and the operator make no promise or guarantee of income, earnings, returns or financial results of any kind. Your results depend on the number and value of qualifying purchases by you and your downline, market conditions, and many other factors outside the platform's control.",
        "Commissions may be subject to qualification rules. Commissions that do not meet the rules in effect at the time of calculation will not be paid.",
      ],
    },
    {
      h: "6 · Wallet and Withdrawals",
      p: [
        "You may request withdrawals within the configured minimum and maximum limits, subject to account and KYC requirements. Withdrawal requests are reviewed; the operator may reject a request for legitimate reasons, in which case held funds are refunded to your wallet.",
        "Wallet balances are derived from an immutable ledger of transactions. In the unlikely event of a demonstrable system error, the operator may correct the record through an audited adjustment.",
      ],
    },
    {
      h: "7 · Conduct",
      p: [
        "You agree not to: attempt unauthorized access to the platform or other users' data; engage in money laundering or other unlawful activity; misrepresent earnings or the nature of the business to prospects; or interfere with the proper functioning of the platform.",
      ],
    },
    {
      h: "8 · Privacy",
      p: [
        "Your personal data is processed in accordance with the Privacy Policy. KYC documents are stored privately and accessed only by you and authorized administrators for verification purposes.",
      ],
    },
    {
      h: "9 · Liability",
      p: [
        "To the maximum extent permitted by law, the platform is provided \"as is\". We are not liable for indirect or consequential losses. Nothing in these terms limits liability that cannot be limited by law.",
      ],
    },
    {
      h: "10 · Changes and Governing Law",
      p: [
        "We may update these terms; continued use after changes constitutes acceptance. These terms are governed by the laws of the jurisdiction in which the operator is established.",
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Terms &amp; Conditions</h1>
      <p className="mt-2 text-xs text-slate-400">Last updated: September 26, 2026</p>
      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-base font-semibold text-slate-900">{s.h}</h2>
            {s.p.map((par, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-slate-600">
                {par}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
