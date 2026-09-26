import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { StatusBadge } from "@/components/ui/badge";
import { Clock, CheckCircle2, Landmark, DollarSign } from "lucide-react";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { WithdrawalActions } from "./withdrawal-actions";

export const metadata: Metadata = { title: "Withdrawals", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const status = (typeof params.status === "string" && params.status !== "ALL" ? params.status : undefined) as
    | "PENDING"
    | "APPROVED"
    | "PROCESSING"
    | "COMPLETED"
    | "REJECTED"
    | "CANCELLED"
    | undefined;
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1);

  const where = status ? { status } : {};
  const [items, total, pendingAgg, completedAgg, pendingCount] = await Promise.all([
    prisma.withdrawal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, username: true, email: true } } },
    }),
    prisma.withdrawal.count({ where }),
    prisma.withdrawal.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
    prisma.withdrawal.aggregate({ where: { status: "COMPLETED" }, _sum: { netAmount: true } }),
    prisma.withdrawal.count({ where: { status: "PENDING" } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status: status ?? "", ...patch })) if (v) p.set(k, v);
    const qs = p.toString();
    return `/admin/withdrawals${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Withdrawals" description="Review, approve and complete member payout requests." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Pending requests" value={pendingCount} sub={formatCurrency(toNumber(pendingAgg._sum.amount)) + " held"} icon={<Clock className="h-5 w-5" />} tone="warning" />
        <StatCard label="Held value" value={formatCurrency(toNumber(pendingAgg._sum.amount))} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Completed payouts" value={formatCurrency(toNumber(completedAgg._sum.netAmount))} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="Total requests" value={total} icon={<Landmark className="h-5 w-5" />} tone="info" />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="All withdrawals"
          action={
            <FilterBar searchHref={() => buildHref({ page: "1" })}>
              <FilterSelect
                name="status"
                value={status ?? "ALL"}
                options={[
                  { value: "ALL", label: "All statuses" },
                  { value: "PENDING", label: "Pending" },
                  { value: "APPROVED", label: "Approved" },
                  { value: "PROCESSING", label: "Processing" },
                  { value: "COMPLETED", label: "Completed" },
                  { value: "REJECTED", label: "Rejected" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]}
              />
            </FilterBar>
          }
        />
        {items.length === 0 ? (
          <EmptyState icon={<Landmark className="h-5 w-5" />} message="No withdrawals found" description="Member withdrawal requests will appear here." />
        ) : (
          <Table>
            <TableHeader>
              <TableHead>Member</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableHeader>
            <TableBody>
              {items.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <Link href={`/admin/users/${w.userId}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {w.user.name}
                    </Link>
                    <span className="block text-xs text-slate-400">@{w.user.username}</span>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(toNumber(w.amount))}</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-500">{formatCurrency(toNumber(w.fee))}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatCurrency(toNumber(w.netAmount))}</TableCell>
                  <TableCell className="capitalize text-slate-600">{w.paymentMethod}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-slate-500" title={w.accountDetails}>
                    {w.accountDetails}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={w.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-500">{formatDateTime(w.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <WithdrawalActions withdrawalId={w.id} status={w.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {pages > 1 && (
          <div className="px-4 pb-4">
            <Pagination page={page} pages={pages} hrefForPage={(p) => buildHref({ page: String(p) })} />
          </div>
        )}
      </Card>
    </>
  );
}


