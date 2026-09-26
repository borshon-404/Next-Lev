import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { FileSearch, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { KycReviewActions } from "./kyc-actions";

export const metadata: Metadata = { title: "KYC", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminKycPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const status = (typeof params.status === "string" && params.status !== "ALL" ? params.status : undefined) as
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | undefined;

  const where = status ? { status } : {};
  const [items, pendingCount, approvedCount] = await Promise.all([
    prisma.kyc.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 60,
      include: { user: { select: { name: true, username: true } } },
    }),
    prisma.kyc.count({ where: { status: "PENDING" } }),
    prisma.kyc.count({ where: { status: "APPROVED" } }),
  ]);

  const buildHref = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status: status ?? "", ...patch })) if (v) p.set(k, v);
    const qs = p.toString();
    return `/admin/kyc${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="KYC Verification" description="Review identity submissions. Documents are private and only accessible through the platform." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label="Pending review" value={pendingCount} icon={<Clock className="h-5 w-5" />} tone="warning" />
        <StatCard label="Approved" value={approvedCount} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="Submissions listed" value={items.length} icon={<FileSearch className="h-5 w-5" />} tone="info" />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Submissions"
          action={
            <form method="GET" className="flex gap-2">
              <select name="status" defaultValue={status ?? "ALL"} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm">
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </form>
          }
        />
        {items.length === 0 ? (
          <EmptyState icon={<FileSearch className="h-5 w-5" />} message="No KYC submissions" description="Member identity submissions will appear here." />
        ) : (
          <Table>
            <TableHeader>
              <TableHead>Member</TableHead>
              <TableHead>Legal name</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableHeader>
            <TableBody>
              {items.map((k) => (
                <TableRow key={k.id}>
                  <TableCell>
                    <Link href={`/admin/users/${k.userId}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {k.user.name}
                    </Link>
                    <span className="block text-xs text-slate-400">@{k.user.username}</span>
                  </TableCell>
                  <TableCell className="text-slate-700">{k.fullName}</TableCell>
                  <TableCell className="text-slate-600">{k.documentType.replaceAll("_", " ")}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{k.documentNumber}</TableCell>
                  <TableCell className="whitespace-nowrap text-slate-500">{formatDate(k.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={k.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <KycReviewActions
                      kycId={k.id}
                      status={k.status}
                      hasSupporting={Boolean(k.supportingKey)}
                      rejectionReason={k.rejectionReason}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
