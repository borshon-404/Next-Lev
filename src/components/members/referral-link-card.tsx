import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Share2 } from "lucide-react";
import { CopyButtonClient } from "@/components/ui/copy-button";
import { ShareButtonClient } from "@/components/members/share-button";

export async function ReferralLinkCard({ userId }: { userId: string }) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true, referralCode: true },
  });
  if (!me) return null;

  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const link = `${base}/register?ref=${me.referralCode}`;

  return (
    <Card>
      <CardHeader
        title="Your referral link"
        description="Share it to grow your team — new members join directly under you."
        action={<Share2 className="h-4 w-4 text-slate-300" />}
      />
      <CardBody>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
            {link}
          </code>
          <div className="flex gap-2">
            <CopyButtonClient value={link} label="Copy link" />
            <ShareButtonClient url={link} title={`Join me on Nexlev! Use my referral link: ${link}`} />
          </div>
        </div>
        <p className="mt-2.5 text-xs text-slate-400">
          Referral code: <strong className="text-slate-600">{me.referralCode}</strong> — your sponsor relationship is
          permanent once a member registers with your link.
        </p>
      </CardBody>
    </Card>
  );
}
