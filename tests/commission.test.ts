import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { processCommissionsForTransaction } from "@/server/commission/commission-service";
import {
  wipeAll,
  seedSettings,
  seedRules,
  makeUser,
  makePackage,
  completePurchase,
  getWallet,
  getCommissions,
} from "./helpers";

beforeAll(async () => {
  await wipeAll();
});

beforeEach(async () => {
  await wipeAll();
  await seedSettings();
});

describe("commission engine — unilevel payout", () => {
  it("pays configured levels from a $100 purchase (10 / 5 / 3)", async () => {
    await seedRules([
      { level: 1, percentage: 10 },
      { level: 2, percentage: 5 },
      { level: 3, percentage: 3 },
    ]);
    const root = await makeUser({ name: "Root" });
    const level2 = await makeUser({ name: "Level2", sponsor: root });
    const level1 = await makeUser({ name: "Level1", sponsor: level2 });
    const buyer = await makeUser({ name: "Buyer", sponsor: level1 });

    const pkg = await makePackage(100);
    const { transactionId } = await completePurchase(buyer, pkg, 100);

    const result = await processCommissionsForTransaction(transactionId);

    expect(result.processed).toBe(true);
    expect(result.created).toHaveLength(3);
    // Level 1 → 10, Level 2 → 5, Level 3 → 3
    expect(result.created[0]).toMatchObject({ level: 1, percentage: 10, amount: 10, beneficiaryId: level1.id });
    expect(result.created[1]).toMatchObject({ level: 2, percentage: 5, amount: 5, beneficiaryId: level2.id });
    expect(result.created[2]).toMatchObject({ level: 3, percentage: 3, amount: 3, beneficiaryId: root.id });

    // Wallets reflect the credits (auto-approve → available bucket).
    expect((await getWallet(level1.id)).available).toBeCloseTo(10);
    expect((await getWallet(level2.id)).available).toBeCloseTo(5);
    expect((await getWallet(root.id)).available).toBeCloseTo(3);
  });

  it("respects the configured level count (no payout beyond configured levels)", async () => {
    await seedRules([{ level: 1, percentage: 10 }, { level: 2, percentage: 4 }]);
    const great = await makeUser({ name: "Great" });
    const grand = await makeUser({ name: "Grand", sponsor: great });
    const parent = await makeUser({ name: "Parent", sponsor: grand });
    const buyer = await makeUser({ name: "Buyer", sponsor: parent });

    const pkg = await makePackage(100);
    const { transactionId } = await completePurchase(buyer, pkg, 100);
    const result = await processCommissionsForTransaction(transactionId);

    expect(result.created).toHaveLength(2);
    expect((await getWallet(parent.id)).available).toBeCloseTo(10);
    expect((await getWallet(grand.id)).available).toBeCloseTo(4);
    expect((await getWallet(great.id)).available).toBeCloseTo(0);
  });

  it("stops at the top of the tree without error (missing sponsor)", async () => {
    await seedRules([{ level: 1, percentage: 10 }, { level: 2, percentage: 5 }]);
    const sponsor = await makeUser({ name: "Sponsor" });
    const buyer = await makeUser({ name: "Buyer", sponsor: sponsor });

    const pkg = await makePackage(100);
    const { transactionId } = await completePurchase(buyer, pkg, 100);
    const result = await processCommissionsForTransaction(transactionId);

    expect(result.processed).toBe(true);
    expect(result.created).toHaveLength(1);
    expect((await getWallet(sponsor.id)).available).toBeCloseTo(10);
  });

  it("creates no commissions when the buyer has no sponsor", async () => {
    await seedRules([{ level: 1, percentage: 10 }]);
    const buyer = await makeUser({ name: "Lone Buyer" });

    const pkg = await makePackage(100);
    const { transactionId } = await completePurchase(buyer, pkg, 100);
    const result = await processCommissionsForTransaction(transactionId);

    expect(result.processed).toBe(true);
    expect(result.created).toHaveLength(0);
    expect(await getCommissions()).toHaveLength(0);
  });

  it("skips inactive beneficiaries but continues up the chain", async () => {
    await seedRules([
      { level: 1, percentage: 10 },
      { level: 2, percentage: 5 },
    ]);
    const grand = await makeUser({ name: "Grand" });
    const parent = await makeUser({ name: "Parent (suspended)", sponsor: grand, status: "SUSPENDED" });
    const buyer = await makeUser({ name: "Buyer", sponsor: parent });

    const pkg = await makePackage(100);
    const { transactionId } = await completePurchase(buyer, pkg, 100);
    const result = await processCommissionsForTransaction(transactionId);

    expect(result.created).toHaveLength(1);
    expect(result.created[0].beneficiaryId).toBe(grand.id);
    expect(result.created[0].amount).toBe(5);
    expect(result.skipped.some((s) => s.userId === parent.id)).toBe(true);
    expect((await getWallet(parent.id)).available).toBeCloseTo(0);
  });

  it("skips unqualified beneficiaries (KYC requirement) but continues up the chain", async () => {
    await seedSettings({
      qualification: {
        requireActiveMembership: true,
        requireKyc: true,
        requirePackage: false,
        minDirectReferrals: 0,
        minPersonalVolume: 0,
        minTeamVolume: 0,
        minMonthlySales: 0,
      },
    });
    await seedRules([
      { level: 1, percentage: 10 },
      { level: 2, percentage: 5 },
    ]);
    const grand = await makeUser({ name: "Grand" });
    await prisma.kyc.create({
      data: { userId: grand.id, fullName: "Grand", documentType: "NID", documentNumber: "K123", documentKey: "k", status: "APPROVED" },
    });
    const parent = await makeUser({ name: "Parent (no KYC)", sponsor: grand });
    const buyer = await makeUser({ name: "Buyer", sponsor: parent });

    const pkg = await makePackage(100);
    const { transactionId } = await completePurchase(buyer, pkg, 100);
    const result = await processCommissionsForTransaction(transactionId);

    expect(result.created).toHaveLength(1);
    expect(result.created[0].beneficiaryId).toBe(grand.id);
    expect(result.skipped.some((s) => s.userId === parent.id && /KYC/.test(s.reason))).toBe(true);
  });

  it("enforces the package qualification rule", async () => {
    await seedSettings({
      qualification: {
        requireActiveMembership: true,
        requireKyc: false,
        requirePackage: true,
        minDirectReferrals: 0,
        minPersonalVolume: 0,
        minTeamVolume: 0,
        minMonthlySales: 0,
      },
    });
    await seedRules([{ level: 1, percentage: 10 }]);
    const sponsorNoPackage = await makeUser({ name: "Sponsor (no package)" });
    const buyer = await makeUser({ name: "Buyer", sponsor: sponsorNoPackage });

    const pkg = await makePackage(100);
    const { transactionId } = await completePurchase(buyer, pkg, 100);
    const result = await processCommissionsForTransaction(transactionId);

    expect(result.created).toHaveLength(0);
    expect((await getWallet(sponsorNoPackage.id)).available).toBeCloseTo(0);

    // After the sponsor buys a package, the next purchase pays them.
    const pkg2 = await makePackage(50);
    await completePurchase(sponsorNoPackage, pkg2, 50);
    const { transactionId: tx2 } = await completePurchase(buyer, pkg, 100);
    const result2 = await processCommissionsForTransaction(tx2);
    expect(result2.created).toHaveLength(1);
    expect((await getWallet(sponsorNoPackage.id)).available).toBeCloseTo(10);
  });

  it("prevents duplicate commission generation (idempotent reprocessing)", async () => {
    await seedRules([{ level: 1, percentage: 10 }]);
    const sponsor = await makeUser({ name: "Sponsor" });
    const buyer = await makeUser({ name: "Buyer", sponsor: sponsor });

    const pkg = await makePackage(100);
    const { transactionId } = await completePurchase(buyer, pkg, 100);

    const first = await processCommissionsForTransaction(transactionId);
    const second = await processCommissionsForTransaction(transactionId);
    const third = await processCommissionsForTransaction(transactionId);

    expect(first.processed).toBe(true);
    expect(first.created).toHaveLength(1);
    expect(second.processed).toBe(false);
    expect(second.created).toHaveLength(0);
    expect(third.created).toHaveLength(0);

    const commissions = await getCommissions(sponsor.id);
    expect(commissions).toHaveLength(1);
    expect((await getWallet(sponsor.id)).available).toBeCloseTo(10);
    expect((await getWallet(sponsor.id)).totalCommissions).toBeCloseTo(10);
  });

  it("does not process transactions that are not COMPLETED", async () => {
    await seedRules([{ level: 1, percentage: 10 }]);
    const sponsor = await makeUser({ name: "Sponsor" });
    const buyer = await makeUser({ name: "Buyer", sponsor: sponsor });
    const pkg = await makePackage(100);
    const { transactionId } = await completePurchase(buyer, pkg, 100);

    await prisma.transaction.update({ where: { id: transactionId }, data: { status: "REVERSED" } });
    const result = await processCommissionsForTransaction(transactionId);
    expect(result.processed).toBe(false);
    expect(await getCommissions()).toHaveLength(0);
  });

  it("does not process non-purchase transactions", async () => {
    await seedRules([{ level: 1, percentage: 10 }]);
    const buyer = await makeUser({ name: "Buyer" });
    const tx = await prisma.transaction.create({
      data: { userId: buyer.id, type: "DEPOSIT", amount: 100, status: "COMPLETED" },
    });
    const result = await processCommissionsForTransaction(tx.id);
    expect(result.processed).toBe(false);
    expect(await getCommissions()).toHaveLength(0);
  });

  it("honours commission eligibility on the package", async () => {
    await seedRules([{ level: 1, percentage: 10 }]);
    const sponsor = await makeUser({ name: "Sponsor" });
    const buyer = await makeUser({ name: "Buyer", sponsor: sponsor });
    const pkg = await makePackage(100, { commissionEligible: false });
    const { transactionId } = await completePurchase(buyer, pkg, 100);

    const result = await processCommissionsForTransaction(transactionId);
    expect(result.processed).toBe(true);
    expect(result.created).toHaveLength(0);
    // Marked processed — not retried.
    const second = await processCommissionsForTransaction(transactionId);
    expect(second.processed).toBe(false);
  });

  it("obeys the commission engine toggle", async () => {
    await seedSettings({ commissionEnabled: false });
    await seedRules([{ level: 1, percentage: 10 }]);
    const sponsor = await makeUser({ name: "Sponsor" });
    const buyer = await makeUser({ name: "Buyer", sponsor: sponsor });
    const pkg = await makePackage(100);
    const { transactionId } = await completePurchase(buyer, pkg, 100);

    const result = await processCommissionsForTransaction(transactionId);
    expect(result.processed).toBe(false);
    expect(await getCommissions()).toHaveLength(0);
  });

  it("rounds money to cents (no float drift)", async () => {
    await seedRules([{ level: 1, percentage: 3.33 }]);
    const sponsor = await makeUser({ name: "Sponsor" });
    const buyer = await makeUser({ name: "Buyer", sponsor: sponsor });
    const pkg = await makePackage(33.33);
    const { transactionId } = await completePurchase(buyer, pkg, 33.33);

    const result = await processCommissionsForTransaction(transactionId);
    expect(result.created[0].amount).toBe(1.11); // 33.33 × 3.33% = 1.109889 → 1.11
  });

  it("keeps commission records permanently auditable (source transaction linked)", async () => {
    await seedRules([{ level: 1, percentage: 10 }]);
    const sponsor = await makeUser({ name: "Sponsor" });
    const buyer = await makeUser({ name: "Buyer", sponsor: sponsor });
    const pkg = await makePackage(100);
    const { transactionId } = await completePurchase(buyer, pkg, 100);
    await processCommissionsForTransaction(transactionId);

    const commissions = await getCommissions(sponsor.id);
    expect(commissions[0].sourceTransactionId).toBe(transactionId);
    expect(commissions[0].fromUserId).toBe(buyer.id);
    expect(commissions[0].baseAmount.toNumber()).toBe(100);
    expect(commissions[0].percentage.toNumber()).toBe(10);

    const ledger = await prisma.walletLedger.findFirst({ where: { userId: sponsor.id } });
    expect(ledger?.referenceId).toBe(commissions[0].id);
    expect(ledger?.transactionId).toBe(transactionId);
  });
});

describe("commission lifecycle (admin)", () => {
  beforeEach(async () => {
    await seedRules([{ level: 1, percentage: 10 }]);
  });

  async function setupPending() {
    await seedSettings({ commissionAutoApprove: false });
    const sponsor = await makeUser({ name: "Sponsor" });
    const buyer = await makeUser({ name: "Buyer", sponsor: sponsor });
    const pkg = await makePackage(100);
    const { transactionId } = await completePurchase(buyer, pkg, 100);
    await processCommissionsForTransaction(transactionId);
    const commission = (await getCommissions(sponsor.id))[0];
    return { sponsor, commission };
  }

  it("approve moves funds from pending to available", async () => {
    const { approveCommission } = await import("@/server/commission/commission-service");
    const { sponsor, commission } = await setupPending();

    expect((await getWallet(sponsor.id)).pending).toBeCloseTo(10);
    expect((await getWallet(sponsor.id)).available).toBeCloseTo(0);

    await approveCommission(commission.id);

    const wallet = await getWallet(sponsor.id);
    expect(wallet.pending).toBeCloseTo(0);
    expect(wallet.available).toBeCloseTo(10);
    const updated = await prisma.commission.findUnique({ where: { id: commission.id } });
    expect(updated?.status).toBe("APPROVED");
  });

  it("cancel (pending only) removes the pending credit", async () => {
    const { cancelCommission } = await import("@/server/commission/commission-service");
    const { sponsor, commission } = await setupPending();
    await cancelCommission(commission.id, "Test cancellation");

    const wallet = await getWallet(sponsor.id);
    expect(wallet.pending).toBeCloseTo(0);
    expect(wallet.available).toBeCloseTo(0);
    const updated = await prisma.commission.findUnique({ where: { id: commission.id } });
    expect(updated?.status).toBe("CANCELLED");
  });

  it("rejects approving an already-approved commission", async () => {
    const { approveCommission } = await import("@/server/commission/commission-service");
    const { sponsor, commission } = await setupPending();
    await approveCommission(commission.id);
    await expect(approveCommission(commission.id)).rejects.toThrow(/Only PENDING/);
    // Balance unchanged by the failed second approve.
    expect((await getWallet(sponsor.id)).available).toBeCloseTo(10);
  });

  it("reverseCommissionsForTransaction claws back paid commissions", async () => {
    const { reverseCommissionsForTransaction } = await import("@/server/commission/commission-service");
    const { sponsor, commission } = await setupPending();
    const { approveCommission } = await import("@/server/commission/commission-service");
    await approveCommission(commission.id);
    expect((await getWallet(sponsor.id)).available).toBeCloseTo(10);

    const count = await reverseCommissionsForTransaction(commission.sourceTransactionId, "Purchase refunded");
    expect(count).toBe(1);
    expect((await getWallet(sponsor.id)).available).toBeCloseTo(0);
    const updated = await prisma.commission.findUnique({ where: { id: commission.id } });
    expect(updated?.status).toBe("REVERSED");
  });
});
