"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, AlertCircle, Landmark, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { fieldError } from "@/components/ui/form-error";
import { requestWithdrawalAction, cancelWithdrawalAction, type MemberActionResult } from "@/server/members/actions";
import { formatCurrency } from "@/lib/format";

export function NewWithdrawalDialog({
  settings,
  disabled,
}: {
  settings: { min: number; max: number; feePercent: number; feeFixed: number; currency: string };
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<MemberActionResult, FormData>(requestWithdrawalAction, {});
  const [amount, setAmount] = useState("");

  const amt = parseFloat(amount) || 0;
  const feeR = amt > 0 ? Math.round((amt * (settings.feePercent / 100) + settings.feeFixed) * 100) / 100 : 0;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        <Landmark className="h-4 w-4" /> New withdrawal
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          if (!pending) {
            setOpen(false);
            setAmount("");
          }
        }}
        title="Request a withdrawal"
        description={`Min ${settings.min.toFixed(2)} · Max ${settings.max.toFixed(2)} ${settings.currency}. Funds are held until the request is reviewed and completed.`}
      >
        <form action={formAction} className="space-y-4">
          {state.info && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {state.info}
              <button type="button" className="ml-auto text-emerald-600" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {state.error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {state.error}
            </div>
          )}

          <Input
            label={`Amount (${settings.currency})`}
            name="amount"
            type="number"
            step="0.01"
            min={settings.min}
            max={settings.max}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={fieldError(state, "amount") ?? (state.error && amt > 0 ? state.error : undefined)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Payment method" name="paymentMethod" defaultValue="bank" required>
              <option value="bank">Bank transfer</option>
              <option value="paypal">PayPal</option>
              <option value="crypto">Crypto (USDT)</option>
              <option value="other">Other</option>
            </Select>
            <Input label="Account details" name="accountDetails" placeholder="IBAN / email / wallet address" required error={fieldError(state, "accountDetails")} />
          </div>
          <Textarea label="Note (optional)" name="note" rows={2} placeholder="Anything the reviewer should know" />

          {amt > 0 && (
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Fee ({settings.feePercent}%{settings.feeFixed > 0 ? ` + ${settings.feeFixed.toFixed(2)}` : ""})</span>
                <span className="tabular-nums">−{formatCurrency(feeR)}</span>
              </div>
              <div className="mt-1 flex justify-between font-semibold text-slate-900">
                <span>You receive</span>
                <span className="tabular-nums">{formatCurrency(Math.max(0, amt - feeR))}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Request withdrawal
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function CancelWithdrawalButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<MemberActionResult, FormData>(cancelWithdrawalAction, {});

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
      >
        Cancel request
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Cancel withdrawal?"
        message={
          <>
            {state.error && <p className="mb-2 text-rose-600">{state.error}</p>}
            The held amount will be refunded to your available balance.
          </>
        }
        confirmLabel="Cancel withdrawal"
        variant="danger"
        loading={pending}
        onConfirm={() => {
          const fd = new FormData();
          fd.set("id", id);
          void formAction(fd);
        }}
      />
    </>
  );
}
