import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireMemberPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { Wallet, Clock, TrendingUp, Landmark, Gift, Banknote, ArrowRight } from "lucide-react";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Wallet", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireMemberPage();
  const params = await searchParams;
  const type = typeof params.type === "string" && params.type !== "ALL" ? (params.type as string) : undefined;
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1);

  const where = type ? { userId: user.id, type: type as never } : { userId: user.id };

  const [wallet, ledgers, total] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: user.id } }),
    prisma.walletLedger.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.walletLedger.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ type: type ?? "", ...patch })) if (v) p.set(k, v);
    const qs = p.toString();
    return `/wallet${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Wallet"
        description="Your balances and the full ledger behind every cent."
        actions={
          <Link href="/withdrawals">
            <Button>
              Request withdrawal <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label="Available balance" value={formatCurrency(toNumber(wallet?.availableBalance))} sub="Ready to withdraw" icon={<Wallet className="h-5 w-5" />} tone="success" />
        <StatCard label="Pending balance" value={formatCurrency(toNumber(wallet?.pendingBalance))} sub="Awaiting approval" icon={<Clock className="h-5 w-5" />} tone="warning" />
        <StatCard label="Total earned" value={formatCurrency(toNumber(wallet?.totalEarned))} icon={<TrendingUp className="h-5 w-5" />} tone="info" />
        <StatCard label="Total commissions" value={formatCurrency(toNumber(wallet?.totalCommissions))} icon={<Gift className="h-5 w-5" />} />
        <StatCard label="Total deposits" value={formatCurrency(toNumber(wallet?.totalDeposited))} icon={<Banknote className="h-5 w-5" />} />
        <StatCard label="Total withdrawn" value={formatCurrency(toNumber(wallet?.totalWithdrawn))} icon={<Landmark className="h-5 w-5" />} />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Wallet ledger"
          description="Immutable record of every balance change — previous and new balance included."
          action={
            <FilterBar searchHref={() => buildHref({ page: "1" })}>
              <FilterSelect
                name="type"
                value={type ?? "ALL"}
                options={[
                  { value: "ALL", label: "All types" },
                  { value: "COMMISSION", label: "Commission" },
                  { value: "BONUS", label: "Bonus" },
                  { value: "DEPOSIT", label: "Deposit" },
                  { value: "WITHDRAWAL", label: "Withdrawal" },
                  { value: "WITHDRAWAL_FEE", label: "Withdrawal fee" },
                  { value: "REFUND", label: "Refund" },
                  { value: "REVERSAL", label: "Reversal" },
                  { value: "ADJUSTMENT", label: "Adjustment" },
                ]}
              />
            </FilterBar>
          }
        />
        {ledgers.length === 0 ? (
          <EmptyState message="No wallet activity yet" description="Every credit and debit will be recorded here with full balance traceability." />
        ) : (
          <Table>
            <TableHeader>
              <TableHead>Type</TableHead>
              <TableHead>Bucket</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Balance after</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
            </TableHeader>
            <TableBody>
              {ledgers.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap font-medium text-slate-800">{l.type.replaceAll("_", " ")}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-semibold uppercase ${l.balanceType === "AVAILABLE" ? "text-slate-500" : "text-amber-600"}`}>
                      {l.balanceType.toLowerCase()}
                    </span>
                  </TableCell>
                  <TableCell className={`text-right font-semibold tabular-nums ${toNumber(l.amount) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {toNumber(l.amount) >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(toNumber(l.amount)))}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-slate-500 sm:table-cell">
                    {formatCurrency(toNumber(l.previousBalance))} → {formatCurrency(toNumber(l.newBalance))}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-slate-500" title={l.description}>
                    {l.description}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-500">{formatDateTime(l.createdAt)}</TableCell>
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
