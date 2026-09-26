"use client";

import { useEffect, useActionState, useState } from "react";
import { CheckCircle2, AlertCircle, ShieldBan, ShieldCheck, Pencil, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { fieldError } from "@/components/ui/form-error";
import { setUserStatusAction, adminUpdateUserAction, adjustWalletAction, type AdminActionResult } from "@/server/admin/actions";

export function UserAdminActions({
  adminId,
  targetUserId,
  targetName,
  currentStatus,
  isAdmin,
  wallet,
  profile,
}: {
  adminId: string;
  targetUserId: string;
  targetName: string;
  currentStatus: string;
  isAdmin: boolean;
  wallet: { available: number };
  profile: { name: string; phone: string; address: string; country: string };
}) {
  const [statusDialog, setStatusDialog] = useState<null | "SUSPENDED" | "ACTIVE" | "INACTIVE" | "PENDING">(null);
  const [statusState, statusAction, statusPending] = useActionState<AdminActionResult, FormData>(setUserStatusAction, {});

  // Close the dialog automatically once the action succeeds.
  useEffect(() => {
    if (statusState.info && !statusPending) setStatusDialog(null);
  }, [statusState.info, statusPending]);
  const [editState, editAction, editPending] = useActionState<AdminActionResult, FormData>(adminUpdateUserAction, {});
  const [adjustState, adjustAction, adjustPending] = useActionState<AdminActionResult, FormData>(adjustWalletAction, {});

  return (
    <>
      <Card>
        <CardHeader title="Account status" description="Suspended users cannot log in or act. Changes are audit-logged." />
        <CardBody className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Current status</span>
            <span className="font-semibold text-slate-800">{currentStatus}</span>
          </div>
          {!isAdmin && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button size="sm" variant={currentStatus !== "ACTIVE" ? "primary" : "outline"} onClick={() => setStatusDialog("ACTIVE")}>
                <ShieldCheck className="h-4 w-4" /> Activate
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatusDialog("INACTIVE")}>
                Inactive
              </Button>
              <Button size="sm" variant="danger" onClick={() => setStatusDialog("SUSPENDED")}>
                <ShieldBan className="h-4 w-4" /> Suspend
              </Button>
            </div>
          )}
          {isAdmin && <p className="pt-1 text-xs text-slate-400">Administrator accounts are managed through a secure off-UI process.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Edit permitted fields" description="Name, phone, address and country. Email/username/sponsor are locked." />
        <CardBody>
          <form action={editAction} className="space-y-3.5">
            {editState.error && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {editState.error}
              </div>
            )}
            {editState.info && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {editState.info}
              </div>
            )}
            <input type="hidden" name="userId" value={targetUserId} />
            <Input label="Full name" name="name" defaultValue={profile.name} error={fieldError(editState, "name")} />
            <Input label="Phone" name="phone" defaultValue={profile.phone} error={fieldError(editState, "phone")} />
            <Input label="Address" name="address" defaultValue={profile.address} />
            <Input label="Country" name="country" defaultValue={profile.country} />
            <Button type="submit" size="sm" loading={editPending}>
              {!editPending && <Pencil className="h-4 w-4" />} Save
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Wallet adjustment"
          description={`Available balance: ${wallet.available.toFixed(2)} · Corrections only · audit-logged`}
        />
        <CardBody>
          <form action={adjustAction} className="space-y-3.5">
            {adjustState.error && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {adjustState.error}
              </div>
            )}
            {adjustState.info && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {adjustState.info}
              </div>
            )}
            <input type="hidden" name="userId" value={targetUserId} />
            <Input
              label="Amount (signed)"
              name="amount"
              type="number"
              step="0.01"
              placeholder="e.g. 25 (credit) or -10 (debit)"
              hint="Positive credits the wallet, negative debits it."
              error={fieldError(adjustState, "amount")}
            />
            <Input label="Reason" name="reason" placeholder="Why is this adjustment needed?" required error={fieldError(adjustState, "reason")} />
            <Button type="submit" size="sm" loading={adjustPending}>
              {!adjustPending && <Calculator className="h-4 w-4" />} Apply adjustment
            </Button>
          </form>
        </CardBody>
      </Card>

      <Dialog
        open={statusDialog !== null}
        onClose={() => !statusPending && setStatusDialog(null)}
        title={statusDialog === "SUSPENDED" ? `Suspend ${targetName}?` : `Set ${targetName} to ${statusDialog ?? ""}?`}
        description={statusDialog === "SUSPENDED" ? "The user will no longer be able to log in or perform operations. This is recorded in the audit log." : "This status change is recorded in the audit log."}
      >
        {statusDialog && (
          <form
            action={(fd) => statusAction(fd)}
            className="space-y-3.5"
          >
            {statusState.error && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {statusState.error}
              </div>
            )}
            <input type="hidden" name="userId" value={targetUserId} />
            <input type="hidden" name="status" value={statusDialog} />
            <Input
              label="Reason (optional)"
              name="reason"
              placeholder="Visible to the user when suspended"
              error={fieldError(statusState, "reason")}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setStatusDialog(null)} disabled={statusPending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" variant={statusDialog === "SUSPENDED" ? "danger" : "primary"} loading={statusPending}>
                Confirm
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
