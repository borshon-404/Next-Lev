"use client";

import { useActionState, useState } from "react";
import { Check, X, Loader2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { reviewWithdrawalAction, type AdminActionResult } from "@/server/admin/actions";

export function WithdrawalActions({ withdrawalId, status }: { withdrawalId: string; status: string }) {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(reviewWithdrawalAction, {});
  const [open, setOpen] = useState<null | "APPROVE" | "REJECT" | "COMPLETE" | "MARK_PROCESSING">(null);
  const [note, setNote] = useState("");

  const busy = pending;
  const run = (action: string) => {
    const fd = new FormData();
    fd.set("withdrawalId", withdrawalId);
    fd.set("action", action);
    if (note) fd.set("note", note);
    void formAction(fd);
  };

  if (!["PENDING", "APPROVED", "PROCESSING"].includes(status)) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const options: { key: string; label: string; tone: string; icon: React.ReactNode }[] = [];
  if (status === "PENDING") {
    options.push(
      { key: "APPROVE", label: "Approve", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100", icon: <Check className="h-3.5 w-3.5" /> },
      { key: "REJECT", label: "Reject", tone: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100", icon: <X className="h-3.5 w-3.5" /> }
    );
  }
  if (status === "APPROVED") {
    options.push(
      { key: "MARK_PROCESSING", label: "Processing", tone: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100", icon: <Loader2 className="h-3.5 w-3.5" /> },
      { key: "COMPLETE", label: "Complete", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100", icon: <Check className="h-3.5 w-3.5" /> }
    );
  }
  if (status === "PROCESSING") {
    options.push({ key: "COMPLETE", label: "Complete", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100", icon: <Check className="h-3.5 w-3.5" /> });
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {options.map((o) => (
          <button
            key={o.key}
            disabled={busy}
            onClick={() => {
              setNote("");
              setOpen(o.key as never);
            }}
            className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:opacity-50 ${o.tone}`}
          >
            {o.icon} {o.label}
          </button>
        ))}
      </div>

      <ConfirmDialog
        open={open !== null}
        onClose={() => !busy && setOpen(null)}
        title={`${open ?? ""} withdrawal?`}
        message={
          <>
            {state.error && <p className="mb-2 text-rose-600">{state.error}</p>}
            {open === "REJECT" && "The held amount is refunded to the member's available balance."}
            {open === "COMPLETE" && "Records the payout as sent (the wallet debit already happened at request time)."}
            {open === "APPROVE" && "Moves the request to approved; funds remain held until completion."}
          </>
        }
        confirmLabel={open === "REJECT" ? "Reject & refund" : open === "COMPLETE" ? "Mark completed" : "Confirm"}
        variant={open === "REJECT" ? "danger" : "primary"}
        loading={busy}
        onConfirm={() => {
          if (open) {
            run(open);
            if (state.info) location.reload();
          }
        }}
      >
        <Input label="Note (visible to member)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </ConfirmDialog>
    </>
  );
}
