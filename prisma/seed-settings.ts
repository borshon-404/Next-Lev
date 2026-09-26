import { prisma } from "../src/lib/prisma";

/** Seed-only configuration (admin settings are normally managed in the UI). */
export async function upsertSettingsForSeed(): Promise<void> {
  await prisma.mlmSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      planType: "UNILEVEL",
      currency: "USD",
      commissionEnabled: true,
      commissionAutoApprove: true,
      autoActivate: true,
      kycRequiredForWithdrawal: true,
      minWithdrawal: 10,
      maxWithdrawal: 5000,
      withdrawalFeePercent: 0,
      withdrawalFeeFixed: 0,
    },
    update: {
      planType: "UNILEVEL",
      currency: "USD",
      commissionEnabled: true,
      commissionAutoApprove: true,
      autoActivate: true,
      kycRequiredForWithdrawal: true,
      minWithdrawal: 10,
      maxWithdrawal: 5000,
    },
  });

  await prisma.commissionRule.deleteMany({});
  await prisma.commissionRule.createMany({
    data: [
      { level: 1, percentage: 10, description: "Direct sponsor" },
      { level: 2, percentage: 5, description: "Second generation" },
      { level: 3, percentage: 3, description: "Third generation" },
      { level: 4, percentage: 2, description: "Fourth generation" },
    ],
  });

  if (!(await prisma.package.count())) {
    await prisma.package.createMany({
      data: [
        { name: "Starter", price: 25, pv: 25, description: "Entry package for new members. Includes a starter kit and full platform access.", sortOrder: 0 },
        { name: "Professional", price: 100, pv: 100, description: "Our most popular package for members who are serious about building their team.", sortOrder: 1 },
        { name: "Premium", price: 250, pv: 250, description: "Maximum package value with top personal volume for rank progression.", sortOrder: 2 },
      ],
    });
  }

  const ranks = [
    { name: "Member", level: 1, minDirectReferrals: 0, minTeamMembers: 0, minPersonalVolume: 0, minTeamVolume: 0, bonus: 0, colorHex: "#64748b" },
    { name: "Bronze", level: 2, minDirectReferrals: 1, minTeamMembers: 1, minPersonalVolume: 25, minTeamVolume: 0, bonus: 5, colorHex: "#b45309" },
    { name: "Silver", level: 3, minDirectReferrals: 2, minTeamMembers: 3, minPersonalVolume: 50, minTeamVolume: 50, bonus: 15, colorHex: "#64748b" },
    { name: "Gold", level: 4, minDirectReferrals: 3, minTeamMembers: 6, minPersonalVolume: 100, minTeamVolume: 150, bonus: 50, colorHex: "#d97706" },
    { name: "Platinum", level: 5, minDirectReferrals: 5, minTeamMembers: 12, minPersonalVolume: 250, minTeamVolume: 400, bonus: 150, colorHex: "#0891b2" },
    { name: "Diamond", level: 6, minDirectReferrals: 8, minTeamMembers: 25, minPersonalVolume: 500, minTeamVolume: 1000, bonus: 500, colorHex: "#7c3aed" },
  ];
  for (const r of ranks) {
    await prisma.rank.upsert({ where: { name: r.name }, create: r, update: r });
  }

  await prisma.systemSetting.upsert({
    where: { key: "payment_instructions" },
    create: {
      key: "payment_instructions",
      value:
        "DEMO: Send your payment by bank transfer to Nexlev Network Ltd. (Account ending 4471), referencing your payment reference shown above. An administrator verifies the transfer and confirms your payment — your package activates automatically after confirmation. In production this is replaced by a connected payment gateway.",
    },
    update: {
      value:
        "DEMO: Send your payment by bank transfer to Nexlev Network Ltd. (Account ending 4471), referencing your payment reference shown above. An administrator verifies the transfer and confirms your payment — your package activates automatically after confirmation. In production this is replaced by a connected payment gateway.",
    },
  });

  console.log("  Config:  4 commission levels (10/5/3/2%), 3 packages, 6 ranks");
}
