import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Banknote, Clock, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { DepositActions, NewDepositDialog } from "./deposit-actions";

export const metadata: Metadata = { title: "Deposits", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminDepositsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const status = (typeof params.status === "string" && params.status !== "ALL" ? params.status : undefined) as
    | "PENDING"
    | "COMPLETED"
    | "CANCELLED"
    | undefined;

  const where = status ? { status } : {};
  const [items, pendingAgg, completedAgg, members] = await Promise.all([
    prisma.deposit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true, username: true } } },
    }),
    prisma.deposit.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
    prisma.deposit.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.user.findMany({
      where: { role: "MEMBER", status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, username: true },
      take: 200,
    }),
  ]);

  const buildHref = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status: status ?? "", ...patch })) if (v) p.set(k, v);
    const qs = p.toString();
    return `/admin/deposits${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Deposits"
        description="Record and confirm member wallet funding (bank transfers, cash, etc.). Completing a deposit credits the wallet through the ledger."
        actions={<NewDepositDialog members={members.map((m) => ({ value: m.id, label: `${m.name} (@${m.username})` }))} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label="Pending deposits" value={formatCurrency(toNumber(pendingAgg._sum.amount))} icon={<Clock className="h-5 w-5" />} tone="warning" />
        <StatCard label="Completed deposits" value={formatCurrency(toNumber(completedAgg._sum.amount))} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="Recent records" value={items.length} icon={<Banknote className="h-5 w-5" />} tone="info" />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Deposit records"
          action={
            <form method="GET" className="flex gap-2">
              <select
                name="status"
                defaultValue={status ?? "ALL"}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm"
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </form>
          }
        />
        {items.length === 0 ? (
          <EmptyState icon={<Banknote className="h-5 w-5" />} message="No deposits recorded" description="Record a deposit when a member funds their wallet offline." />
        ) : (
          <Table>
            <TableHeader>
              <TableHead>Member</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableHeader>
            <TableBody>
              {items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link href={`/admin/users/${d.userId}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {d.user.name}
                    </Link>
                    <span className="block text-xs text-slate-400">@{d.user.username}</span>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(toNumber(d.amount))}</TableCell>
                  <TableCell className="text-slate-600">{d.method}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-400">{d.reference ?? "—"}</TableCell>
                  <TableCell className="max-w-[160px] truncate text-slate-500" title={d.note ?? undefined}>
                    {d.note ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-500">{formatDateTime(d.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <DepositActions depositId={d.id} status={d.status} />
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
