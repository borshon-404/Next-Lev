import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireMemberPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { FilterBar, FilterSelect, DateRangeSelect } from "@/components/ui/filter-bar";
import { StatusBadge } from "@/components/ui/badge";
import { ArrowLeftRight } from "lucide-react";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveDateRange, type DateRangePreset } from "@/server/reports/report-service";

export const metadata: Metadata = { title: "Transactions", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireMemberPage();
  const params = await searchParams;
  const type = typeof params.type === "string" && params.type !== "ALL" ? (params.type as string) : undefined;
  const status = typeof params.status === "string" && params.status !== "ALL" ? (params.status as string) : undefined;
  const rangePreset = (typeof params.range === "string" ? params.range : "all") as DateRangePreset;
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1);

  const range = resolveDateRange(
    rangePreset,
    typeof params.from === "string" ? params.from : undefined,
    typeof params.to === "string" ? params.to : undefined
  );

  const where: Record<string, unknown> = { userId: user.id };
  if (type) where.type = type;
  if (status) where.status = status;
  if (range.from) where.createdAt = { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) };

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.transaction.count({ where: where as never }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const base = {
      type: type ?? "",
      status: status ?? "",
      range: rangePreset,
      from: typeof params.from === "string" ? params.from : "",
      to: typeof params.to === "string" ? params.to : "",
      ...patch,
    };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const qs = p.toString();
    return `/transactions${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Transactions" description="Your financial transactions: purchases, withdrawals, deposits and adjustments." />

      <Card>
        <CardHeader
          title="Transaction history"
          action={
            <FilterBar searchHref={() => buildHref({ page: "1" })}>
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
              <DateRangeSelect
                preset={rangePreset}
                from={typeof params.from === "string" ? params.from : ""}
                to={typeof params.to === "string" ? params.to : ""}
                options={[
                  { value: "all", label: "All time" },
                  { value: "today", label: "Today" },
                  { value: "last7", label: "Last 7 days" },
                  { value: "last30", label: "Last 30 days" },
                  { value: "thisMonth", label: "This month" },
                  { value: "lastMonth", label: "Last month" },
                  { value: "custom", label: "Custom range" },
                ]}
              />
            </FilterBar>
          }
        />
        {items.length === 0 ? (
          <EmptyState icon={<ArrowLeftRight className="h-5 w-5" />} message="No transactions found" description="Purchases, deposits and completed withdrawals will appear here." />
        ) : (
          <Table>
            <TableHeader>
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
                  <TableCell className="whitespace-nowrap font-medium text-slate-800">{t.type.replaceAll("_", " ")}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(toNumber(t.amount))}</TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate text-slate-500" title={t.description ?? undefined}>
                    {t.description ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate font-mono text-xs text-slate-400">{t.referenceId ?? "—"}</TableCell>
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
