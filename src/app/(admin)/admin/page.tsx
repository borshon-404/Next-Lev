import type { Metadata } from "next";
import Link from "next/link";
import { Users, UserCheck, TrendingUp, Gift, Landmark, Banknote, Clock, ShieldAlert, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/card";
import { TrendChart, BarChart } from "@/components/charts/trend-chart";
import { getAdminDashboardStats } from "@/server/reports/report-service";
import { getMlmSettings } from "@/server/mlm/settings-service";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Admin Dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [stats, settings] = await Promise.all([getAdminDashboardStats(), getMlmSettings()]);

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        description="Platform overview — last 30 days for trend charts."
        actions={
          <Link href="/admin/reports">
            <Button variant="outline">
              Reports <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total members" value={stats.totalMembers} sub={`${stats.newMembersThisMonth} new this month`} icon={<Users className="h-5 w-5" />} tone="info" />
        <StatCard label="Active members" value={stats.activeMembers} icon={<UserCheck className="h-5 w-5" />} tone="success" />
        <StatCard label="Total sales (30d)" value={formatCurrency(stats.totalSales)} sub={`${stats.salesCount} purchases`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Total commissions" value={formatCurrency(stats.totalCommissions)} sub={`${formatCurrency(stats.pendingCommissions)} pending`} icon={<Gift className="h-5 w-5" />} tone="purple" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Pending KYC" value={stats.pendingKyc} icon={<ShieldAlert className="h-5 w-5" />} tone="warning" />
        <StatCard label="Pending withdrawals" value={stats.pendingWithdrawals} sub={formatCurrency(stats.pendingWithdrawalsAmount)} icon={<Clock className="h-5 w-5" />} tone="warning" />
        <StatCard label="Completed withdrawals" value={formatCurrency(stats.completedWithdrawalsAmount)} icon={<Landmark className="h-5 w-5" />} />
        <StatCard label="Total deposits" value={formatCurrency(stats.totalDeposits)} icon={<Banknote className="h-5 w-5" />} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Member registrations" description="Daily signups, last 30 days" />
          <CardBody>
            <BarChart data={stats.series.registrations.map((r) => ({ label: r.label, value: r.count }))} color="#6366f1" currency="count" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Sales" description="Completed package purchases, last 30 days" />
          <CardBody>
            <TrendChart data={stats.series.sales} color="#059669" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Commissions generated" description="Daily commission amounts, last 30 days" />
          <CardBody>
            <TrendChart data={stats.series.commissions} color="#7c3aed" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Withdrawals completed" description="Daily payout amounts, last 30 days" />
          <CardBody>
            <TrendChart data={stats.series.withdrawals} color="#d97706" />
          </CardBody>
        </Card>
      </div>

      {/* Quick queues */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <QuickQueueCard
          href="/admin/withdrawals"
          title="Withdrawal queue"
          count={stats.pendingWithdrawals}
          amount={stats.pendingWithdrawalsAmount}
          label="pending review"
          status="PENDING"
        />
        <QuickQueueCard
          href="/admin/kyc"
          title="KYC queue"
          count={stats.pendingKyc}
          label="awaiting decision"
          status="PENDING"
        />
        <Card>
          <CardHeader title="Platform health" />
          <CardBody className="space-y-2.5 text-sm">
            <HealthRow label="Commission engine" value={settings.commissionEnabled ? "Enabled" : "Disabled"} ok={settings.commissionEnabled} />
            <HealthRow label="Plan" value={`${settings.planType} · ${settings.rules.filter((r) => r.active).length} active levels`} ok />
            <HealthRow label="Auto-activation" value={settings.autoActivate ? "On registration" : "Manual"} ok={settings.autoActivate} />
            <HealthRow label="Withdrawal limits" value={`${settings.minWithdrawalNum.toFixed(2)}–${settings.maxWithdrawalNum.toFixed(2)} ${settings.currency}`} ok />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function QuickQueueCard({ href, title, count, amount, label, status }: { href: string; title: string; count: number; amount?: number; label: string; status: string }) {
  return (
    <Card className="flex flex-col justify-between">
      <CardBody className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <StatusBadge status={status} />
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">{count}</p>
        <p className="mt-1 text-xs text-slate-500">
          {label}
          {typeof amount === "number" && amount > 0 && ` · ${formatCurrency(amount)} held`}
        </p>
      </CardBody>
      <div className="px-5 pb-4">
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          Review now <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}

function HealthRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={["font-medium", ok ? "text-emerald-600" : "text-slate-600"].join(" ")}>
        {ok && "● "}
        {value}
      </span>
    </div>
  );
}
