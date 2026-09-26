import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/server/auth/guards";
import { searchMembers, getSubtree, getTeamStats } from "@/server/genealogy/genealogy-service";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { Users, Network } from "lucide-react";
import { GenealogyTree, type TreeMember } from "@/components/members/genealogy-tree";
import { toNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Genealogy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminGenealogyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const matches = q.length >= 2 ? await searchMembers(q, 8) : [];
  let focus: TreeMember | null = null;
  let members: TreeMember[] = [];
  let stats: { direct: number; total: number; active: number; inactive: number } | null = null;

  if (matches.length === 1) {
    const self = matches[0];
    const [subtree, teamStats] = await Promise.all([getSubtree(self.id, { maxDepth: 4, limit: 400 }), getTeamStats(self.id)]);
    const ids = subtree.map((m) => m.id);
    const [wallets, ranks] = await Promise.all([
      ids.length ? prisma.wallet.findMany({ where: { userId: { in: ids } }, select: { userId: true, availableBalance: true } }) : [],
      ids.length
        ? prisma.userRank.findMany({ where: { userId: { in: ids } }, select: { userId: true, rank: { select: { name: true } } } })
        : [],
    ]);
    const walletMap = new Map(wallets.map((w) => [w.userId, toNumber(w.availableBalance)]));
    const rankMap = new Map(ranks.map((r) => [r.userId, r.rank.name]));
    focus = { ...self, joinedAt: self.joinedAt.toISOString(), walletAvailable: walletMap.get(self.id) };
    members = subtree.map((m) => ({
      ...m,
      joinedAt: m.joinedAt.toISOString(),
      walletAvailable: walletMap.get(m.id),
      rankName: rankMap.get(m.id) ?? null,
    }));
    stats = teamStats;
  }

  return (
    <>
      <PageHeader title="Genealogy" description="Search any member to open their genealogy tree and team statistics." />

      <form method="GET" action="/admin/genealogy" className="mb-5 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name, username, email or referral code…"
          className="h-11 w-full max-w-md rounded-xl border border-slate-300 bg-white px-4 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
        <button type="submit" className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800">
          Find member
        </button>
      </form>

      {q.length >= 2 && matches.length === 0 && (
        <Card>
          <CardBody className="py-10 text-center text-sm text-slate-500">No members match “{q}”.</CardBody>
        </Card>
      )}

      {matches.length > 1 && (
        <Card>
          <CardBody>
            <p className="text-sm font-medium text-slate-700">Multiple members match — narrow your search:</p>
            <ul className="mt-3 divide-y divide-slate-100">
              {matches.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-slate-700">
                    {m.name} <span className="text-slate-400">@{m.username}</span> · {m.email}
                  </span>
                  <a href={`/admin/genealogy?q=${encodeURIComponent(m.username)}`} className="font-semibold text-indigo-600 hover:text-indigo-700">
                    Open tree
                  </a>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {focus && stats && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
            <StatCard label="Direct referrals" value={stats.direct} icon={<Users className="h-5 w-5" />} tone="info" />
            <StatCard label="Total team" value={stats.total} icon={<Network className="h-5 w-5" />} />
            <StatCard label="Active team" value={stats.active} sub={`${stats.inactive} inactive`} />
          </div>
          <Card>
            <CardBody>
              <GenealogyTree self={focus} members={members} depthLabel="level below" />
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}
