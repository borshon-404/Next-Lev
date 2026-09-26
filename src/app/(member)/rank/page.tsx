import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireMemberPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target } from "lucide-react";
import { getRankMetrics } from "@/server/rank/rank-service";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "My Rank", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RankPage() {
  const user = await requireMemberPage();
  const [ranks, current, metrics] = await Promise.all([
    prisma.rank.findMany({ where: { isActive: true }, orderBy: { level: "asc" } }),
    prisma.userRank.findUnique({ where: { userId: user.id }, include: { rank: true } }),
    getRankMetrics(user.id),
  ]);
  if (ranks.length === 0) return null;

  const currentRank = current?.rank ?? ranks[0];
  const nextRank = ranks.find((r) => r.level > currentRank.level);
  return (
    <>
      <PageHeader title="My Rank" description="Rank requirements are configured by the administrator and never downgraded once achieved." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="p-8 text-center text-white" style={{ backgroundColor: currentRank.colorHex }}>
            <Trophy className="mx-auto h-10 w-10 opacity-90" />
            <h2 className="mt-3 text-2xl font-bold">{currentRank.name}</h2>
            <p className="mt-1 text-sm opacity-80">
              Achieved {current ? new Date(current.achievedAt).toLocaleDateString() : "—"}
            </p>
          </div>
          <CardBody>
            {nextRank ? (
              <>
                <p className="text-sm font-semibold text-slate-900">
                  Progress to <span style={{ color: nextRank.colorHex }}>{nextRank.name}</span>
                </p>
                <ul className="mt-4 space-y-4">
                  <Progress label="Direct referrals" have={metrics.directReferrals} need={nextRank.minDirectReferrals} />
                  <Progress label="Team members" have={metrics.teamMembers} need={nextRank.minTeamMembers} />
                  <Progress label="Personal volume" have={metrics.personalVolume} need={Number(nextRank.minPersonalVolume)} />
                  <Progress label="Team volume" have={metrics.teamVolume} need={Number(nextRank.minTeamVolume)} />
                </ul>
                {Number(nextRank.bonus) > 0 && (
                  <p className="mt-5 rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                    <Target className="mr-1 inline h-3.5 w-3.5" />
                    Rank bonus of <strong>{Number(nextRank.bonus).toFixed(2)}</strong> is credited when you qualify.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">
                You hold the highest configured rank. Outstanding work — enjoy the view! 🏆
              </p>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Rank ladder" description="All configured ranks and their requirements." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Rank</th>
                  <th className="px-5 py-3 text-right">Direct</th>
                  <th className="px-5 py-3 text-right">Team</th>
                  <th className="px-5 py-3 text-right">Personal vol.</th>
                  <th className="px-5 py-3 text-right">Team vol.</th>
                  <th className="px-5 py-3 text-right">Bonus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ranks.map((r) => {
                  const isCurrent = r.id === currentRank.id;
                  return (
                    <tr key={r.id} className={isCurrent ? "bg-indigo-50/50" : ""}>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-2.5 font-semibold text-slate-800">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: r.colorHex }} />
                          {r.name}
                          {isCurrent && <Badge tone="info">Current</Badge>}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-slate-600">{r.minDirectReferrals}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-slate-600">{r.minTeamMembers}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-slate-600">{formatNumber(Number(r.minPersonalVolume))}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-slate-600">{formatNumber(Number(r.minTeamVolume))}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-slate-600">
                        {Number(r.bonus) > 0 ? Number(r.bonus).toFixed(2) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="px-5 pb-4 pt-3 text-xs text-slate-400">
            Your current metrics: {metrics.directReferrals} direct · {metrics.teamMembers} team · {formatNumber(metrics.personalVolume)} personal vol. · {formatNumber(metrics.teamVolume)} team vol.
          </p>
        </Card>
      </div>
    </>
  );
}

const pct = (have: number, need: number) => (need <= 0 ? 100 : Math.min(100, Math.round((have / need) * 100)));

function Progress({ label, have, need }: { label: string; have: number; need: number }) {
  const p = pct(have, need);
  return (
    <li>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="tabular-nums text-slate-500">
          {formatNumber(have)} / {need <= 0 ? "any" : formatNumber(need)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${p}%` }} />
      </div>
    </li>
  );
}
