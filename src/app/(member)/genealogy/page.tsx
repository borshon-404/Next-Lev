import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireMemberPage } from "@/server/auth/guards";
import { getUserNode, getSubtree, getTeamStats } from "@/server/genealogy/genealogy-service";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { Users, UserPlus, Network } from "lucide-react";
import { toNumber } from "@/lib/format";
import { GenealogyTree, type TreeMember } from "@/components/members/genealogy-tree";

export const metadata: Metadata = { title: "Genealogy", robots: { index: false } };
export const dynamic = "force-dynamic";

const MAX_TREE_DEPTH = 5;

export default async function GenealogyPage() {
  const user = await requireMemberPage();
  const [self, subtree, stats] = await Promise.all([
    getUserNode(user.id),
    getSubtree(user.id, { maxDepth: MAX_TREE_DEPTH, limit: 800 }),
    getTeamStats(user.id),
  ]);
  if (!self) return null;

  // Enrich nodes with wallet/rank/package for the detail dialog.
  const ids = subtree.map((m) => m.id);
  const [wallets, ranks] = await Promise.all([
    ids.length
      ? prisma.wallet.findMany({ where: { userId: { in: ids } }, select: { userId: true, availableBalance: true } })
      : [],
    ids.length
      ? prisma.userRank.findMany({
          where: { userId: { in: ids } },
          select: { userId: true, rank: { select: { name: true } } },
        })
      : [],
  ]);
  const walletMap = new Map(wallets.map((w) => [w.userId, toNumber(w.availableBalance)]));
  const rankMap = new Map(ranks.map((r) => [r.userId, r.rank.name]));

  const meRank = await prisma.userRank.findUnique({ where: { userId: user.id }, select: { rank: { select: { name: true } } } });
  const mePackage = await prisma.packagePurchase.findFirst({
    where: { userId: user.id, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    select: { package: { select: { name: true } } },
  });

  const selfNode: TreeMember = {
    id: self.id,
    name: self.name,
    username: self.username,
    email: self.email,
    image: self.image,
    status: self.status,
    referralCode: self.referralCode,
    depth: self.depth,
    sponsorId: self.sponsorId,
    directReferralCount: self.directReferralCount,
    joinedAt: self.joinedAt.toISOString(),
    walletAvailable: walletMap.get(self.id),
    rankName: meRank?.rank.name ?? null,
    package: mePackage?.package.name ?? null,
  };

  const treeMembers: TreeMember[] = subtree.map((m) => ({
    ...m,
    joinedAt: m.joinedAt.toISOString(),
    walletAvailable: walletMap.get(m.id),
    rankName: rankMap.get(m.id) ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Genealogy"
        description={`Your team tree (${stats.total} members across all levels). Showing up to ${MAX_TREE_DEPTH} levels below you.`}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label="Direct referrals" value={stats.direct} icon={<UserPlus className="h-5 w-5" />} tone="info" />
        <StatCard label="Total team" value={stats.total} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active team" value={stats.active} sub={`${stats.inactive} inactive`} icon={<Network className="h-5 w-5" />} tone="success" />
      </div>

      <Card>
        <CardBody>
          <GenealogyTree self={selfNode} members={treeMembers} depthLabel="level below you" />
        </CardBody>
      </Card>
    </>
  );
}
