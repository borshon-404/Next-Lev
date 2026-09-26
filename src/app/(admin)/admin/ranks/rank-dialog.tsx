"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, AlertCircle, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Checkbox } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { fieldError } from "@/components/ui/form-error";
import { saveRankAction, type AdminActionResult } from "@/server/admin/actions";

export interface RankInitial {
  rankId: string;
  name: string;
  level: number;
  minDirectReferrals: number;
  minTeamMembers: number;
  minPersonalVolume: number;
  minTeamVolume: number;
  bonus: number;
  colorHex: string;
  isActive: boolean;
}

export function RankDialog({ triggerLabel, initial }: { triggerLabel: string; initial: RankInitial | null }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(saveRankAction, {});

  return (
    <>
      <Button size="sm" variant={initial ? "outline" : "primary"} onClick={() => setOpen(true)}>
        {!pending && (initial ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
        {triggerLabel}
      </Button>
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={initial ? `Edit ${initial.name}` : "New rank"}
        description="Higher level = higher rank. A member qualifies when ALL minimums are met."
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
          <input type="hidden" name="rankId" value={initial?.rankId ?? ""} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" name="name" defaultValue={initial?.name ?? ""} required error={fieldError(state, "name")} />
            <Input label="Level (ordering)" name="level" type="number" min="1" defaultValue={initial?.level ?? 1} required error={fieldError(state, "level")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Min direct referrals" name="minDirectReferrals" type="number" min="0" defaultValue={initial?.minDirectReferrals ?? 0} />
            <Input label="Min team members" name="minTeamMembers" type="number" min="0" defaultValue={initial?.minTeamMembers ?? 0} />
            <Input label="Min personal volume" name="minPersonalVolume" type="number" min="0" step="0.01" defaultValue={initial?.minPersonalVolume ?? 0} />
            <Input label="Min team volume" name="minTeamVolume" type="number" min="0" step="0.01" defaultValue={initial?.minTeamVolume ?? 0} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="One-time bonus (USD)" name="bonus" type="number" min="0" step="0.01" defaultValue={initial?.bonus ?? 0} hint="Credited on promotion." />
            <Input label="Color" name="colorHex" type="color" defaultValue={initial?.colorHex ?? "#6366f1"} className="h-10" />
            <div className="flex items-end pb-1">
              <Checkbox name="isActive" defaultChecked={initial?.isActive ?? true} label="Active (can be achieved)" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Save rank
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
