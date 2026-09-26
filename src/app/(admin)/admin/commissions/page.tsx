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
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Gift, Clock, CheckCircle2, Banknote } from "lucide-react";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { CommissionActions } from "./commission-actions";

export const metadata: Metadata = { title: "Commissions", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const status = (typeof params.status === "string" && params.status !== "ALL" ? params.status : undefined) as
    | "PENDING"
    | "APPROVED"
    | "PAID"
    | "CANCELLED"
    | "REVERSED"
    | undefined;
  const level = typeof params.level === "string" && params.level !== "ALL" ? Number(params.level) : undefined;
  const q = typeof params.q === "string" && params.q ? params.q : undefined;
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (level) where.level = level;
  if (q) {
    where.OR = [
      { beneficiary: { username: { contains: q, mode: "insensitive" } } },
      { beneficiary: { name: { contains: q, mode: "insensitive" } } },
      { fromUser: { username: { contains: q, mode: "insensitive" } } },
      { fromUser: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [items, total, agg] = await Promise.all([
    prisma.commission.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        beneficiary: { select: { name: true, username: true } },
        fromUser: { select: { name: true, username: true } },
        sourceTransaction: { select: { id: true, referenceId: true } },
      },
    }),
    prisma.commission.count({ where: where as never }),
    prisma.commission.groupBy({ by: ["status"], _sum: { amount: true } }),
  ]);

  const sumBy = (s: string) => agg.find((a) => a.status === s)?._sum.amount ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const base = { status: status ?? "", level: level ? String(level) : "", q: q ?? "", ...patch };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const qs = p.toString();
    return `/admin/commissions${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Commissions" description="Every commission on the platform, with full source traceability." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Pending" value={formatCurrency(toNumber(sumBy("PENDING")))} sub="Awaiting approval" icon={<Clock className="h-5 w-5" />} tone="warning" />
        <StatCard label="Approved" value={formatCurrency(toNumber(sumBy("APPROVED")))} icon={<CheckCircle2 className="h-5 w-5" />} tone="info" />
        <StatCard label="Paid" value={formatCurrency(toNumber(sumBy("PAID")))} icon={<Banknote className="h-5 w-5" />} tone="success" />
        <StatCard label="All time" value={formatCurrency(toNumber(agg.reduce((s, a) => s + toNumber(a._sum.amount), 0)))} icon={<Gift className="h-5 w-5" />} />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Commission records"
          action={
            <FilterBar searchHref={(query) => buildHref({ q: query, page: "1" })} searchPlaceholder="Search beneficiary or source member…">
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
              <FilterSelect
                name="level"
                value={level ? String(level) : "ALL"}
                options={[
                  { value: "ALL", label: "All levels" },
                  { value: "1", label: "Level 1" },
                  { value: "2", label: "Level 2" },
                  { value: "3", label: "Level 3" },
                  { value: "4", label: "Level 4" },
                  { value: "5", label: "Level 5" },
                ]}
              />
            </FilterBar>
          }
        />
        {items.length === 0 ? (
          <EmptyState icon={<Gift className="h-5 w-5" />} message="No commissions found" description="Adjust the filters or check back when sales happen." />
        ) : (
          <Table>
            <TableHeader>
              <TableHead>Beneficiary</TableHead>
              <TableHead>Source member</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">Base</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/admin/users/${c.beneficiaryId}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {c.beneficiary.name}
                    </Link>
                    <span className="block text-xs text-slate-400">@{c.beneficiary.username}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-600">{c.fromUser.name}</span>
                    <span className="block text-xs text-slate-400">@{c.fromUser.username}</span>
                  </TableCell>
                  <TableCell>
                    <Badge tone="info">L{c.level}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-slate-500">{toNumber(c.percentage)}%</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-500">{formatCurrency(toNumber(c.baseAmount))}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(toNumber(c.amount))}</TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-500">{formatDateTime(c.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <CommissionActions commissionId={c.id} status={c.status} beneficiaryName={c.beneficiary.name} />
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
