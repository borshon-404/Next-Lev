import type { Metadata } from "next";
import { requireMemberPage } from "@/server/auth/guards";
import { getTeamStats, getDirectReferrals } from "@/server/genealogy/genealogy-service";
import { PageHeader } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/card";
import { UserPlus, Users, Activity } from "lucide-react";
import { ReferralLinkCard } from "@/components/members/referral-link-card";
import { ReferralsTable } from "@/components/members/referrals-table";

export const metadata: Metadata = { title: "Referrals", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireMemberPage();
  const params = await searchParams;
  const [stats, referrals] = await Promise.all([
    getTeamStats(user.id),
    getDirectReferrals(user.id, {
      search: typeof params.q === "string" ? params.q : undefined,
      status: (typeof params.status === "string" && (params.status as never)) || "ALL",
      page: Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1),
      pageSize: 10,
    }),
  ]);

  return (
    <>
      <PageHeader title="Referrals" description="Everyone who joined with your link, and the stats behind them." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Direct referrals" value={stats.direct} icon={<UserPlus className="h-5 w-5" />} tone="info" />
        <StatCard label="Total team" value={stats.total} sub="Across all levels" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active referrals" value={stats.active} sub="In your whole team" icon={<Activity className="h-5 w-5" />} tone="success" />
        <StatCard label="Inactive referrals" value={stats.inactive} sub="Pending / inactive / suspended" icon={<Activity className="h-5 w-5" />} tone="warning" />
      </div>

      <div className="mt-4">
        <ReferralLinkCard userId={user.id} />
      </div>

      <div className="mt-4">
        <ReferralsTable
          referrals={referrals}
          baseHref="/referrals"
          currentParams={{
            q: typeof params.q === "string" ? params.q : "",
            status: typeof params.status === "string" ? params.status : "",
          }}
        />
      </div>
    </>
  );
}
