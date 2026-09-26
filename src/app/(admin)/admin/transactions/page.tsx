import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { StatusBadge } from "@/components/ui/badge";
import { ArrowLeftRight } from "lucide-react";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Transactions", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const type = (typeof params.type === "string" && params.type !== "ALL" ? params.type : undefined) as string | undefined;
  const status = (typeof params.status === "string" && params.status !== "ALL" ? params.status : undefined) as string | undefined;
  const q = typeof params.q === "string" && params.q ? params.q : undefined;
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1);

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { user: { username: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { referenceId: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, username: true } } },
    }),
    prisma.transaction.count({ where: where as never }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const base = { type: type ?? "", status: status ?? "", q: q ?? "", ...patch };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const qs = p.toString();
    return `/admin/transactions${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Transactions" description="All financial transactions across the platform." />

      <Card>
        <CardHeader
          title="Transaction history"
          action={
            <FilterBar searchHref={(query) => buildHref({ q: query, page: "1" })} searchPlaceholder="Search member, reference, description…">
              <FilterSelect
                name="type"
                value={type ?? "ALL"}
                options={[
                  { value: "ALL", label: "All types" },
                  { value: "PACKAGE_PURCHASE", label: "Package purchase" },
                  { value: "DEPOSIT", label: "Deposit" },
                  { value: "WITHDRAWAL", label: "Withdrawal" },
                  { value: "COMMISSION_PAYOUT", label: "Commission payout" },
                  { value: "ADJUSTMENT", label: "Adjustment" },
                ]}
              />
              <FilterSelect
                name="status"
                value={status ?? "ALL"}
                options={[
                  { value: "ALL", label: "All statuses" },
                  { value: "PENDING", label: "Pending" },
                  { value: "COMPLETED", label: "Completed" },
                  { value: "FAILED", label: "Failed" },
                  { value: "REVERSED", label: "Reversed" },
                ]}
              />
            </FilterBar>
          }
        />
        {items.length === 0 ? (
          <EmptyState icon={<ArrowLeftRight className="h-5 w-5" />} message="No transactions found" description="Try different filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Date</TableHead>
            </TableHeader>
            <TableBody>
              {items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link href={`/admin/users/${t.userId}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {t.user.name}
                    </Link>
                    <span className="block text-xs text-slate-400">@{t.user.username}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium text-slate-800">{t.type.replaceAll("_", " ")}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(toNumber(t.amount))}</TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-slate-500" title={t.description ?? undefined}>
                    {t.description ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[130px] truncate font-mono text-xs text-slate-400">{t.referenceId ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-slate-500">{formatDateTime(t.createdAt)}</TableCell>
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
