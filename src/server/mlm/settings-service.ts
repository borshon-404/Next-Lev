import { z } from "zod";
import { Prisma, type MlmSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";

/**
 * All MLM plan configuration lives in the database (MlmSettings singleton +
 * CommissionRule rows). NOTHING about the compensation plan is hard-coded in
 * business logic — services read these settings at execution time.
 */

export const qualificationSchema = z.object({
  requireActiveMembership: z.boolean().default(true),
  requireKyc: z.boolean().default(false),
  requirePackage: z.boolean().default(true),
  minDirectReferrals: z.number().int().min(0).default(0),
  minPersonalVolume: z.number().min(0).default(0),
  minTeamVolume: z.number().min(0).default(0),
  minMonthlySales: z.number().min(0).default(0),
});

export type QualificationConfig = z.infer<typeof qualificationSchema>;

export const DEFAULT_QUALIFICATION: QualificationConfig = {
  requireActiveMembership: true,
  requireKyc: false,
  requirePackage: true,
  minDirectReferrals: 0,
  minPersonalVolume: 0,
  minTeamVolume: 0,
  minMonthlySales: 0,
};

export interface MlmSettingsWithRules extends MlmSettings {
  qualification: QualificationConfig;
  minWithdrawalNum: number;
  maxWithdrawalNum: number;
  withdrawalFeePercentNum: number;
  withdrawalFeeFixedNum: number;
  rules: { level: number; percentage: number; active: boolean; description: string | null }[];
}

const SETTINGS_ID = "default";

/** Loads (or lazily creates) the singleton settings row + commission rules. */
export async function getMlmSettings(
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<MlmSettingsWithRules> {
  let settings = await db.mlmSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!settings) {
    settings = await db.mlmSettings.create({ data: { id: SETTINGS_ID } });
  }
  const ruleRows = await db.commissionRule.findMany({ orderBy: { level: "asc" } });
  const parsed = qualificationSchema.safeParse(settings.qualification);
  return {
    ...settings,
    qualification: parsed.success ? parsed.data : DEFAULT_QUALIFICATION,
    minWithdrawalNum: toNumber(settings.minWithdrawal),
    maxWithdrawalNum: toNumber(settings.maxWithdrawal),
    withdrawalFeePercentNum: toNumber(settings.withdrawalFeePercent),
    withdrawalFeeFixedNum: toNumber(settings.withdrawalFeeFixed),
    rules: ruleRows.map((r) => ({
      level: r.level,
      percentage: toNumber(r.percentage),
      active: r.active,
      description: r.description,
    })),
  };
}

export const updateMlmSettingsSchema = z.object({
  planType: z.enum(["UNILEVEL"]).optional(),
  currency: z.string().trim().length(3).optional(),
  commissionEnabled: z.boolean().optional(),
  commissionAutoApprove: z.boolean().optional(),
  qualification: qualificationSchema.partial().optional(),
  referralRequired: z.boolean().optional(),
  emailVerificationRequired: z.boolean().optional(),
  phoneVerificationRequired: z.boolean().optional(),
  kycRequiredForActivation: z.boolean().optional(),
  autoActivate: z.boolean().optional(),
  packageRequiredForActivation: z.boolean().optional(),
  minWithdrawal: z.number().min(0).optional(),
  maxWithdrawal: z.number().min(0).optional(),
  withdrawalFeePercent: z.number().min(0).max(100).optional(),
  withdrawalFeeFixed: z.number().min(0).optional(),
  kycRequiredForWithdrawal: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  rules: z
    .array(
      z.object({
        level: z.number().int().min(1).max(50),
        percentage: z.number().min(0).max(100),
        active: z.boolean().default(true),
        description: z.string().max(200).optional(),
      })
    )
    .max(50)
    .optional(),
});

export type UpdateMlmSettingsInput = z.infer<typeof updateMlmSettingsSchema>;

/** Admin-only update; returns previous and next values for audit logging. */
export async function updateMlmSettings(input: UpdateMlmSettingsInput) {
  await getMlmSettings(); // ensure the singleton exists
  const previous = await prisma.mlmSettings.findUniqueOrThrow({ where: { id: SETTINGS_ID } });
  const previousRules = await prisma.commissionRule.findMany({ orderBy: { level: "asc" } });

  const { rules, qualification, ...scalarFields } = input;

  await prisma.$transaction(async (tx) => {
    if (qualification) {
      const current = qualificationSchema.safeParse(previous.qualification);
      const merged = { ...(current.success ? current.data : DEFAULT_QUALIFICATION), ...qualification };
      await tx.mlmSettings.update({
        where: { id: SETTINGS_ID },
        data: { qualification: merged as unknown as Prisma.InputJsonValue },
      });
    }
    const data: Prisma.MlmSettingsUpdateInput = {};
    for (const [key, value] of Object.entries(scalarFields)) {
      if (value !== undefined) {
        (data as Record<string, unknown>)[key] = value;
      }
    }
    if (Object.keys(data).length > 0) {
      await tx.mlmSettings.update({ where: { id: SETTINGS_ID }, data });
    }
    if (rules && rules.length > 0) {
      const levels = rules.map((r) => r.level);
      if (new Set(levels).size !== levels.length) {
        throw new Error("Commission rule levels must be unique.");
      }
      await tx.commissionRule.deleteMany({});
      await tx.commissionRule.createMany({
        data: rules.map((r) => ({
          level: r.level,
          percentage: new Prisma.Decimal(r.percentage),
          active: r.active,
          description: r.description ?? null,
        })),
      });
    }
  });

  const next = await prisma.mlmSettings.findUniqueOrThrow({ where: { id: SETTINGS_ID } });
  const nextRules = await prisma.commissionRule.findMany({ orderBy: { level: "asc" } });
  return { previous, next, previousRules, nextRules };
}
