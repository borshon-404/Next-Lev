"use client";

import { useActionState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { fieldError } from "@/components/ui/form-error";
import { saveSystemSettingsAction, type AdminActionResult } from "@/server/admin/actions";

export function SettingsForm({
  initial,
  existingKeys,
}: {
  initial: { payment_instructions: string; support_email: string };
  existingKeys: string[];
}) {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(saveSystemSettingsAction, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </div>
      )}
      {state.info && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {state.info}
        </div>
      )}
      <Input label="Support email" name="support_email" type="email" defaultValue={initial.support_email} error={fieldError(state, "support_email")} />
      <Textarea
        label="Payment instructions (manual payments)"
        name="payment_instructions"
        rows={6}
        defaultValue={initial.payment_instructions}
        placeholder="e.g. Send your payment to … Account ending 4471, reference your payment ID. …"
        hint={existingKeys.length === 0 ? "No value stored yet — members see a built-in default until you save." : undefined}
      />
      <div>
        <Button type="submit" loading={pending}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
