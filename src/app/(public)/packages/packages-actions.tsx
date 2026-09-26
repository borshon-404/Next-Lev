"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, AlertCircle, ShoppingCart, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { createPurchaseAction, type MemberActionResult } from "@/server/members/actions";
import { formatCurrency } from "@/lib/format";

export function PurchaseButton({
  packageId,
  name,
  price,
  currency,
  disabled,
}: {
  packageId: string;
  name: string;
  price: number;
  currency: string;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [instructions, setInstructions] = useState<MemberActionResult | null>(null);
  const [state, formAction, pending] = useActionState<MemberActionResult, FormData>(createPurchaseAction, {});

  const started = Boolean(state.info);

  return (
    <>
      <Button
        className="w-full"
        disabled={disabled || pending}
        loading={pending}
        onClick={() => {
          if (!pending) setConfirming(true);
        }}
      >
        {!pending && <ShoppingCart className="h-4 w-4" />}
        {disabled ? "Current package" : pending ? "Starting purchase…" : `Buy ${name} — ${formatCurrency(price, currency)}`}
      </Button>

      {/* Confirm + result dialog */}
      <Dialog
        open={confirming}
        onClose={() => !pending && setConfirming(false)}
        title={started ? "Purchase started" : `Purchase ${name}`}
        description={started ? "Follow the payment instructions below." : `One-time payment of ${formatCurrency(price, currency)}. You can cancel while the payment is pending.`}
      >
        {started ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0" />
              <span>
                Your purchase is <strong>PENDING</strong>. Complete the payment, then an administrator confirms it.
                Track the status under <a className="font-semibold underline" href="/purchases">My Purchases</a>.
              </span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-relaxed text-slate-600">
              <p className="mb-1.5 flex items-center gap-2 font-semibold text-slate-800">
                <Landmark className="h-4 w-4 text-slate-400" /> Payment instructions
              </p>
              {state.info}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setConfirming(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            {state.error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {state.error}
              </div>
            )}
            <input type="hidden" name="packageId" value={packageId} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Continue to payment
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
