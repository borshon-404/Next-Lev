import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime, toNumber } from "@/lib/format";
import { Wallet, Gift, Landmark, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAdminActions } from "./user-admin-actions";

export const metadata: Metadata = { title: "Manage user", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      wallet: true,
      sponsor: { select: { id: true, name: true, username: true, referralCode: true } },
      rank: { include: { rank: { select: { name: true, colorHex: true } } } },
      kycSubmissions: { orderBy: { createdAt: "desc" }, take: 3 },
      _count: { select: { referrals: true } },
    },
  });
  if (!user) notFound();

  const [commissions, withdrawals, transactions] = await Promise.all([
    prisma.commission.findMany({
      where: { beneficiaryId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { fromUser: { select: { username: true } } },
    }),
    prisma.withdrawal.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <>
      <PageHeader
        title={user.name}
        description={`@${user.username} · ${user.email}`}
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Users", href: "/admin/users" }, { label: user.username }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={user.status} />
            <Badge tone={user.role === "ADMIN" ? "purple" : "info"}>{user.role}</Badge>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Available" value={formatCurrency(toNumber(user.wallet?.availableBalance))} icon={<Wallet className="h-5 w-5" />} tone="success" />
            <StatCard label="Pending" value={formatCurrency(toNumber(user.wallet?.pendingBalance))} icon={<Gift className="h-5 w-5" />} tone="warning" />
            <StatCard label="Total earned" value={formatCurrency(toNumber(user.wallet?.totalEarned))} icon={<Gift className="h-5 w-5" />} />
            <StatCard label="Direct referrals" value={user._count.referrals} icon={<Users className="h-5 w-5" />} tone="info" />
          </div>

          <Card className="mt-4">
            <CardHeader title="Account details" />
            <CardBody>
              <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Detail k="Referral code" v={user.referralCode} />
                <Detail k="Sponsor" v={user.sponsor ? `${user.sponsor.name} (@${user.sponsor.username})` : "—"} />
                <Detail k="Rank" v={user.rank?.rank.name ?? "—"} />
                <Detail k="Phone" v={user.phone ?? "—"} />
                <Detail k="Country" v={user.profile?.country ?? "—"} />
                <Detail k="Address" v={user.profile?.address ?? "—"} />
                <Detail k="Registered" v={formatDate(user.createdAt)} />
                <Detail k="Last login" v={user.lastLoginAt ? formatDate(user.lastLoginAt) : "—"} />
                <Detail k="Email verified" v={user.emailVerified ? formatDate(user.emailVerified) : "Not verified"} />
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Link href="/admin/genealogy" className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                  View in genealogy search
                </Link>
                {user.kycSubmissions[0] && (
                  <a
                    href={`/api/documents/${user.kycSubmissions[0].id}/document`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    View KYC document ({user.kycSubmissions[0].status})
                  </a>
                )}
              </div>
            </CardBody>
          </Card>

          <Card className="mt-4">
            <div className="divide-y divide-slate-100">
              <AdminTableSection title="Recent commissions">
                {commissions.length === 0 ? (
                  <TableEmpty message="No commissions" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableHead>From</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableHeader>
                    <TableBody>
                      {commissions.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-slate-600">@{c.fromUser.username}</TableCell>
                          <TableCell>L{c.level}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{formatCurrency(toNumber(c.amount))}</TableCell>
                          <TableCell><StatusBadge status={c.status} /></TableCell>
                          <TableCell className="text-slate-500">{formatDateTime(c.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AdminTableSection>
              <AdminTableSection title="Recent withdrawals">
                {withdrawals.length === 0 ? (
                  <TableEmpty message="No withdrawals" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell className="text-right font-medium tabular-nums">{formatCurrency(toNumber(w.amount))}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(toNumber(w.netAmount))}</TableCell>
                          <TableCell className="capitalize">{w.paymentMethod}</TableCell>
                          <TableCell><StatusBadge status={w.status} /></TableCell>
                          <TableCell className="text-slate-500">{formatDateTime(w.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AdminTableSection>
              <AdminTableSection title="Recent transactions">
                {transactions.length === 0 ? (
                  <TableEmpty message="No transactions" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium text-slate-800">{t.type.replaceAll("_", " ")}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{formatCurrency(toNumber(t.amount))}</TableCell>
                          <TableCell><StatusBadge status={t.status} /></TableCell>
                          <TableCell className="text-slate-500">{formatDateTime(t.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </AdminTableSection>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <UserAdminActions
            adminId={admin.id}
            targetUserId={user.id}
            targetName={user.name}
            currentStatus={user.status}
            isAdmin={user.role === "ADMIN"}
            wallet={{ available: toNumber(user.wallet?.availableBalance) }}
            profile={{
              name: user.name,
              phone: user.phone ?? "",
              address: user.profile?.address ?? "",
              country: user.profile?.country ?? "",
            }}
          />
        </div>
      </div>
    </>
  );
}

function Detail({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{k}</dt>
      <dd className="mt-0.5 font-medium text-slate-800">{v}</dd>
    </div>
  );
}

function AdminTableSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="px-5 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h4>
      {children}
    </div>
  );
}
