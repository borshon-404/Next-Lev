"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, AlertCircle, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { fieldError } from "@/components/ui/form-error";
import { savePackageAction, type AdminActionResult } from "@/server/admin/actions";

export interface PackageInitial {
  packageId: string;
  name: string;
  description: string;
  price: number;
  pv: number;
  isActive: boolean;
  commissionEligible: boolean;
}

export function PackageDialog({ triggerLabel, initial }: { triggerLabel: string; initial: PackageInitial | null }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(savePackageAction, {});

  return (
    <>
      <Button
        size="sm"
        variant={initial ? "outline" : "primary"}
        onClick={() => setOpen(true)}
      >
        {!pending && (initial ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
        {triggerLabel}
      </Button>

      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={initial ? `Edit ${initial.name}` : "New package"}
        description="Prices are one-time. Personal volume (PV) feeds rank requirements; leave at 0 if not applicable."
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
            </div>
          )}
          <input type="hidden" name="packageId" value={initial?.packageId ?? ""} />
          <Input label="Name" name="name" defaultValue={initial?.name ?? ""} required error={fieldError(state, "name")} />
          <Textarea label="Description" name="description" rows={3} defaultValue={initial?.description ?? ""} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Price (USD)" name="price" type="number" step="0.01" min="0" defaultValue={initial?.price ?? ""} required error={fieldError(state, "price")} />
            <Input label="Personal volume (PV)" name="pv" type="number" step="0.01" min="0" defaultValue={initial?.pv ?? 0} error={fieldError(state, "pv")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Checkbox name="isActive" defaultChecked={initial?.isActive ?? true} label="Active (visible & purchasable)" />
            <Checkbox
              name="commissionEligible"
              defaultChecked={initial?.commissionEligible ?? true}
              label="Commission-eligible (purchases generate upline commissions)"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Save package
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
