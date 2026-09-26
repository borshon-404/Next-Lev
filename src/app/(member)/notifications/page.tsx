import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireMemberPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Gift, UserPlus, Landmark, FileSearch, Trophy, Megaphone, Package, CheckCheck, Bell } from "lucide-react";
import { MarkAllReadButton } from "./notifications-actions";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };
export const dynamic = "force-dynamic";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  COMMISSION_RECEIVED: Gift,
  NEW_REFERRAL: UserPlus,
  WITHDRAWAL_SUBMITTED: Landmark,
  WITHDRAWAL_APPROVED: Landmark,
  WITHDRAWAL_REJECTED: Landmark,
  KYC_APPROVED: FileSearch,
  KYC_REJECTED: FileSearch,
  PACKAGE_PURCHASED: Package,
  RANK_ACHIEVED: Trophy,
  ANNOUNCEMENT: Megaphone,
};

export default async function NotificationsPage() {
  const user = await requireMemberPage();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You're all caught up."}
        actions={unreadCount > 0 ? <MarkAllReadButton /> : undefined}
      />

      {notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell className="h-5 w-5" />}
            message="No notifications yet"
            description="Updates about referrals, commissions, withdrawals, KYC and ranks will appear here."
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type] ?? Bell;
              return (
                <li key={n.id} className={n.read ? "" : "bg-indigo-50/40"}>
                  <NotificationRow id={n.id} unread={!n.read} icon={<Icon className="h-4.5 w-4.5" />} title={n.title} body={n.body} link={n.link} date={n.createdAt} />
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}

import { NotificationRow } from "./notification-row";
