import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireMemberPage } from "@/server/auth/guards";
import { getTeamStats, getDirectReferrals } from "@/server/genealogy/genealogy-service";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { Users, UserPlus, Activity, UserX } from "lucide-react";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { ReferralLinkCard } from "@/components/members/referral-link-card";
import { ReferralsTable } from "@/components/members/referrals-table";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "My Team", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireMemberPage();
  const params = await searchParams;
  const [stats, me] = await Promise.all([
    getTeamStats(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { path: true } }),
  ]);
  const teamVolumeAgg = await prisma.packagePurchase.aggregate({
    where: {
      status: "COMPLETED",
      user: { path: { startsWith: me?.path ?? "none" }, id: { not: user.id } },
    },
    _sum: { amount: true },
  });

  const referrals = await getDirectReferrals(user.id, {
    search: typeof params.q === "string" ? params.q : undefined,
    status: (typeof params.status === "string" && (params.status as never)) || "ALL",
    page: Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1),
    pageSize: 10,
  });

  return (
    <>
      <PageHeader
        title="My Team"
        description="Your referrals, their activity, and team volume."
        actions={
          <Link href="/genealogy" className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800">
            View genealogy <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Direct referrals" value={stats.direct} icon={<UserPlus className="h-5 w-5" />} tone="info" />
        <StatCard label="Total team" value={stats.total} sub="All levels" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active members" value={stats.active} sub={`${stats.inactive} inactive`} icon={<Activity className="h-5 w-5" />} tone="success" />
        <StatCard label="Team volume" value={formatCurrency(Number(teamVolumeAgg._sum.amount) || 0)} sub="Completed purchases" icon={<UserX className="h-5 w-5" />} tone="warning" />
      </div>

      {/* Team by level */}
      <Card className="mt-4">
        <CardBody>
          <h3 className="text-sm font-semibold text-slate-900">Team by level</h3>
          {stats.byLevel.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No team members yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stats.byLevel.map((l) => (
                <div key={l.level} className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Level {l.level}</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{formatNumber(l.count)}</p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="mt-4">
        <ReferralLinkCard userId={user.id} />
      </div>

      <div className="mt-4">
        <ReferralsTable
          referrals={referrals}
          baseHref="/team"
          currentParams={{ q: typeof params.q === "string" ? params.q : "", status: typeof params.status === "string" ? params.status : "" }}
        />
      </div>
    </>
  );
}
