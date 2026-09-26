import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireMemberPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldX, FileSearch, Clock } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/format";
import { KycForm } from "./kyc-form";
import { getMlmSettings } from "@/server/mlm/settings-service";

export const metadata: Metadata = { title: "KYC", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function KycPage() {
  const user = await requireMemberPage();
  const [submissions, settings] = await Promise.all([
    prisma.kyc.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    getMlmSettings(),
  ]);
  const latest = submissions[0];
  const canSubmit = !latest || latest.status === "REJECTED";

  const statusConfig = {
    NOT_SUBMITTED: {
      icon: ShieldCheck,
      tone: "text-slate-400",
      bg: "bg-slate-50 border-slate-200",
      title: "KYC not submitted yet",
      body: settings.kycRequiredForWithdrawal
        ? "This platform requires identity verification before withdrawals. Submit your documents below."
        : "Completing KYC verifies your identity and unlocks full platform access.",
    },
    PENDING: {
      icon: Clock,
      tone: "text-amber-500",
      bg: "bg-amber-50 border-amber-200",
      title: "Verification in review",
      body: "An administrator is reviewing your documents. This usually takes 1–3 business days.",
    },
    APPROVED: {
      icon: ShieldCheck,
      tone: "text-emerald-500",
      bg: "bg-emerald-50 border-emerald-200",
      title: "Identity verified",
      body: "Your KYC is approved. You can use all platform features, including withdrawals.",
    },
    REJECTED: {
      icon: ShieldX,
      tone: "text-rose-500",
      bg: "bg-rose-50 border-rose-200",
      title: "KYC rejected",
      body: latest?.rejectionReason
        ? `Reason: ${latest.rejectionReason}. You can submit a new request below.`
        : "Your submission was rejected. You can submit a new request below.",
    },
  }[latest?.status ?? "NOT_SUBMITTED"];

  return (
    <>
      <PageHeader title="KYC Verification" description="Verify your identity to unlock withdrawals and full account access." />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardBody className="flex flex-col items-center py-8 text-center">
              <div className={`flex h-14 w-14 items-center justify-center rounded-full ${statusConfig.bg.split(" ")[1].replace("border-", "bg-")} ${statusConfig.tone}`}>
                <statusConfig.icon className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{statusConfig.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{statusConfig.body}</p>
              {latest && (
                <div className="mt-5 w-full rounded-lg bg-slate-50 px-4 py-3 text-left text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Submitted</span>
                    <span className="font-medium text-slate-700">{formatDate(latest.createdAt)}</span>
                  </div>
                  {latest.reviewedAt && (
                    <div className="mt-1.5 flex items-center justify-between">
                      <span>Reviewed</span>
                      <span className="font-medium text-slate-700">{formatDate(latest.reviewedAt)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {submissions.length > 1 && (
            <Card className="mt-4">
              <CardHeader title="History" />
              <ul className="divide-y divide-slate-100">
                {submissions.slice(1).map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="text-slate-500">{formatDateTime(s.createdAt)}</span>
                    <StatusBadge status={s.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title={canSubmit ? "Submit your identity" : "Your current submission"}
            description="Documents are stored privately and are only visible to you and authorized administrators."
            action={
              <Badge tone="info">
                <FileSearch className="h-3.5 w-3.5" /> Encrypted at rest · Private access
              </Badge>
            }
          />
          <CardBody>
            {canSubmit ? (
              <KycForm />
            ) : (
              <div className="space-y-4">
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <Item k="Legal name" v={latest!.fullName} />
                  <Item k="Document type" v={latest!.documentType} />
                  <Item k="Document number" v={latest!.documentNumber} />
                  <Item k="Date of birth" v={latest!.dateOfBirth ? formatDate(latest!.dateOfBirth) : "—"} />
                  <Item k="Address" v={latest!.address ?? "—"} />
                  <Item k="Status" v={<StatusBadge status={latest!.status} />} />
                </dl>
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <a
                    href={`/api/documents/${latest!.id}/document`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <FileSearch className="h-4 w-4 text-slate-400" /> View ID document
                  </a>
                  {latest!.supportingKey && (
                    <a
                      href={`/api/documents/${latest!.id}/supporting`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      <FileSearch className="h-4 w-4 text-slate-400" /> View supporting document
                    </a>
                  )}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Item({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{k}</dt>
      <dd className="mt-0.5 font-medium text-slate-800">{v}</dd>
    </div>
  );
}
