import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Trophy, Pencil, Plus } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { RankDialog } from "./rank-dialog";

export const metadata: Metadata = { title: "Ranks", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminRanksPage() {
  await requireAdminPage();
  const ranks = await prisma.rank.findMany({
    orderBy: { level: "asc" },
    include: { _count: { select: { holders: true } } },
  });

  return (
    <>
      <PageHeader
        title="Ranks"
        description="Configure the rank ladder. Members are promoted automatically when they meet all minimums of a higher rank; ranks are never downgraded."
        actions={
          <RankDialog
            triggerLabel="+ New rank"
            initial={null}
          />
        }
      />

      {ranks.length === 0 ? (
        <Card>
          <EmptyState icon={<Trophy className="h-5 w-5" />} message="No ranks configured" description="Create your first rank (e.g. Member with all-zero requirements) to start the ladder." />
        </Card>
      ) : (
        <div className="space-y-4">
          {ranks.map((r) => (
            <Card key={r.id}>
              <CardBody className="flex flex-wrap items-center gap-x-8 gap-y-4 py-5">
                <div className="flex w-40 items-center gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: r.colorHex }}
                  >
                    <Trophy className="h-5.5 w-5.5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{r.name}</p>
                    <p className="text-xs text-slate-400">Level {r.level}</p>
                  </div>
                </div>
                <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4 lg:grid-cols-5">
                  <Metric label="Min direct referrals" value={String(r.minDirectReferrals)} />
                  <Metric label="Min team members" value={String(r.minTeamMembers)} />
                  <Metric label="Min personal volume" value={formatNumber(Number(r.minPersonalVolume))} />
                  <Metric label="Min team volume" value={formatNumber(Number(r.minTeamVolume))} />
                  <Metric label="Rank bonus" value={Number(r.bonus) > 0 ? Number(r.bonus).toFixed(2) : "—"} />
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.isActive ? "ACTIVE" : "INACTIVE"} />
                  <Badge tone="default">{r._count.holders} members</Badge>
                  <RankDialog
                    triggerLabel="Edit"
                    initial={{
                      rankId: r.id,
                      name: r.name,
                      level: r.level,
                      minDirectReferrals: r.minDirectReferrals,
                      minTeamMembers: r.minTeamMembers,
                      minPersonalVolume: Number(r.minPersonalVolume),
                      minTeamVolume: Number(r.minTeamVolume),
                      bonus: Number(r.bonus),
                      colorHex: r.colorHex,
                      isActive: r.isActive,
                    }}
                  />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-800 tabular-nums">{value}</p>
    </div>
  );
}
