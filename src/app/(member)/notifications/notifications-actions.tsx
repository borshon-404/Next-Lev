"use client";

import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarkAllReadButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      loading={pending}
      onClick={async () => {
        setPending(true);
        const { markAllNotificationsReadAction } = await import("@/server/members/actions");
        await markAllNotificationsReadAction({}, new FormData());
        setPending(false);
        location.reload();
      }}
    >
      {!pending && <CheckCheck className="h-4 w-4" />}
      Mark all as read
    </Button>
  );
}
