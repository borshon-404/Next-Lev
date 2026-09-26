import { Prisma, type NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

export async function createNotification(
  db: Db,
  userId: string,
  input: NotificationInput
): Promise<void> {
  await db.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    },
  });
}

export async function createNotifications(
  db: Db,
  userIds: string[],
  input: NotificationInput
): Promise<void> {
  if (userIds.length === 0) return;
  await db.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    })),
  });
}

/** Broadcast an announcement to every non-admin member. */
export async function broadcastAnnouncement(title: string, body: string): Promise<number> {
  const users = await prisma.user.findMany({
    where: { role: "MEMBER" },
    select: { id: true },
  });
  await createNotifications(
    prisma,
    users.map((u) => u.id),
    { type: "ANNOUNCEMENT", title, body, link: "/notifications" }
  );
  return users.length;
}
