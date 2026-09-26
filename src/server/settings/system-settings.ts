import { prisma } from "@/lib/prisma";

/**
 * Generic key/value system settings (SystemSetting table) — used for branding,
 * payment instructions, support info and other non-plan configuration.
 */

export async function getSystemSetting<T>(key: string): Promise<T | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return (row?.value as T) ?? null;
}

export async function setSystemSetting(key: string, value: unknown): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}

export async function getAllSystemSettings(): Promise<Record<string, unknown>> {
  const rows = await prisma.systemSetting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
