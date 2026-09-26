import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { applyLedger, withTransaction } from "@/server/wallet/wallet-service";
import { requestWithdrawal, adminReviewWithdrawal, cancelWithdrawal } from "@/server/withdrawal/withdrawal-service";
import { getMlmSettings } from "@/server/mlm/settings-service";
import { wipeAll, seedSettings, makeUser, getWallet } from "./helpers";

beforeAll(async () => {
  await wipeAll();
});

beforeEach(async () => {
  await wipeAll();
  await seedSettings();
});

describe("wallet ledger invariants", () => {
  it("creates an immutable ledger row per balance change with prev/new balances", async () => {
    const user = await makeUser();
    await withTransaction(async (tx) => {
      await applyLedger(tx, user.id, { type: "DEPOSIT", amount: 100, description: "test" });
      await applyLedger(tx, user.id, { type: "WITHDRAWAL", amount: -30, description: "test" });
    });

    const rows = await prisma.walletLedger.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    expect(rows).toHaveLength(2);
    expect(rows[0].previousBalance.toNumber()).toBe(0);
    expect(rows[0].newBalance.toNumber()).toBe(100);
    expect(rows[1].previousBalance.toNumber()).toBe(100);
    expect(rows[1].newBalance.toNumber()).toBe(70);

    const wallet = await getWallet(user.id);
    expect(wallet.available).toBe(70);
    expect(wallet.totalDeposited).toBe(100);
    expect(wallet.totalWithdrawn).toBe(30);
  });

  it("never allows a negative balance (rolls back the whole transaction)", async () => {
    const user = await makeUser();
    await withTransaction(async (tx) => {
      await applyLedger(tx, user.id, { type: "DEPOSIT", amount: 20, description: "seed" });
    });

    await expect(
      withTransaction(async (tx) => {
        await applyLedger(tx, user.id, { type: "WITHDRAWAL", amount: -50, description: "overdraft" });
        // If we get here the guard failed.
      })
    ).rejects.toThrow(/Insufficient/);

    // Balance untouched.
    expect((await getWallet(user.id)).available).toBe(20);
    expect(await prisma.walletLedger.count({ where: { userId: user.id } })).toBe(1);
  });

  it("enforces idempotency keys (safe retries)", async () => {
    const user = await makeUser();
    const run = async () =>
      withTransaction(async (tx) => {
        await applyLedger(tx, user.id, {
          type: "BONUS",
          amount: 15,
          description: "retry-safe",
          idempotencyKey: "bonus:test-123",
        });
      });
    await run();
    await run(); // duplicate
    await run(); // duplicate again

    expect(await prisma.walletLedger.count({ where: { userId: user.id } })).toBe(1);
    expect((await getWallet(user.id)).available).toBe(15);
  });

  it("tracks pending bucket separately from available", async () => {
    const user = await makeUser();
    await withTransaction(async (tx) => {
      await applyLedger(tx, user.id, { type: "COMMISSION", balanceType: "PENDING", amount: 25, description: "pending" });
      await applyLedger(tx, user.id, { type: "COMMISSION", balanceType: "PENDING", amount: -25, description: "approve-out" });
      await applyLedger(tx, user.id, { type: "COMMISSION", balanceType: "AVAILABLE", amount: 25, description: "approve-in", countsTowardEarned: false });
    });
    const wallet = await getWallet(user.id);
    expect(wallet.pending).toBe(0);
    expect(wallet.available).toBe(25);
    expect(wallet.totalCommissions).toBe(25);
    expect(wallet.totalEarned).toBe(25);
  });
});

describe("withdrawal validation", () => {
  async function fundedUser(amount: number) {
    const user = await makeUser();
    await withTransaction(async (tx) => {
      await applyLedger(tx, user.id, { type: "DEPOSIT", amount, description: "funding" });
    });
    return user;
  }

  it("enforces the minimum withdrawal", async () => {
    const user = await fundedUser(100);
    await expect(
      requestWithdrawal(user.id, { amount: 5, paymentMethod: "bank", accountDetails: "acct 123" })
    ).rejects.toThrow(/Minimum withdrawal/);
  });

  it("enforces the maximum withdrawal", async () => {
    const user = await fundedUser(100000);
    await expect(
      requestWithdrawal(user.id, { amount: 9000, paymentMethod: "bank", accountDetails: "acct 123" })
    ).rejects.toThrow(/Maximum withdrawal/);
  });

  it("rejects withdrawing more than the available balance", async () => {
    const user = await fundedUser(50);
    await expect(
      requestWithdrawal(user.id, { amount: 51, paymentMethod: "bank", accountDetails: "acct 123" })
    ).rejects.toThrow(/Insufficient/);
    // Nothing changed.
    expect((await getWallet(user.id)).available).toBe(50);
    expect(await prisma.withdrawal.count({ where: { userId: user.id } })).toBe(0);
  });

  it("requires approved KYC when configured", async () => {
    await seedSettings({ kycRequiredForWithdrawal: true });
    const user = await fundedUser(100);
    await expect(
      requestWithdrawal(user.id, { amount: 20, paymentMethod: "bank", accountDetails: "acct 123" })
    ).rejects.toThrow(/KYC/);

    await prisma.kyc.create({
      data: { userId: user.id, fullName: "Test", documentType: "NID", documentNumber: "A123", documentKey: "k", status: "APPROVED" },
    });
    const result = await requestWithdrawal(user.id, { amount: 20, paymentMethod: "bank", accountDetails: "acct 123" });
    expect(result.amount).toBe(20);
    expect((await getWallet(user.id)).available).toBe(80);
  });

  it("blocks suspended members from withdrawing", async () => {
    const user = await fundedUser(100);
    await prisma.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });
    await expect(
      requestWithdrawal(user.id, { amount: 20, paymentMethod: "bank", accountDetails: "acct 123" })
    ).rejects.toThrow(/not active/);
  });

  it("applies the configured fee (percentage + fixed)", async () => {
    await seedSettings({ withdrawalFeePercent: 1, withdrawalFeeFixed: 0.5 });
    const user = await fundedUser(1000);
    const result = await requestWithdrawal(user.id, { amount: 100, paymentMethod: "bank", accountDetails: "acct 123" });
    expect(result.fee).toBeCloseTo(1.5);
    expect(result.netAmount).toBeCloseTo(98.5);
    expect((await getWallet(user.id)).available).toBeCloseTo(900);
  });

  it("member can cancel a pending withdrawal → refund", async () => {
    const user = await fundedUser(100);
    const w = await requestWithdrawal(user.id, { amount: 40, paymentMethod: "bank", accountDetails: "acct 123" });
    expect((await getWallet(user.id)).available).toBe(60);

    await cancelWithdrawal(w.id, user.id);
    expect((await getWallet(user.id)).available).toBe(100);
    const row = await prisma.withdrawal.findUnique({ where: { id: w.id } });
    expect(row?.status).toBe("CANCELLED");
  });

  it("rejecting a withdrawal refunds the held funds", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const user = await fundedUser(100);
    const w = await requestWithdrawal(user.id, { amount: 40, paymentMethod: "bank", accountDetails: "acct 123" });

    await adminReviewWithdrawal(w.id, { id: admin.id }, "REJECT", { note: "docs missing" });
    expect((await getWallet(user.id)).available).toBe(100);
    const row = await prisma.withdrawal.findUnique({ where: { id: w.id } });
    expect(row?.status).toBe("REJECTED");
    expect(row?.reviewNote).toBe("docs missing");
  });

  it("approve → complete flow finalizes and records the transaction", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const user = await fundedUser(100);
    const w = await requestWithdrawal(user.id, { amount: 40, paymentMethod: "bank", accountDetails: "acct 123" });

    await adminReviewWithdrawal(w.id, { id: admin.id }, "APPROVE");
    await adminReviewWithdrawal(w.id, { id: admin.id }, "COMPLETE");

    const row = await prisma.withdrawal.findUnique({ where: { id: w.id } });
    expect(row?.status).toBe("COMPLETED");
    expect(row?.completedAt).toBeInstanceOf(Date);
    expect(await prisma.transaction.count({ where: { referenceId: w.id, type: "WITHDRAWAL" } })).toBe(1);
    // Wallet still shows the debit; totalWithdrawn tracked.
    const wallet = await getWallet(user.id);
    expect(wallet.available).toBe(60);
    expect(wallet.totalWithdrawn).toBe(40);
  });

  it("cannot complete an unapproved withdrawal", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const user = await fundedUser(100);
    const w = await requestWithdrawal(user.id, { amount: 40, paymentMethod: "bank", accountDetails: "acct 123" });
    await expect(adminReviewWithdrawal(w.id, { id: admin.id }, "COMPLETE")).rejects.toThrow(/Cannot/);
  });

  it("withdrawal settings come from the database, not code", async () => {
    await seedSettings({ minWithdrawal: 25 });
    const settings = await getMlmSettings();
    expect(settings.minWithdrawalNum).toBe(25);
  });
});
