"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, AlertCircle, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { fieldError } from "@/components/ui/form-error";
import { createDepositAction, reviewDepositAction, type AdminActionResult } from "@/server/admin/actions";

export function NewDepositDialog({ members }: { members: { value: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(createDepositAction, {});

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New deposit
      </Button>
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Record a deposit"
        description="Creates a PENDING deposit. Complete it once funds are verified to credit the member's wallet."
      >
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
            </div>
          )}
          {state.info && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {state.info}
              <button type="button" className="ml-auto" onClick={() => setOpen(false)}>
                <X className="h-4 w-4 text-emerald-600" />
              </button>
            </div>
          )}
          <Select label="Member" name="userId" defaultValue="" required>
            <option value="" disabled>
              Choose a member…
            </option>
            {members.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Amount (USD)" name="amount" type="number" step="0.01" min="0.01" required error={fieldError(state, "amount")} />
            <Input label="Method" name="method" placeholder="Bank transfer" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Reference" name="reference" placeholder="e.g. TRF-2024-001" />
            <Input label="Note" name="note" placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Create deposit
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function DepositActions({ depositId, status }: { depositId: string; status: string }) {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(reviewDepositAction, {});
  const [open, setOpen] = useState<null | "COMPLETE" | "CANCEL">(null);
  const [note, setNote] = useState("");

  if (status !== "PENDING") return <span className="text-xs text-slate-400">—</span>;

  const run = (decision: string) => {
    const fd = new FormData();
    fd.set("depositId", depositId);
    fd.set("decision", decision);
    if (note) fd.set("note", note);
    void formAction(fd);
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={() => setOpen("COMPLETE")}
          disabled={pending}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" /> Complete
        </button>
        <button
          onClick={() => setOpen("CANCEL")}
          disabled={pending}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
      <ConfirmDialog
        open={open !== null}
        onClose={() => !pending && setOpen(null)}
        title={open === "COMPLETE" ? "Complete deposit?" : "Cancel deposit?"}
        message={
          <>
            {state.error && <p className="mb-2 text-rose-600">{state.error}</p>}
            {open === "COMPLETE"
              ? "Credits the member's available balance and records the financial transaction."
              : "The record is cancelled; no wallet movement occurs."}
          </>
        }
        confirmLabel={open === "COMPLETE" ? "Complete & credit" : "Cancel deposit"}
        variant={open === "CANCEL" ? "danger" : "primary"}
        loading={pending}
        onConfirm={() => {
          if (open) {
            run(open);
            if (state.info) location.reload();
          }
        }}
      >
        <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      </ConfirmDialog>
    </>
  );
}
