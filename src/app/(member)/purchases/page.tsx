import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireMemberPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { CancelPurchaseButton } from "./purchases-actions";

export const metadata: Metadata = { title: "My Purchases", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const user = await requireMemberPage();
  const purchases = await prisma.packagePurchase.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { package: { select: { name: true, pv: true } }, payment: { select: { reference: true, status: true } } },
  });

  return (
    <>
      <PageHeader
        title="My Purchases"
        description="Your package purchase history and pending payments."
        actions={
          <Link href="/packages">
            <Button variant="outline">
              Browse packages <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader title="Purchase history" />
        {purchases.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-5 w-5" />}
            message="No purchases yet"
            description="Activate a package to become an active member and start earning."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableHead>Package</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Personal volume</TableHead>
              <TableHead>Payment reference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableHeader>
            <TableBody>
              {purchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-slate-800">{p.package.name}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(toNumber(p.amount))}</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-500">{toNumber(p.package.pv) > 0 ? toNumber(p.package.pv) : "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-400">{p.payment?.reference ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-500">{formatDateTime(p.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {p.status === "PENDING" ? <CancelPurchaseButton id={p.id} /> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
