import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { formatCurrency, toNumber } from "@/lib/format";
import { Package as PackageIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PackageDialog } from "./packages-actions";

export const metadata: Metadata = { title: "Packages", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPackagesPage() {
  await requireAdminPage();
  const packages = await prisma.package.findMany({
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
    include: { _count: { select: { purchases: true } } },
  });

  const serialize = (p: (typeof packages)[number]) => JSON.stringify({
    packageId: p.id,
    name: p.name,
    description: p.description ?? "",
    price: toNumber(p.price),
    pv: toNumber(p.pv),
    isActive: p.isActive,
    commissionEligible: p.commissionEligible,
  });

  return (
    <>
      <PageHeader
        title="Packages"
        description="Create, edit and activate the packages members can purchase."
        actions={
          <PackageDialog
            triggerLabel="+ New package"
            initial={null}
          />
        }
      />

      {packages.length === 0 ? (
        <Card>
          <EmptyState icon={<PackageIcon className="h-5 w-5" />} message="No packages yet" description="Create your first package to allow members to activate their membership." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{p.name}</h3>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(toNumber(p.price), p.currency)}</p>
                  </div>
                  <StatusBadge status={p.isActive ? "ACTIVE" : "INACTIVE"} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {toNumber(p.pv) > 0 && <Badge tone="info">{toNumber(p.pv)} PV</Badge>}
                  <Badge tone={p.commissionEligible ? "success" : "default"}>
                    {p.commissionEligible ? "Commission-eligible" : "Not eligible"}
                  </Badge>
                  <Badge tone="default">{p._count.purchases} purchases</Badge>
                </div>
                {p.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-500">{p.description}</p>}
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <PackageDialog
                    triggerLabel="Edit package"
                    initial={{ packageId: p.id, name: p.name, description: p.description ?? "", price: toNumber(p.price), pv: toNumber(p.pv), isActive: p.isActive, commissionEligible: p.commissionEligible }}
                  />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
