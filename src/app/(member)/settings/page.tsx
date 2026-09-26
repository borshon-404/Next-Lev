import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireMemberPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { ChangePasswordForm } from "./settings-form";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireMemberPage();
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true, email: true, emailVerified: true, createdAt: true, lastLoginAt: true, status: true, role: true, referralCode: true },
  });
  if (!me) return null;

  return (
    <>
      <PageHeader title="Settings" description="Account security and preferences." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account" description="Core account information. Contact support to change your email or username." />
          <CardBody>
            <dl className="space-y-3.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Username</dt>
                <dd className="font-medium text-slate-700">@{me.username}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Email</dt>
                <dd className="font-medium text-slate-700">
                  {me.email}{" "}
                  {me.emailVerified ? (
                    <Badge tone="success">Verified</Badge>
                  ) : (
                    <Badge tone="warning">Unverified</Badge>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Role</dt>
                <dd>
                  <Badge tone={me.role === "ADMIN" ? "purple" : "info"}>{me.role}</Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Status</dt>
                <dd>
                  <StatusBadge status={me.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Member since</dt>
                <dd className="font-medium text-slate-700">{formatDate(me.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Last login</dt>
                <dd className="font-medium text-slate-700">{me.lastLoginAt ? formatDate(me.lastLoginAt) : "First session"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Referral code</dt>
                <dd className="font-mono font-medium text-slate-700">{me.referralCode}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Change password" description="Use a strong password you don't use elsewhere." />
          <CardBody>
            <ChangePasswordForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
