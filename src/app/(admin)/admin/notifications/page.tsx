import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { BroadcastForm } from "./broadcast-form";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  NEW_REFERRAL: "New referral",
  COMMISSION_RECEIVED: "Commission",
  WITHDRAWAL_SUBMITTED: "Withdrawal",
  WITHDRAWAL_APPROVED: "Withdrawal",
  WITHDRAWAL_REJECTED: "Withdrawal",
  KYC_APPROVED: "KYC",
  KYC_REJECTED: "KYC",
  PACKAGE_PURCHASED: "Package",
  RANK_ACHIEVED: "Rank",
  ANNOUNCEMENT: "Announcement",
};

export default async function AdminNotificationsPage() {
  await requireAdminPage();
  const recent = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { user: { select: { username: true, name: true } } },
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Broadcast announcements to all members and review recent notification activity."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader title="Broadcast announcement" description="Delivered to every member's notification feed." />
            <CardBody>
              <BroadcastForm />
            </CardBody>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader title="Recent notifications" description="Latest 40 across all members" />
          {recent.length === 0 ? (
            <EmptyState icon={<Megaphone className="h-5 w-5" />} message="No notifications yet" description="System notifications (referrals, commissions, withdrawals, ranks…) appear here as they happen." />
          ) : (
            <Table>
              <TableHeader>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Read</TableHead>
                <TableHead>When</TableHead>
              </TableHeader>
              <TableBody>
                {recent.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <span className="font-medium text-slate-800">@{n.user.username}</span>
                    </TableCell>
                    <TableCell>
                      <Badge tone="default">{TYPE_LABEL[n.type] ?? n.type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-slate-600" title={n.title}>
                      {n.title}
                    </TableCell>
                    <TableCell>
                      <Badge tone={n.read ? "default" : "info"}>{n.read ? "Read" : "Unread"}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-500">{timeAgo(n.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
