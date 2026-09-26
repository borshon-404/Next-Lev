import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { evaluateUserRank, getRankMetrics } from "@/server/rank/rank-service";
import { withTransaction, applyLedger } from "@/server/wallet/wallet-service";
import { wipeAll, seedSettings, seedRules, makeUser, makePackage, completePurchase, getWallet } from "./helpers";

beforeAll(async () => {
  await wipeAll();
});

beforeEach(async () => {
  await wipeAll();
  await seedSettings();
});

async function seedRanks() {
  await prisma.rank.createMany({
    data: [
      { name: "Member", level: 1, minDirectReferrals: 0, minTeamMembers: 0, minPersonalVolume: 0, minTeamVolume: 0, bonus: 0, colorHex: "#64748b" },
      { name: "Bronze", level: 2, minDirectReferrals: 1, minTeamMembers: 1, minPersonalVolume: 25, minTeamVolume: 0, bonus: 5, colorHex: "#b45309" },
      { name: "Silver", level: 3, minDirectReferrals: 2, minTeamMembers: 3, minPersonalVolume: 50, minTeamVolume: 50, bonus: 15, colorHex: "#64748b" },
    ],
  });
}

describe("rank system (database-driven)", () => {
  it("computes metrics from real data", async () => {
    const sponsor = await makeUser({ name: "Sponsor" });
    const direct = await makeUser({ name: "Direct", sponsor });
    const team = await makeUser({ name: "Team", sponsor: direct });
    const pkg = await makePackage(100);
    await completePurchase(direct, pkg, 100);

    const metrics = await getRankMetrics(sponsor.id);
    expect(metrics.directReferrals).toBe(1);
    expect(metrics.teamMembers).toBe(2);
    expect(metrics.personalVolume).toBe(0);
    expect(metrics.teamVolume).toBe(100);
    expect(team).toBeTruthy();
  });

  it("promotes when all minimums are met and credits the configured bonus", async () => {
    await seedRanks();
    const member = await makeUser({ name: "Climber" });
    // Member rank assigned initially (no bonus).
    const initial = await evaluateUserRank(member.id, { awardBonus: false });
    expect(initial.changed).toBe(true);
    expect(initial.newRankName).toBe("Member");
    expect((await getWallet(member.id)).available).toBe(0);

    // Add 1 direct referral + personal volume 25 → qualifies for Bronze.
    const pkg = await makePackage(25);
    await completePurchase(member, pkg, 25);
    await makeUser({ name: "Referral", sponsor: member });

    const result = await evaluateUserRank(member.id);
    expect(result.changed).toBe(true);
    expect(result.newRankName).toBe("Bronze");
    expect((await getWallet(member.id)).available).toBe(5); // bonus

    const rank = await prisma.userRank.findUnique({ where: { userId: member.id }, include: { rank: true } });
    expect(rank?.rank.name).toBe("Bronze");

    // Notification sent.
    const note = await prisma.notification.findFirst({ where: { userId: member.id, type: "RANK_ACHIEVED" } });
    expect(note).toBeTruthy();
  });

  it("never downgrades a rank", async () => {
    await seedRanks();
    const member = await makeUser({ name: "Holder" });
    const referral = await makeUser({ name: "Referral", sponsor: member });
    await evaluateUserRank(member.id);
    const before = await prisma.userRank.findUnique({ where: { userId: member.id } });
    expect(before?.rankId).toBeTruthy();

    // Referral suspends — metrics drop, but the rank must stay.
    await prisma.user.update({
      where: { id: referral.id },
      data: { status: "SUSPENDED" },
    });
    const afterEval = await evaluateUserRank(member.id);
    expect(afterEval.changed).toBe(false);
    const after = await prisma.userRank.findUnique({ where: { userId: member.id } });
    expect(after?.rankId).toBe(before?.rankId);
  });

  it("only upgrades to strictly higher ranks (no re-award of the same rank bonus)", async () => {
    await seedRanks();
    const member = await makeUser({ name: "Same" });
    await makeUser({ name: "R1", sponsor: member });
    await evaluateUserRank(member.id); // no purchase → personal volume 0 → Bronze not yet met
    let rank = await prisma.userRank.findUnique({ where: { userId: member.id }, include: { rank: true } });
    expect(rank?.rank?.name ?? "Member").toBe("Member");

    const pkg = await makePackage(25);
    await completePurchase(member, pkg, 25);
    await evaluateUserRank(member.id);
    rank = await prisma.userRank.findUnique({ where: { userId: member.id }, include: { rank: true } });
    expect(rank?.rank?.name).toBe("Bronze");

    // Evaluate again — no duplicate bonus.
    await evaluateUserRank(member.id);
    const wallet = await getWallet(member.id);
    expect(wallet.available).toBe(5); // bonus credited exactly once
  });

  it("ranks and requirements can be reconfigured in the database", async () => {
    await seedRanks();
    const member = await makeUser({ name: "Config" });
    await makeUser({ name: "R1", sponsor: member });
    await makeUser({ name: "R2", sponsor: member });

    // Relax Bronze to 2 direct referrals, 0 everything.
    await prisma.rank.update({
      where: { name: "Bronze" },
      data: { minDirectReferrals: 2, minTeamMembers: 0, minPersonalVolume: new Prisma.Decimal(0), minTeamVolume: new Prisma.Decimal(0) },
    });
    const result = await evaluateUserRank(member.id);
    expect(result.newRankName).toBe("Bronze");
  });

  it("commission qualification is independent of rank (engine still works)", async () => {
    await seedRanks();
    await seedRules([{ level: 1, percentage: 10 }]);
    const { processCommissionsForTransaction } = await import("@/server/commission/commission-service");
    const sponsor = await makeUser({ name: "S" });
    const buyer = await makeUser({ name: "B", sponsor });
    const pkg = await makePackage(100);
    const { transactionId } = await completePurchase(buyer, pkg, 100);
    const result = await processCommissionsForTransaction(transactionId);
    expect(result.created).toHaveLength(1);
    expect(result.created[0].amount).toBe(10);
  });
});
