"use client";

import { useActionState, useState } from "react";
import { Check, X, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { reviewKycAction, type AdminActionResult } from "@/server/admin/actions";

export function KycReviewActions({
  kycId,
  status,
  hasSupporting,
  rejectionReason,
}: {
  kycId: string;
  status: string;
  hasSupporting: boolean;
  rejectionReason: string | null;
}) {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(reviewKycAction, {});
  const [open, setOpen] = useState<null | "APPROVE" | "REJECT">(null);
  const [reason, setReason] = useState("");

  if (status !== "PENDING") {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <a
          href={`/api/documents/${kycId}/document`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          title="View ID document (private)"
        >
          <FileSearch className="h-3.5 w-3.5" /> Document
        </a>
        {rejectionReason && <span className="max-w-[140px] truncate text-[11px] text-rose-500" title={rejectionReason}>{rejectionReason}</span>}
      </div>
    );
  }

  const run = (decision: string) => {
    const fd = new FormData();
    fd.set("kycId", kycId);
    fd.set("decision", decision);
    if (reason) fd.set("reason", reason);
    void formAction(fd);
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={() => {
            setReason("");
            setOpen("APPROVE");
          }}
          disabled={pending}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" /> Approve
        </button>
        <button
          onClick={() => {
            setReason("");
            setOpen("REJECT");
          }}
          disabled={pending}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" /> Reject
        </button>
        <a
          href={`/api/documents/${kycId}/document`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          title="View ID document (private)"
        >
          <FileSearch className="h-3.5 w-3.5" />
        </a>
        {hasSupporting && (
          <a
            href={`/api/documents/${kycId}/supporting`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
            title="View supporting document (private)"
          >
            <FileSearch className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <ConfirmDialog
        open={open !== null}
        onClose={() => !pending && setOpen(null)}
        title={open === "APPROVE" ? "Approve KYC?" : "Reject KYC?"}
        message={
          <>
            {state.error && <p className="mb-2 text-rose-600">{state.error}</p>}
            {open === "APPROVE"
              ? "The member will be notified and can use withdrawals (if required for them)."
              : "A rejection reason is required. The member can resubmit."}
          </>
        }
        confirmLabel={open === "APPROVE" ? "Approve" : "Reject"}
        variant={open === "REJECT" ? "danger" : "primary"}
        loading={pending}
        onConfirm={() => {
          if (open) {
            run(open);
            if (state.info) location.reload();
          }
        }}
      >
        {open === "REJECT" && (
          <Input label="Rejection reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Document is blurry" required />
        )}
      </ConfirmDialog>
    </>
  );
}
