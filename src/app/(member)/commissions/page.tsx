import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireMemberPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { StatusBadge } from "@/components/ui/badge";
import { Gift, Clock, CheckCircle2, Banknote } from "lucide-react";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Commissions", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireMemberPage();
  const params = await searchParams;
  const status = typeof params.status === "string" && params.status !== "ALL" ? (params.status as "PENDING" | "APPROVED" | "PAID" | "CANCELLED" | "REVERSED") : undefined;
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1);

  const where = status ? { beneficiaryId: user.id, status } : { beneficiaryId: user.id };

  const [items, total, agg] = await Promise.all([
    prisma.commission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { fromUser: { select: { name: true, username: true } } },
    }),
    prisma.commission.count({ where }),
    prisma.commission.groupBy({
      by: ["status"],
      where: { beneficiaryId: user.id },
      _sum: { amount: true },
    }),
  ]);

  const sumBy = (s: string) => agg.find((a) => a.status === s)?._sum.amount ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status: status ?? "", ...patch })) if (v) p.set(k, v);
    const qs = p.toString();
    return `/commissions${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Commissions" description="Every commission earned, with its source, level and status." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Pending" value={formatCurrency(toNumber(sumBy("PENDING")))} icon={<Clock className="h-5 w-5" />} tone="warning" />
        <StatCard label="Approved" value={formatCurrency(toNumber(sumBy("APPROVED")))} icon={<CheckCircle2 className="h-5 w-5" />} tone="info" />
        <StatCard label="Paid" value={formatCurrency(toNumber(sumBy("PAID")))} icon={<Banknote className="h-5 w-5" />} tone="success" />
        <StatCard
          label="Total earned"
          value={formatCurrency(toNumber(agg.reduce((s, a) => s + toNumber(a._sum.amount), 0)))}
          icon={<Gift className="h-5 w-5" />}
        />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Commission history"
          action={
            <FilterBar searchHref={() => buildHref({ page: "1" })}>
              <FilterSelect
                name="status"
                value={status ?? "ALL"}
                options={[
                  { value: "ALL", label: "All statuses" },
                  { value: "PENDING", label: "Pending" },
                  { value: "APPROVED", label: "Approved" },
                  { value: "PAID", label: "Paid" },
                  { value: "CANCELLED", label: "Cancelled" },
                  { value: "REVERSED", label: "Reversed" },
                ]}
              />
            </FilterBar>
          }
        />
        {items.length === 0 ? (
          <EmptyState
            icon={<Gift className="h-5 w-5" />}
            message="No commissions yet"
            description="When your downline makes qualifying purchases, your commissions appear here with full traceability."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableHead>Amount</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Base</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold text-emerald-600 tabular-nums">+{formatCurrency(toNumber(c.amount))}</TableCell>
                  <TableCell>
                    <span className="block font-medium text-slate-800">{c.fromUser.name}</span>
                    <span className="block text-xs text-slate-400">@{c.fromUser.username}</span>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">L{c.level}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-slate-500">{formatCurrency(toNumber(c.baseAmount))}</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-500">{toNumber(c.percentage)}%</TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-slate-500">{formatDateTime(c.createdAt)}</TableCell>
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
