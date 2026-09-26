import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth/guards";
import { getMlmSettings } from "@/server/mlm/settings-service";
import { PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { MlmSettingsForm } from "./mlm-settings-form";

export const metadata: Metadata = { title: "MLM Settings", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminMlmSettingsPage() {
  await requireAdminPage();
  const settings = await getMlmSettings();

  return (
    <>
      <PageHeader
        title="MLM Settings"
        description="The entire compensation plan configuration. Changes apply to new transactions and are audit-logged."
        actions={
          <Badge tone="info">
            {settings.planType} · {settings.currency}
          </Badge>
        }
      />

      <MlmSettingsForm
        initial={{
          commissionEnabled: settings.commissionEnabled,
          commissionAutoApprove: settings.commissionAutoApprove,
          qualification: settings.qualification,
          referralRequired: settings.referralRequired,
          emailVerificationRequired: settings.emailVerificationRequired,
          phoneVerificationRequired: settings.phoneVerificationRequired,
          kycRequiredForActivation: settings.kycRequiredForActivation,
          autoActivate: settings.autoActivate,
          packageRequiredForActivation: settings.packageRequiredForActivation,
          minWithdrawal: settings.minWithdrawalNum,
          maxWithdrawal: settings.maxWithdrawalNum,
          withdrawalFeePercent: settings.withdrawalFeePercentNum,
          withdrawalFeeFixed: settings.withdrawalFeeFixedNum,
          kycRequiredForWithdrawal: settings.kycRequiredForWithdrawal,
        }}
      />
    </>
  );
}
