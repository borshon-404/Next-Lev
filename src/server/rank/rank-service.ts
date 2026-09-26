import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";
import { applyLedger, withTransaction } from "../wallet/wallet-service";
import { createNotification } from "../notifications/notification-service";

/**
 * Rank service — ranks and their requirements are fully database-driven
 * (Rank table). Members are promoted when they meet ALL minimums of a higher
 * rank; ranks are never downgraded. A one-time bonus (configured per rank)
 * is credited through the wallet ledger on promotion.
 */

export interface RankMetrics {
  directReferrals: number;
  teamMembers: number;
  personalVolume: number;
  teamVolume: number;
}

async function volumeOf(purchases: { amount: Prisma.Decimal; package: { pv: Prisma.Decimal } }[]): Promise<number> {
  return purchases.reduce(
    (sum, p) => sum + (toNumber(p.package.pv) > 0 ? toNumber(p.package.pv) : toNumber(p.amount)),
    0
  );
}

export async function getRankMetrics(userId: string): Promise<RankMetrics> {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { path: true } });
  if (!me) return { directReferrals: 0, teamMembers: 0, personalVolume: 0, teamVolume: 0 };

  const [directReferrals, teamMembers, myPurchases, teamPurchases] = await Promise.all([
    prisma.user.count({ where: { sponsorId: userId } }),
    prisma.user.count({ where: { path: { startsWith: me.path }, id: { not: userId } } }),
    prisma.packagePurchase.findMany({
      where: { userId, status: "COMPLETED" },
      select: { amount: true, package: { select: { pv: true } } },
    }),
    prisma.packagePurchase.findMany({
      where: { status: "COMPLETED", user: { path: { startsWith: me.path }, id: { not: userId } } },
      select: { amount: true, package: { select: { pv: true } } },
    }),
  ]);

  return {
    directReferrals,
    teamMembers,
    personalVolume: await volumeOf(myPurchases),
    teamVolume: await volumeOf(teamPurchases),
  };
}

export function meetsRank(
  rank: {
    minDirectReferrals: number;
    minTeamMembers: number;
    minPersonalVolume: Prisma.Decimal;
    minTeamVolume: Prisma.Decimal;
  },
  metrics: RankMetrics
): boolean {
  return (
    metrics.directReferrals >= rank.minDirectReferrals &&
    metrics.teamMembers >= rank.minTeamMembers &&
    metrics.personalVolume >= toNumber(rank.minPersonalVolume) &&
    metrics.teamVolume >= toNumber(rank.minTeamVolume)
  );
}

export interface RankEvaluationResult {
  changed: boolean;
  newRankName?: string;
}

/**
 * Evaluates a member against all active ranks (highest first) and promotes
 * when a strictly better rank is achieved.
 */
export async function evaluateUserRank(
  userId: string,
  opts: { awardBonus?: boolean } = {}
): Promise<RankEvaluationResult> {
  const { awardBonus = true } = opts;

  const [ranks, current, metrics] = await Promise.all([
    prisma.rank.findMany({ where: { isActive: true }, orderBy: { level: "desc" } }),
    prisma.userRank.findUnique({ where: { userId }, include: { rank: true } }),
    getRankMetrics(userId),
  ]);
  if (ranks.length === 0) return { changed: false };

  const eligible = ranks.find((r) => meetsRank(r, metrics));
  if (!eligible) return { changed: false };

  if (current && current.rank.level >= eligible.level) return { changed: false };

  return withTransaction(async (tx) => {
    await tx.userRank.upsert({
      where: { userId },
      create: { userId, rankId: eligible.id },
      update: { rankId: eligible.id, achievedAt: new Date() },
    });

    const bonus = toNumber(eligible.bonus);
    if (awardBonus && bonus > 0) {
      await applyLedger(tx, userId, {
        type: "BONUS",
        balanceType: "AVAILABLE",
        amount: bonus,
        description: `Rank achievement bonus — ${eligible.name}`,
        idempotencyKey: `rank-bonus:${userId}:${eligible.level}`,
      });
    }

    await createNotification(tx, userId, {
      type: "RANK_ACHIEVED",
      title: `Congratulations — you reached ${eligible.name}!`,
      body:
        bonus > 0
          ? `A rank bonus of ${bonus.toFixed(2)} has been credited to your wallet.`
          : "Your new rank is now visible on your profile.",
      link: "/rank",
    });

    return { changed: true, newRankName: eligible.name };
  });
}
