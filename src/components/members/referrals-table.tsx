import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import type { ReferralListOptions } from "@/server/genealogy/genealogy-service";

export interface ReferralsTableData {
  items: {
    id: string;
    name: string;
    username: string;
    email: string;
    image: string | null;
    status: string;
    referralCode: string;
    depth: number;
    sponsorId: string | null;
    directReferralCount: number;
    joinedAt: Date;
  }[];
  total: number;
  page: number;
  pageSize: number;
}

export function ReferralsTable({
  referrals,
  title = "Direct referrals",
  baseHref,
  currentParams,
}: {
  referrals: ReferralsTableData;
  title?: string;
  baseHref: string;
  currentParams?: Record<string, string>;
}) {
  const { items, total, page, pageSize } = referrals;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const buildHref = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...currentParams, ...patch })) {
      if (v) p.set(k, v);
    }
    const qs = p.toString();
    return `${baseHref}${qs ? `?${qs}` : ""}`;
  };
  const hrefForPage = (pg: number) => buildHref({ page: String(pg) });

  return (
    <Card>
      <CardHeader
        title={title}
        description={`${total} member${total === 1 ? "" : "s"} in your direct team`}
        action={
          <FilterBar searchHref={(q) => buildHref({ q, page: "1" })}>
            <FilterSelect
              name="status"
              value={currentParams?.status ?? "ALL"}
              options={[
                { value: "ALL", label: "All statuses" },
                { value: "ACTIVE", label: "Active" },
                { value: "PENDING", label: "Pending" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "SUSPENDED", label: "Suspended" },
              ]}
            />
          </FilterBar>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          message="No team members yet."
          description="Share your referral link to start building your team."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableHead>Member</TableHead>
            <TableHead>Referral code</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Direct referrals</TableHead>
            <TableHead>Joined</TableHead>
          </TableHeader>
          <TableBody>
            {items.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <span className="flex items-center gap-3">
                    <Avatar name={m.name} src={m.image} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900">{m.name}</span>
                      <span className="block truncate text-xs text-slate-400">@{m.username}</span>
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{m.referralCode}</code>
                </TableCell>
                <TableCell>
                  <StatusBadge status={m.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{m.directReferralCount}</TableCell>
                <TableCell className="text-slate-500">{formatDate(m.joinedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {pages > 1 && (
        <div className="px-4 pb-4">
          <Pagination page={page} pages={pages} hrefForPage={hrefForPage} />
        </div>
      )}
    </Card>
  );
}
