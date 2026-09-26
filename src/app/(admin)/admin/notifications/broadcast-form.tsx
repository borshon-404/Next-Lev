"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, AlertCircle, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { broadcastAnnouncementAction, type AdminActionResult } from "@/server/admin/actions";

export function BroadcastForm() {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(broadcastAnnouncementAction, {});
  const [sent, setSent] = useState(false);

  return (
    <form
      action={formAction}
      className="space-y-3.5"
      onSubmit={() => setSent(false)}
    >
      {state.error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {state.error}
        </div>
      )}
      {(state.info || sent) && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {state.info ?? "Announcement sent."}
        </div>
      )}
      <Input label="Title" name="title" placeholder="e.g. Scheduled maintenance Saturday" required />
      <Textarea label="Message" name="body" rows={4} placeholder="What should members know?" required />
      <Button type="submit" loading={pending}>
        {!pending && <Megaphone className="h-4 w-4" />} Broadcast to all members
      </Button>
    </form>
  );
}
