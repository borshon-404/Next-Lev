import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Nexlev collects, uses, stores and protects your personal data.",
};

export default function PrivacyPage() {
  const sections: { h: string; p: string[] }[] = [
    {
      h: "1 · What We Collect",
      p: [
        "Registration data: full name, username, email address, phone number and (optionally) your sponsor's referral code.",
        "Profile data: address, country and date of birth if you provide them.",
        "KYC data: legal name, identification document type and number, identification documents and supporting documents you submit for verification.",
        "Usage and financial data: purchases, commissions, wallet ledger entries, withdrawals, login activity and audit-relevant administrative actions.",
      ],
    },
    {
      h: "2 · How We Use It",
      p: [
        "To operate your account: authentication, referral linking, genealogy, commission calculation, wallet and withdrawal processing.",
        "To verify your identity (KYC) and comply with applicable legal requirements.",
        "To protect the platform against fraud, abuse and unauthorized access.",
        "To communicate with you about account matters, withdrawals and platform announcements.",
        "We do not sell your personal data.",
      ],
    },
    {
      h: "3 · Document Storage",
      p: [
        "KYC documents are stored in private object storage under opaque keys. They are never exposed through public URLs and can only be retrieved through the authenticated platform by the document owner or an authorized administrator.",
      ],
    },
    {
      h: "4 · Sharing",
      p: [
        "Sponsor names and basic referral information are visible within the genealogy as required for team management. Full personal details are visible to administrators for support, KYC and compliance purposes.",
        "We may share data with payment processors, cloud infrastructure providers and authorities where legally required.",
      ],
    },
    {
      h: "5 · Retention & Security",
      p: [
        "Financial records are retained permanently for audit integrity. Other data is retained for as long as your account is active and as required by law.",
        "We use industry-standard safeguards: encrypted connections, password hashing, role-based access control, and audit logging of administrative actions.",
      ],
    },
    {
      h: "6 · Your Rights",
      p: [
        "Subject to applicable law, you may request access to, correction of, or deletion of your personal data, and object to or restrict certain processing. Contact support to make a request.",
      ],
    },
    {
      h: "7 · Changes",
      p: ["We may update this policy; material changes will be announced on the platform."],
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
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
