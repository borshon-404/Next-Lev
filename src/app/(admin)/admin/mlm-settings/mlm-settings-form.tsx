"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/input";
import { saveMlmSettingsAction, type AdminActionResult } from "@/server/admin/actions";

interface Initial {
  commissionEnabled: boolean;
  commissionAutoApprove: boolean;
  qualification: {
    requireActiveMembership: boolean;
    requireKyc: boolean;
    requirePackage: boolean;
    minDirectReferrals: number;
    minPersonalVolume: number;
    minTeamVolume: number;
    minMonthlySales: number;
  };
  referralRequired: boolean;
  emailVerificationRequired: boolean;
  phoneVerificationRequired: boolean;
  kycRequiredForActivation: boolean;
  autoActivate: boolean;
  packageRequiredForActivation: boolean;
  minWithdrawal: number;
  maxWithdrawal: number;
  withdrawalFeePercent: number;
  withdrawalFeeFixed: number;
  kycRequiredForWithdrawal: boolean;
}

export function MlmSettingsForm({ initial }: { initial: Initial }) {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(saveMlmSettingsAction, {});
  const [commissionEnabled, setCommissionEnabled] = useState(initial.commissionEnabled);
  const [autoApprove, setAutoApprove] = useState(initial.commissionAutoApprove);
  const [q, setQ] = useState(initial.qualification);
  const [referralRequired, setReferralRequired] = useState(initial.referralRequired);
  const [emailVerification, setEmailVerification] = useState(initial.emailVerificationRequired);
  const [phoneVerification, setPhoneVerification] = useState(initial.phoneVerificationRequired);
  const [kycForActivation, setKycForActivation] = useState(initial.kycRequiredForActivation);
  const [autoActivate, setAutoActivate] = useState(initial.autoActivate);
  const [packageForActivation, setPackageForActivation] = useState(initial.packageRequiredForActivation);
  const [minW, setMinW] = useState(String(initial.minWithdrawal));
  const [maxW, setMaxW] = useState(String(initial.maxWithdrawal));
  const [feePct, setFeePct] = useState(String(initial.withdrawalFeePercent));
  const [feeFixed, setFeeFixed] = useState(String(initial.withdrawalFeeFixed));
  const [kycForWithdrawal, setKycForWithdrawal] = useState(initial.kycRequiredForWithdrawal);

  const payload = JSON.stringify({
    commissionEnabled,
    commissionAutoApprove: autoApprove,
    qualification: q,
    referralRequired,
    emailVerificationRequired: emailVerification,
    phoneVerificationRequired: phoneVerification,
    kycRequiredForActivation: kycForActivation,
    autoActivate,
    packageRequiredForActivation: packageForActivation,
    minWithdrawal: parseFloat(minW) || 0,
    maxWithdrawal: parseFloat(maxW) || 0,
    withdrawalFeePercent: parseFloat(feePct) || 0,
    withdrawalFeeFixed: parseFloat(feeFixed) || 0,
    kycRequiredForWithdrawal: kycForWithdrawal,
  });

  return (
    <form action={formAction} className="space-y-4 pb-6">
      {state.error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </div>
      )}
      {state.info && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {state.info}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Commission" description="Engine toggles and qualification rules applied before paying each level." />
          <CardBody className="space-y-4">
            <Checkbox checked={commissionEnabled} onCheckedChange={(v) => setCommissionEnabled(v === true)} label="Commission engine enabled" />
            <Checkbox
              checked={autoApprove}
              onCheckedChange={(v) => setAutoApprove(v === true)}
              label="Auto-approve commissions (credit available balance immediately instead of pending)"
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Qualification rules (all must pass)</p>
              <div className="space-y-2.5">
                <Checkbox
                  checked={q.requireActiveMembership}
                  onCheckedChange={(v) => setQ({ ...q, requireActiveMembership: v === true })}
                  label="Member must have an active account"
                />
                <Checkbox checked={q.requireKyc} onCheckedChange={(v) => setQ({ ...q, requireKyc: v === true })} label="KYC must be approved" />
                <Checkbox
                  checked={q.requirePackage}
                  onCheckedChange={(v) => setQ({ ...q, requirePackage: v === true })}
                  label="Must own at least one completed package purchase"
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Input label="Min direct referrals" type="number" min="0" value={q.minDirectReferrals} onChange={(e) => setQ({ ...q, minDirectReferrals: parseInt(e.target.value) || 0 })} />
                <Input label="Min personal volume" type="number" min="0" step="0.01" value={q.minPersonalVolume} onChange={(e) => setQ({ ...q, minPersonalVolume: parseFloat(e.target.value) || 0 })} />
                <Input label="Min team volume" type="number" min="0" step="0.01" value={q.minTeamVolume} onChange={(e) => setQ({ ...q, minTeamVolume: parseFloat(e.target.value) || 0 })} />
                <Input label="Min monthly sales" type="number" min="0" step="0.01" value={q.minMonthlySales} onChange={(e) => setQ({ ...q, minMonthlySales: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Withdrawals" description="Limits and fees validated on every request." />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Minimum withdrawal" type="number" min="0" step="0.01" value={minW} onChange={(e) => setMinW(e.target.value)} />
              <Input label="Maximum withdrawal" type="number" min="0" step="0.01" value={maxW} onChange={(e) => setMaxW(e.target.value)} />
              <Input label="Fee (%)" type="number" min="0" max="100" step="0.01" value={feePct} onChange={(e) => setFeePct(e.target.value)} />
              <Input label="Fee (fixed)" type="number" min="0" step="0.01" value={feeFixed} onChange={(e) => setFeeFixed(e.target.value)} />
            </div>
            <Checkbox
              checked={kycForWithdrawal}
              onCheckedChange={(v) => setKycForWithdrawal(v === true)}
              label="KYC approval required before withdrawing"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Registration" description="Entry requirements for new members." />
          <CardBody className="space-y-3">
            <Checkbox checked={referralRequired} onCheckedChange={(v) => setReferralRequired(v === true)} label="Referral code required to register" />
            <Checkbox
              checked={emailVerification}
              onCheckedChange={(v) => setEmailVerification(v === true)}
              label="Email verification required (sends a verification email on registration)"
            />
            <Checkbox
              checked={phoneVerification}
              onCheckedChange={(v) => setPhoneVerification(v === true)}
              label="Phone verification required (architecture — connect an SMS provider)"
            />
            <Checkbox checked={kycForActivation} onCheckedChange={(v) => setKycForActivation(v === true)} label="KYC required for activation" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Account activation" description="How new accounts become active." />
          <CardBody className="space-y-3">
            <Checkbox checked={autoActivate} onCheckedChange={(v) => setAutoActivate(v === true)} label="Activate accounts automatically on registration" />
            <Checkbox
              checked={packageForActivation}
              onCheckedChange={(v) => setPackageForActivation(v === true)}
              label="Require a package purchase for activation"
            />
            <p className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-500">
              Suspension and account resets are performed per-user from the Users page and are always audit-logged.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-3">
          <input type="hidden" name="payload" value={payload} />
          <Button type="submit" loading={pending}>
            Save MLM settings
          </Button>
        </div>
      </div>
    </form>
  );
}
