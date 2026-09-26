"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { cancelPurchaseAction, type MemberActionResult } from "@/server/members/actions";

export function CancelPurchaseButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<MemberActionResult, FormData>(cancelPurchaseAction, {});

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        onClick={() => setOpen(true)}
      >
        Cancel
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Cancel this purchase?"
        message={
          <>
            {state.error && <p className="mb-2 text-rose-600">{state.error}</p>}
            {state.info && <p className="mb-2 text-emerald-600">{state.info}</p>}
            The pending payment will be cancelled. You can start a new purchase at any time.
          </>
        }
        confirmLabel="Cancel purchase"
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
