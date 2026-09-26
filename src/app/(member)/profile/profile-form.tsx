"use client";

import { useActionState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldError } from "@/components/ui/form-error";
import { updateProfileAction, type MemberActionResult } from "@/server/members/actions";

export function ProfileForm({
  initial,
}: {
  initial: { fullName: string; phone: string; address: string; country: string; dateOfBirth: string };
}) {
  const [state, formAction, pending] = useActionState<MemberActionResult, FormData>(updateProfileAction, {});

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
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" name="fullName" defaultValue={initial.fullName} required error={fieldError(state, "fullName")} />
        <Input label="Phone" name="phone" defaultValue={initial.phone} required error={fieldError(state, "phone")} />
      </div>
      <Input label="Address" name="address" defaultValue={initial.address} placeholder="Street, city" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Country" name="country" defaultValue={initial.country} placeholder="e.g. United States" />
        <Input label="Date of birth" name="dateOfBirth" type="date" defaultValue={initial.dateOfBirth} />
      </div>
      <div>
        <Button type="submit" loading={pending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
