"use client";

import { useActionState, useState } from "react";
import { Check, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { approveCommissionAction, cancelCommissionAction, type AdminActionResult } from "@/server/admin/actions";

export function CommissionActions({
  commissionId,
  status,
  beneficiaryName,
}: {
  commissionId: string;
  status: string;
  beneficiaryName: string;
}) {
  const [pending, setPending] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [approveState, approveAction, approvePending] = useActionState<AdminActionResult, FormData>(approveCommissionAction, {});
  const [cancelState, cancelAction, cancelPending] = useActionState<AdminActionResult, FormData>(cancelCommissionAction, {});

  const busy = approvePending || cancelPending || pending;

  if (status !== "PENDING") {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        onClick={async () => {
          setPending(true);
          const fd = new FormData();
          fd.set("commissionId", commissionId);
          await approveAction(fd);
          setPending(false);
          if (approveState.info) location.reload();
        }}
        disabled={busy}
        title="Approve"
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
      >
        <Check className="h-3.5 w-3.5" /> Approve
      </button>
      <button
        onClick={() => setCancelOpen(true)}
        disabled={busy}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" /> Cancel
      </button>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => !cancelPending && setCancelOpen(false)}
        title="Cancel commission?"
        message={
          <>
            {cancelState.error && <p className="mb-2 text-rose-600">{cancelState.error}</p>}
            The pending amount will be removed from {beneficiaryName}&apos;s pending balance. This is audit-logged.
          </>
        }
        confirmLabel="Cancel commission"
        variant="danger"
        loading={cancelPending}
        onConfirm={() => {
          const fd = new FormData();
          fd.set("commissionId", commissionId);
          if (reason) fd.set("reason", reason);
          void cancelAction(fd);
          if (cancelState.info) location.reload();
        }}
      >
        <Input label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. purchase refunded" />
      </ConfirmDialog>
    </div>
  );
}
