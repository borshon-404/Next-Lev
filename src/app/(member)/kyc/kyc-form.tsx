"use client";

import { useActionState } from "react";
import { CheckCircle2, AlertCircle, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { fieldError } from "@/components/ui/form-error";
import { submitKycAction, type MemberActionResult } from "@/server/members/actions";

export function KycForm() {
  const [state, formAction, pending] = useActionState<MemberActionResult, FormData>(submitKycAction, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
        </div>
      )}
      {state.info && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {state.info}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full legal name" name="fullName" placeholder="As shown on your ID" required error={fieldError(state, "fullName")} />
        <Input label="Date of birth" name="dateOfBirth" type="date" error={fieldError(state, "dateOfBirth")} />
      </div>
      <Input label="Address" name="address" placeholder="Street, city, postal code" error={fieldError(state, "address")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Document type" name="documentType" defaultValue="NID" required error={fieldError(state, "documentType")}>
          <option value="NID">National ID</option>
          <option value="PASSPORT">Passport</option>
          <option value="DRIVING_LICENSE">Driving license</option>
          <option value="OTHER">Other government ID</option>
        </Select>
        <Input label="Document number" name="documentNumber" placeholder="e.g. A1234567" required error={fieldError(state, "documentNumber")} />
      </div>

      <FileField name="document" label="Identification document" hint="JPG, PNG, WEBP or PDF · max 5 MB" required error={fieldError(state, "document")} />
      <FileField name="supporting" label="Supporting document (optional)" hint="e.g. proof of address · max 5 MB" />

      <div className="rounded-lg bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
        By submitting, you confirm the information is accurate and you consent to its verification. Documents are
        stored privately and accessed only by you and authorized administrators.
      </div>

      <div>
        <Button type="submit" loading={pending}>
          Submit for review
        </Button>
      </div>
    </form>
  );
}

function FileField({ name, label, hint, required, error }: { name: string; label: string; hint?: string; required?: boolean; error?: string }) {
  return (
    <div>
      <label htmlFor={`kyc-${name}`} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <label
        htmlFor={`kyc-${name}`}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-6 py-6 text-center transition-colors ${
          error ? "border-rose-300 bg-rose-50/40" : "border-slate-300 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/30"
        }`}
      >
        <UploadCloud className="h-6 w-6 text-slate-400" />
        <span className="text-sm font-medium text-slate-600">Click to choose a file</span>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
        <input
          id={`kyc-${name}`}
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required={required}
          className="hidden"
        />
      </label>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
