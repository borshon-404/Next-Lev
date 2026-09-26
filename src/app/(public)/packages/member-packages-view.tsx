import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireMemberPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Package as PackageIcon, ShoppingCart } from "lucide-react";
import { formatCurrency, toNumber } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { PurchaseButton } from "./packages-actions";

export const metadata: Metadata = { title: "Packages", robots: { index: false } };
export const dynamic = "force-dynamic";

export async function MemberPackagesView() {
  const user = await requireMemberPage();
  const [packages, currentPurchase] = await Promise.all([
    prisma.package.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] }),
    prisma.packagePurchase.findFirst({
      where: { userId: user.id, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: { package: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Packages"
        description={
          currentPurchase
            ? `Your current package: ${currentPurchase.package.name}`
            : "Activate a package to become an active member."
        }
        actions={currentPurchase ? <Badge tone="success">Active: {currentPurchase.package.name}</Badge> : undefined}
      />

      {packages.length === 0 ? (
        <Card>
          <EmptyState
            icon={<PackageIcon className="h-5 w-5" />}
            message="No packages are available right now"
            description="The administrator has not activated any packages. Please check back later."
          />
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => {
            const pv = toNumber(p.pv);
            const isCurrent = currentPurchase?.package.name === p.name;
            return (
              <Card key={p.id} className={isCurrent ? "ring-2 ring-indigo-500/30" : ""}>
                <CardBody className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{p.name}</h3>
                      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                        {formatCurrency(toNumber(p.price), p.currency)}
                      </p>
                    </div>
                    {isCurrent && <Badge tone="success">Current</Badge>}
                  </div>
                  {pv > 0 && <p className="mt-2 text-xs font-medium text-indigo-600">{pv} personal volume point{pv === 1 ? "" : "s"}</p>}
                  {p.description && <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500">{p.description}</p>}
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Full membership access
                    </li>
                    {p.commissionEligible ? (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Generates commissions for your upline
                      </li>
                    ) : (
                      <li className="flex items-center gap-2 text-slate-400">
                        <CheckCircle2 className="h-4 w-4" /> Not commission-eligible
                      </li>
                    )}
                  </ul>
                  <div className="mt-5">
                    <PurchaseButton packageId={p.id} name={p.name} price={toNumber(p.price)} currency={p.currency} disabled={isCurrent} />
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Purchases are confirmed after payment verification. Until then your purchase stays PENDING and can be cancelled
        from My Purchases.
      </p>
    </>
  );
}
