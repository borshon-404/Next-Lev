import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth/guards";
import { getSystemSetting, getAllSystemSettings } from "@/server/settings/system-settings";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdminPage();
  const all = await getAllSystemSettings();
  const paymentInstructions = (await getSystemSetting<string>("payment_instructions")) ?? "";
  const supportEmail = (await getSystemSetting<string>("support_email")) ?? siteConfig.supportEmail;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Platform-level settings: payment instructions and support contact. The compensation plan is configured under MLM Settings."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Payment instructions"
            description="Shown to members when they start a manual (offline) payment. Replace with real account details or connect a payment gateway."
          />
          <CardBody>
            <SettingsForm
              initial={{ payment_instructions: paymentInstructions, support_email: supportEmail }}
              existingKeys={Object.keys(all)}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Storage & security" description="How the platform handles private data." />
          <CardBody className="space-y-3 text-sm text-slate-600">
            <InfoRow
              k="KYC document storage"
              v={
                process.env.STORAGE_DRIVER === "s3"
                  ? "S3-compatible object storage (private ACL)"
                  : "Local private directory (development). Configure STORAGE_DRIVER=s3 + S3_* env vars for production — Vercel has no persistent disk."
              }
            />
            <InfoRow k="Document access" v="Only the document owner or administrators, through the authenticated /api/documents route. No public URLs." />
            <InfoRow k="Sessions" v="Auth.js JWT sessions; role and status are re-read from the database on every request so suspensions apply immediately." />
            <InfoRow k="Rate limiting" v="In-memory fixed-window limits on login, registration and password-reset requests (swap for a distributed store for multi-instance deployments)." />
            <InfoRow k="Audit trail" v="Every sensitive admin action (status changes, wallet adjustments, commission/withdrawal/KYC decisions, settings changes) is written to the immutable audit log." />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</p>
      <p className="mt-1 text-sm leading-relaxed">{v}</p>
    </div>
  );
}
