/* eslint-disable no-console */
/**
 * ============================================================================
 * Nexlev demo seed
 * ============================================================================
 * Creates a clearly-labeled demo environment (all names carry a "Demo "
 * prefix and the console prints every credential). The seed drives the REAL
 * services — registration, the payment confirmation flow, the commission
 * engine, KYC review, withdrawals, deposits and rank evaluation — so every
 * number on the dashboards is genuine ledger data.
 *
 * Hierarchy (matches the spec's demo tree):
 *
 *   Demo Alice (A)
 *   ├── Demo Bob (B)        ├── Demo Dana (D)     ├── Demo Ivan (I)
 *   │                       └── Demo Erin (E)     └── Demo Jack (J)
 *   ├── Demo Carol (C)      ├── Demo Frank (F)    └── Demo Kim (K)
 *   │                       └── Demo Grace (G)
 *   └── Demo Henry (H)
 *
 * Run with: npm run db:seed   (or npm run db:reset for a clean database)
 * ============================================================================
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "../src/lib/prisma";
import { resetRateLimits } from "../src/lib/rate-limit";
import { generateReferralCode } from "../src/lib/ids";
import { registerUser } from "../src/server/auth/register-service";
import { upsertSettingsForSeed } from "./seed-settings";
import { seedPurchase, manualPurchaseWithPendingCommission } from "./seed-flows";

const DEMO_PASSWORD = "Password123";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + (n % 8), (n * 7) % 60, 0, 0);
  return d;
}

async function main() {
  // Idempotency: never double-seed.
  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) {
    console.log("✔ Seed skipped — an admin account already exists. Use `npm run db:reset` for a clean demo.");
    return;
  }

  console.log("Seeding Nexlev demo data (all entries are labeled 'Demo ...')...\n");

  // --- Admin -----------------------------------------------------------------
  const adminId = randomUUID();
  const adminReferral = `NEXLEV${generateReferralCode("admin").slice(-3)}`;
  await prisma.user.create({
    data: {
      id: adminId,
      name: "Demo Admin",
      email: "admin@nexlev.test",
      username: "demo_admin",
      phone: "+1 555 0100",
      passwordHash: await hash(DEMO_PASSWORD, 10),
      role: "ADMIN",
      status: "ACTIVE",
      referralCode: adminReferral,
      termsAccepted: true,
      path: `.${adminId}.`,
      depth: 0,
      profile: { create: { country: "USA", bio: "Demo administrator account." } },
    },
  });
  console.log("  Admin:    admin@nexlev.test / Password123");

  // --- Plan configuration ------------------------------------------------------
  await upsertSettingsForSeed();

  // --- Members (real registration service → referral codes, paths, wallets) ----
  const memberSpecs: { name: string; username: string; sponsor?: string }[] = [
    { name: "Demo Alice", username: "demo_alice" },
    { name: "Demo Bob", username: "demo_bob", sponsor: "demo_alice" },
    { name: "Demo Carol", username: "demo_carol", sponsor: "demo_alice" },
    { name: "Demo Henry", username: "demo_henry", sponsor: "demo_alice" },
    { name: "Demo Dana", username: "demo_dana", sponsor: "demo_bob" },
    { name: "Demo Erin", username: "demo_erin", sponsor: "demo_bob" },
    { name: "Demo Frank", username: "demo_frank", sponsor: "demo_carol" },
    { name: "Demo Grace", username: "demo_grace", sponsor: "demo_carol" },
    { name: "Demo Ivan", username: "demo_ivan", sponsor: "demo_dana" },
    { name: "Demo Jack", username: "demo_jack", sponsor: "demo_dana" },
    { name: "Demo Kim", username: "demo_kim", sponsor: "demo_frank" },
  ];

  const userIds: Record<string, string> = {};
  const referralCodes: Record<string, string> = {};
  const registrationDays: Record<string, number> = {
    demo_alice: 60, demo_bob: 57, demo_carol: 54, demo_henry: 50,
    demo_dana: 45, demo_erin: 42, demo_frank: 40, demo_grace: 38,
    demo_ivan: 30, demo_jack: 28, demo_kim: 22,
  };

  for (const spec of memberSpecs) {
    resetRateLimits();
    const result = await registerUser(
      {
        fullName: spec.name,
        username: spec.username,
        email: `${spec.username.replace("demo_", "")}@nexlev.test`,
        phone: `+1 555 01${String(10 + Object.keys(userIds).length).padStart(2, "0")}`,
        password: DEMO_PASSWORD,
        confirmPassword: DEMO_PASSWORD,
        referralCode: spec.sponsor ? referralCodes[spec.sponsor] : undefined,
        acceptTerms: true,
      },
      { ip: "127.0.0.1:seed" }
    );
    userIds[spec.username] = result.userId;
    referralCodes[spec.username] = result.referralCode;
  }
  console.log(`  Members: ${memberSpecs.length} demo members registered\n`);

  // Backdate registrations so growth charts have history.
  for (const [username, userId] of Object.entries(userIds)) {
    await prisma.user.update({
      where: { id: userId },
      data: { createdAt: daysAgo(registrationDays[username]) },
    });
  }

  // --- KYC (reviewed by the demo admin via the real review service) ------------
  const { submitKyc, reviewKyc } = await import("../src/server/kyc/kyc-service");
  const kycSpecs = [
    { username: "demo_alice", days: 58 },
    { username: "demo_bob", days: 54 },
    { username: "demo_carol", days: 51 },
    { username: "demo_frank", days: 39 },
    { username: "demo_dana", days: 10 },
  ];
  const fakeDoc = new File([Buffer.from("fake-jpeg-bytes-1234")], "id.jpg", { type: "image/jpeg" });
  for (const s of kycSpecs) {
    const name = memberSpecs.find((m) => m.username === s.username)!.name;
    let kycId: string;
    try {
      const { kycId: createdId } = await submitKyc(userIds[s.username], {
        fullName: name,
        dateOfBirth: "1992-05-14",
        address: "1 Demo Street, Testville",
        documentType: "NID",
        documentNumber: `DEMO${s.days}00001`,
        document: fakeDoc,
      });
      kycId = createdId;
    } catch {
      // Fallback: create the row directly (skips storage upload).
      const kyc = await prisma.kyc.create({
        data: {
          userId: userIds[s.username],
          fullName: name,
          documentType: "NID",
          documentNumber: `DEMO${s.days}00001`,
          documentKey: `kyc/${userIds[s.username]}/seed-document.jpg`,
          status: "PENDING",
        },
      });
      kycId = kyc.id;
    }
    await reviewKyc(kycId, { id: adminId }, "APPROVE", { reason: "Demo review" });
    await prisma.kyc.updateMany({
      where: { id: kycId },
      data: { createdAt: daysAgo(s.days), reviewedAt: daysAgo(s.days - 1) },
    });
  }
  // One pending submission for the admin review queue.
  await prisma.kyc.create({
    data: {
      userId: userIds.demo_grace,
      fullName: "Demo Grace",
      documentType: "PASSPORT",
      documentNumber: "DEMOGRACE01",
      documentKey: `kyc/${userIds.demo_grace}/seed-document.jpg`,
      status: "PENDING",
      createdAt: daysAgo(3),
    },
  });
  console.log("  KYC:     5 approved, 1 pending (Demo Grace)");

  // --- Packages + purchases (real payment → commission pipeline) ---------------
  const packages = await prisma.package.findMany({ orderBy: { sortOrder: "asc" } });
  const starter = packages.find((p) => p.name === "Starter")!;
  const professional = packages.find((p) => p.name === "Professional")!;
  const premium = packages.find((p) => p.name === "Premium")!;

  const purchaseSpecs = [
    { username: "demo_alice", pkg: professional, days: 58 },
    { username: "demo_bob", pkg: professional, days: 56 },
    { username: "demo_carol", pkg: premium, days: 52 },
    { username: "demo_dana", pkg: starter, days: 40 },
    { username: "demo_erin", pkg: professional, days: 33 },
    { username: "demo_frank", pkg: professional, days: 26 },
    { username: "demo_grace", pkg: starter, days: 19 },
    { username: "demo_ivan", pkg: starter, days: 12 },
  ];

  for (const s of purchaseSpecs) {
    await seedPurchase(userIds[s.username], s.pkg.id, s.days, adminId);
  }
  console.log(`  Sales:   ${purchaseSpecs.length} completed purchases (commissions generated by the real engine)`);

  // Most recent purchase: Kim → leaves ONE commission (Alice, level 3) as
  // PENDING so the admin approval queue has live work.
  await manualPurchaseWithPendingCommission({
    buyerId: userIds.demo_kim,
    packageId: starter.id,
    days: 5,
    adminId,
  });
  console.log("  Sales:   +1 purchase (Demo Kim) with a pending level-3 commission");

  // --- Withdrawals (real service) ----------------------------------------------
  const { requestWithdrawal } = await import("../src/server/withdrawal/withdrawal-service");
  const { adminReviewWithdrawal } = await import("../src/server/withdrawal/withdrawal-service");

  const w1 = await requestWithdrawal(userIds.demo_bob, {
    amount: 10,
    paymentMethod: "bank",
    accountDetails: "DEMO BANK ****4321",
    note: "Demo completed withdrawal",
  });
  await adminReviewWithdrawal(w1.id, { id: adminId }, "APPROVE", { note: "Demo", ip: "127.0.0.1:seed" });
  await adminReviewWithdrawal(w1.id, { id: adminId }, "COMPLETE", { note: "Demo", ip: "127.0.0.1:seed" });
  await prisma.withdrawal.update({ where: { id: w1.id }, data: { createdAt: daysAgo(20), reviewedAt: daysAgo(19), completedAt: daysAgo(18) } });

  const w2 = await requestWithdrawal(userIds.demo_alice, {
    amount: 25,
    paymentMethod: "bank",
    accountDetails: "DEMO BANK ****7788",
  });
  await prisma.withdrawal.update({ where: { id: w2.id }, data: { createdAt: daysAgo(2) } });
  console.log("  Withdrawals: 1 completed (Bob), 1 pending (Alice)");

  // --- Deposit (real admin service) --------------------------------------------
  const { createDeposit, reviewDeposit } = await import("../src/server/deposit/deposit-service");
  const depId = await createDeposit(
    { id: adminId },
    { userId: userIds.demo_grace, amount: 50, method: "Bank transfer", reference: "DEP-DEMO-001" }
  );
  await reviewDeposit(depId, { id: adminId }, "COMPLETE", { ip: "127.0.0.1:seed" });
  await prisma.deposit.update({ where: { id: depId }, data: { createdAt: daysAgo(15), reviewedAt: daysAgo(15) } });
  console.log("  Deposit:   $50 credited to Demo Grace");

  // --- Ranks (real evaluation service — final pass) -----------------------------
  const { evaluateUserRank } = await import("../src/server/rank/rank-service");
  for (const userId of Object.values(userIds)) {
    await evaluateUserRank(userId, { awardBonus: true });
  }
  const ranks = await prisma.userRank.findMany({ include: { rank: { select: { name: true } } } });
  console.log(`  Ranks:   ${ranks.length} members ranked (${[...new Set(ranks.map((r) => r.rank.name))].join(", ")})`);

  // --- Announcement --------------------------------------------------------------
  await prisma.notification.createMany({
    data: Object.entries(userIds).map(([username, userId]) => ({
      userId,
      type: "ANNOUNCEMENT",
      title: "Welcome to the Nexlev demo environment",
      body: "This workspace is seeded with demo data. Explore your dashboard, team, genealogy, wallet and the admin panel (admin@nexlev.test / Password123).",
      link: "/dashboard",
      createdAt: daysAgo(1),
    })),
  });

  console.log("\n──────────────────────────────────────────────────────────");
  console.log("✔ Demo seed complete.");
  console.log(`  Admin:    admin@nexlev.test / ${DEMO_PASSWORD}`);
  console.log(`  Members:  alice@nexlev.test … kim@nexlev.test / ${DEMO_PASSWORD}`);
  console.log("  (e.g. alice@nexlev.test, bob@nexlev.test, carol@nexlev.test)");
  console.log("──────────────────────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
