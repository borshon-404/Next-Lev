import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";
import type { QualificationConfig } from "./settings-service";

/**
 * Qualification evaluation.
 *
 * Every rule is configurable (MlmSettings.qualification). This service answers:
 * "is this member currently qualified to receive commissions?" — used by the
 * commission engine before paying any level.
 */

export interface QualificationResult {
  qualified: boolean;
  reasons: string[];
}

export async function evaluateQualification(
  userId: string,
  config: QualificationConfig,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<QualificationResult> {
  const reasons: string[] = [];

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { status: true, path: true },
  });
  if (!user) return { qualified: false, reasons: ["Member not found."] };

  if (config.requireActiveMembership && user.status !== "ACTIVE") {
    reasons.push("Membership is not active.");
  }

  if (config.requireKyc) {
    const kyc = await db.kyc.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    });
    if (kyc?.status !== "APPROVED") reasons.push("KYC verification is not approved.");
  }

  if (config.requirePackage) {
    const purchases = await db.packagePurchase.count({
      where: { userId, status: "COMPLETED" },
    });
    if (purchases === 0) reasons.push("No active package purchase.");
  }

  if (config.minDirectReferrals > 0) {
    const directs = await db.user.count({ where: { sponsorId: userId } });
    if (directs < config.minDirectReferrals) {
      reasons.push(`Requires at least ${config.minDirectReferrals} direct referral(s).`);
    }
  }

  if (config.minPersonalVolume > 0) {
    const agg = await db.packagePurchase.aggregate({
      where: { userId, status: "COMPLETED" },
      _sum: { amount: true },
    });
    // Personal volume uses package PV; fall back to amount when PV is unset.
    const pvAgg = await db.packagePurchase.findMany({
      where: { userId, status: "COMPLETED" },
      select: { amount: true, package: { select: { pv: true } } },
    });
    const personalVolume = pvAgg.reduce(
      (sum, p) => sum + (toNumber(p.package.pv) > 0 ? toNumber(p.package.pv) : toNumber(p.amount)),
      0
    );
    if (personalVolume < config.minPersonalVolume && toNumber(agg._sum.amount) < config.minPersonalVolume) {
      reasons.push(`Requires personal volume of at least ${config.minPersonalVolume}.`);
    }
  }

  if (config.minTeamVolume > 0) {
    const teamPurchases = await db.packagePurchase.findMany({
      where: {
        status: "COMPLETED",
        user: { path: { startsWith: user.path }, id: { not: userId } },
      },
      select: { amount: true, package: { select: { pv: true } } },
    });
    const teamVolume = teamPurchases.reduce(
      (sum, p) => sum + (toNumber(p.package.pv) > 0 ? toNumber(p.package.pv) : toNumber(p.amount)),
      0
    );
    if (teamVolume < config.minTeamVolume) {
      reasons.push(`Requires team volume of at least ${config.minTeamVolume}.`);
    }
  }

  if (config.minMonthlySales > 0) {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const agg = await db.packagePurchase.aggregate({
      where: { userId, status: "COMPLETED", createdAt: { gte: since } },
      _sum: { amount: true },
    });
    if (toNumber(agg._sum.amount) < config.minMonthlySales) {
      reasons.push(`Requires monthly sales of at least ${config.minMonthlySales}.`);
    }
  }

  return { qualified: reasons.length === 0, reasons };
}
