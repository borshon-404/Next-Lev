import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/server/auth/guards";
import { getMlmSettings } from "@/server/mlm/settings-service";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Percent, Calculator, SlidersHorizontal, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { RulesForm } from "./rules-form";

export const metadata: Metadata = { title: "Commission Rules", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminCommissionRulesPage() {
  await requireAdminPage();
  const settings = await getMlmSettings();
  const activeRules = settings.rules.filter((r) => r.active).sort((a, b) => a.level - b.level);
  const totalPct = activeRules.reduce((s, r) => s + r.percentage, 0);

  return (
    <>
      <PageHeader
        title="Commission Rules"
        description="Configure the levels and percentages of the unilevel plan. Changes take effect for new transactions and are audit-logged."
        actions={
          <Link href="/admin/mlm-settings" className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            <SlidersHorizontal className="h-4 w-4" /> All MLM settings <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Active levels" value={activeRules.length} icon={<Percent className="h-5 w-5" />} tone="info" />
        <StatCard label="Total payout rate" value={`${totalPct.toFixed(2)}%`} sub="Sum of active levels" icon={<Calculator className="h-5 w-5" />} />
        <StatCard label="Engine" value={settings.commissionEnabled ? "Enabled" : "Disabled"} icon={<Calculator className="h-5 w-5" />} tone={settings.commissionEnabled ? "success" : "danger"} />
        <StatCard label="Auto-approve" value={settings.commissionAutoApprove ? "Yes" : "No"} sub={settings.commissionAutoApprove ? "Commissions credit immediately" : "Commissions start as pending"} icon={<SlidersHorizontal className="h-5 w-5" />} />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Commission simulator"
          description="Preview how a hypothetical purchase distributes. Pure calculation — nothing is recorded."
        />
        <CardBody>
          <Simulator rules={activeRules} currency={settings.currency} />
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="Levels"
          description="Edit percentages and activate/deactivate levels. The number of configured levels is the number of levels paid."
        />
        <RulesForm
          initial={{
            commissionEnabled: settings.commissionEnabled,
            commissionAutoApprove: settings.commissionAutoApprove,
            rules: settings.rules.map((r) => ({ level: r.level, percentage: r.percentage, active: r.active, description: r.description ?? "" })),
          }}
        />
      </Card>
    </>
  );
}

import { Simulator } from "./simulator";
