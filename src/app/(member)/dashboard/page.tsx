import type { Metadata } from "next";
import Link from "next/link";
import {
  Wallet,
  Clock,
  TrendingUp,
  Users,
  Network,
  Package,
  Trophy,
  ArrowRight,
  Copy,
  Share2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireMemberPage } from "@/server/auth/guards";
import { getMemberDashboardData } from "@/server/reports/report-service";
import { getTeamStats } from "@/server/genealogy/genealogy-service";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { TrendChart, BarChart } from "@/components/charts/trend-chart";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { ReferralLinkCard } from "@/components/members/referral-link-card";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MemberDashboardPage() {
  const user = await requireMemberPage();
  const [data, team] = await Promise.all([getMemberDashboardData(user.id), getTeamStats(user.id)]);
  const wallet = data.wallet;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]} 👋`}
        description="Here is what's happening with your network and earnings."
        actions={<StatusBadge status={user.status} />}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Available balance" value={formatCurrency(wallet?.available ?? 0)} sub="Ready to withdraw" icon={<Wallet className="h-5 w-5" />} tone="success" />
        <StatCard label="Pending balance" value={formatCurrency(wallet?.pending ?? 0)} sub="Awaiting approval" icon={<Clock className="h-5 w-5" />} tone="warning" />
        <StatCard label="This month's earnings" value={formatCurrency(data.totals.monthlyEarnings)} sub="All commission states" icon={<TrendingUp className="h-5 w-5" />} tone="info" />
        <StatCard label="Total team" value={team.total} sub={`${team.direct} direct · ${team.active} active`} icon={<Network className="h-5 w-5" />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/packages" className="group">
          <Card className="h-full p-4 transition-shadow group-hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current package</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                  {data.currentPackage ? `${data.currentPackage.name} · ${formatCurrency(data.currentPackage.price, data.currentPackage.currency)}` : "None yet"}
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/rank" className="group">
          <Card className="h-full p-4 transition-shadow group-hover:shadow-md">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: data.currentRank?.colorHex ?? "#64748b" }}
              >
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current rank</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{data.currentRank?.name ?? "Member"}</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/commissions" className="group">
          <Card className="h-full p-4 transition-shadow group-hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Commissions</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                  {formatCurrency(data.totals.pendingCommissions + data.totals.approvedCommissions + data.totals.paidCommissions)} total
                </p>
                <p className="text-xs text-slate-400">
                  {formatCurrency(data.totals.pendingCommissions)} pending
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/team" className="group">
          <Card className="h-full p-4 transition-shadow group-hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Direct referrals</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{data.totals.directReferrals}</p>
                <p className="text-xs text-slate-400">{team.total} total team</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Referral link */}
      <div className="mt-4">
        <ReferralLinkCard userId={user.id} />
      </div>

      {/* Charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Earnings over time" description="Commissions credited (all states), last 6 months" />
          <CardBody>
            <TrendChart data={data.series.monthlyEarnings} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Commission distribution" description="Total earned by level" />
          <CardBody>
            {data.series.commissionByLevel.length > 0 ? (
              <BarChart data={data.series.commissionByLevel.map((p) => ({ label: p.level, value: p.value }))} color="#7c3aed" />
            ) : (
              <EmptyState message="No commissions yet" description="Commissions appear here once your downline makes qualifying purchases." />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Team growth"
            description="Total team size, last 6 months"
            action={
              <Link href="/team" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                My team <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardBody>
            <TrendChart data={data.series.teamGrowth} color="#059669" currency="count" />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent wallet activity"
            action={
              <Link href="/transactions" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                All transactions <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {data.recentLedger.length === 0 ? (
            <EmptyState message="No activity yet" description="Wallet movements will appear here as they happen." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentLedger.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${l.amount >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                    {l.amount >= 0 ? "↓" : "↑"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700">{l.description}</p>
                    <p className="text-xs text-slate-400">
                      {l.type.toLowerCase().replaceAll("_", " ")} · {l.balanceType.toLowerCase()} · {formatDateTime(l.createdAt)}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${l.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {l.amount >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(l.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
