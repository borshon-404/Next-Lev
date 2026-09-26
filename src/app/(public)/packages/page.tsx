import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, toNumber } from "@/lib/format";
import { auth } from "@/auth";
import { MemberPackagesView } from "./member-packages-view";

export const metadata: Metadata = {
  title: "Packages",
  description: "The packages currently offered on Nexlev. Packages are configured by the platform administrator.",
};
export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  // Authenticated members (and admins) see the purchasable view; visitors see the public catalog.
  const session = await auth();
  if (session?.user) {
    return <MemberPackagesView />;
  }
  const packages = await prisma.package.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] });

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Packages</h1>
        <p className="mt-3 text-slate-500">
          Activating a package makes your membership active and contributes personal volume toward rank requirements.
          Packages are configured by the platform administrator and stored in the database — what you see here is the
          current live configuration.
        </p>
      </div>

      {packages.length === 0 ? (
        <div className="mt-14 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No packages are currently active. Please check back later or contact support.
        </div>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p, i) => {
            const pv = toNumber(p.pv);
            return (
              <div
                key={p.id}
                className={[
                  "relative flex flex-col rounded-2xl border bg-white p-7 shadow-sm",
                  i === 1 ? "border-indigo-300 ring-2 ring-indigo-500/20" : "border-slate-200",
                ].join(" ")}
              >
                {i === 1 && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white">
                    Most Popular
                  </span>
                )}
                <h2 className="text-lg font-semibold text-slate-900">{p.name}</h2>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold tracking-tight text-slate-900">{formatCurrency(toNumber(p.price), p.currency)}</span>
                  <span className="text-sm text-slate-400">one-time</span>
                </div>
                {pv > 0 && (
                  <p className="mt-2 text-xs font-medium text-indigo-600">
                    {pv} personal volume point{pv === 1 ? "" : "s"}
                  </p>
                )}
                {p.description && <p className="mt-4 text-sm leading-relaxed text-slate-500">{p.description}</p>}
                <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Full platform access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Wallet &amp; commission tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {p.commissionEligible ? "Generates commissions for upline" : "Not commission-eligible"}
                  </li>
                </ul>
                <Link
                  href="/register"
                  className={[
                    "mt-7 inline-flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                    i === 1
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  Get Started
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-slate-400">
        Prices are shown for information. Payment is processed and confirmed by the platform. Purchase does not
        guarantee any earnings.
      </p>
    </div>
  );
}
