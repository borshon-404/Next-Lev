import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireMemberPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "My Profile", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireMemberPage();
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      profile: true,
      sponsor: { select: { name: true, username: true, email: true, referralCode: true } },
      _count: { select: { referrals: true } },
    },
  });
  if (!me) return null;

  return (
    <>
      <PageHeader title="My Profile" description="Your account details and personal information." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit">
          <CardBody className="flex flex-col items-center py-8 text-center">
            <Avatar name={me.name} src={me.image} size="lg" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{me.name}</h2>
            <p className="text-sm text-slate-500">@{me.username}</p>
            <div className="mt-3 flex items-center gap-2">
              <StatusBadge status={me.status} />
              <Badge tone={me.role === "ADMIN" ? "purple" : "info"}>{me.role}</Badge>
            </div>
            <dl className="mt-6 w-full space-y-3 border-t border-slate-100 pt-5 text-left text-sm">
              <Row k="Email" v={me.email} verified={Boolean(me.emailVerified)} />
              <Row k="Phone" v={me.phone ?? "—"} />
              <Row k="Member since" v={formatDate(me.createdAt)} />
              <Row k="Referral code" v={me.referralCode} />
              <Row k="Direct referrals" v={String(me._count.referrals)} />
            </dl>
            {me.sponsor && (
              <div className="mt-5 w-full rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">My sponsor</p>
                <div className="mt-2 flex items-center gap-2.5">
                  <Avatar name={me.sponsor.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {me.sponsor.name} <span className="font-normal text-slate-400">@{me.sponsor.username}</span>
                    </p>
                    <p className="truncate text-xs text-slate-500">{me.sponsor.email}</p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                  Your sponsor relationship is permanent and cannot be changed.
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Edit profile" description="Update your personal information. Your username, email and sponsor cannot be changed." />
          <CardBody>
            <ProfileForm
              initial={{
                fullName: me.name,
                phone: me.phone ?? "",
                address: me.profile?.address ?? "",
                country: me.profile?.country ?? "",
                dateOfBirth: me.profile?.dateOfBirth ? me.profile.dateOfBirth.toISOString().slice(0, 10) : "",
              }}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Row({ k, v, verified }: { k: string; v: string; verified?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-400">{k}</dt>
      <dd className="truncate font-medium text-slate-700">
        {v}
        {verified && <span className="ml-1.5 text-[10px] font-semibold text-emerald-600">✓ verified</span>}
      </dd>
    </div>
  );
}
