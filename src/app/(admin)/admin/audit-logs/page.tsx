import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { Badge } from "@/components/ui/badge";
import { ScrollText } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Audit Logs", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const ACTION_TONE = (action: string): "success" | "danger" | "warning" | "info" | "default" => {
  if (/SUSPEND|REJECT|CANCEL|REVERSE|FAIL/.test(action)) return "danger";
  if (/APPROVE|COMPLETE|CREATE|ENABLE|ACTIVAT/.test(action)) return "success";
  if (/UPDATE|CHANGE|ADJUST|BROADCAST|SETTINGS/.test(action)) return "warning";
  if (/VIEW|READ|LOGIN/.test(action)) return "default";
  return "info";
};

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const action = (typeof params.action === "string" && params.action !== "ALL" ? params.action : undefined) as string | undefined;
  const q = typeof params.q === "string" && params.q ? params.q : undefined;
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1);

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (q) {
    where.OR = [
      { admin: { username: { contains: q, mode: "insensitive" } } },
      { action: { contains: q, mode: "insensitive" } },
      { targetId: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { admin: { select: { username: true, name: true } } },
    }),
    prisma.auditLog.count({ where: where as never }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const base = { action: action ?? "", q: q ?? "", ...patch };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const qs = p.toString();
    return `/admin/audit-logs${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Immutable record of sensitive administrative actions. Entries cannot be edited or deleted from the UI."
      />

      <Card>
        <CardHeader
          title={`All audit entries (${total})`}
          action={
            <FilterBar searchHref={(query) => buildHref({ q: query, page: "1" })} searchPlaceholder="Search admin, action, target…">
              <FilterSelect
                name="action"
                value={action ?? "ALL"}
                options={[
                  { value: "ALL", label: "All actions" },
                  { value: "USER_SUSPENDED", label: "User suspended" },
                  { value: "USER_STATUS_CHANGED", label: "Status changed" },
                  { value: "USER_UPDATED", label: "User updated" },
                  { value: "WALLET_ADJUSTED", label: "Wallet adjusted" },
                  { value: "COMMISSION_APPROVED", label: "Commission approved" },
                  { value: "COMMISSION_CANCELLED", label: "Commission cancelled" },
                  { value: "WITHDRAWAL_APPROVE", label: "Withdrawal approved" },
                  { value: "WITHDRAWAL_REJECT", label: "Withdrawal rejected" },
                  { value: "WITHDRAWAL_COMPLETE", label: "Withdrawal completed" },
                  { value: "KYC_APPROVE", label: "KYC approved" },
                  { value: "KYC_REJECT", label: "KYC rejected" },
                  { value: "PACKAGE_CREATED", label: "Package created" },
                  { value: "PACKAGE_UPDATED", label: "Package updated" },
                  { value: "MLM_SETTINGS_UPDATED", label: "MLM settings" },
                  { value: "RANK_CREATED", label: "Rank created" },
                  { value: "RANK_UPDATED", label: "Rank updated" },
                  { value: "DEPOSIT_CREATED", label: "Deposit created" },
                  { value: "PAYMENT_CONFIRMED", label: "Payment confirmed" },
                ]}
              />
            </FilterBar>
          }
        />
        {items.length === 0 ? (
          <EmptyState icon={<ScrollText className="h-5 w-5" />} message="No audit entries" description="Sensitive admin actions will be recorded here." />
        ) : (
          <Table>
            <TableHeader>
              <TableHead>When</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>IP</TableHead>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap text-slate-500">{formatDateTime(a.createdAt)}</TableCell>
                  <TableCell>
                    <span className="font-medium text-slate-800">@{a.admin.username}</span>
                  </TableCell>
                  <TableCell>
                    <Badge tone={ACTION_TONE(a.action)}>{a.action.replaceAll("_", " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {a.targetType ? (
                      <span>
                        {a.targetType}{" "}
                        {a.targetId === "default" ? (
                          <span className="text-slate-400">(platform)</span>
                        ) : a.targetType === "User" ? (
                          <Link href={`/admin/users/${a.targetId}`} className="break-all text-xs text-indigo-500 hover:underline">
                            {a.targetId?.slice(0, 8)}…
                          </Link>
                        ) : (
                          <span className="break-all text-xs text-slate-400">{a.targetId?.slice(0, 8)}…</span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="max-w-[300px] text-slate-500">
                    <details className="group">
                      <summary className="cursor-pointer list-none text-xs font-medium text-indigo-600 hover:text-indigo-700">
                        View before / after
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                        {JSON.stringify(
                          {
                            before: safeParse(a.previousValue as unknown),
                            after: safeParse(a.newValue as unknown),
                          },
                          null,
                          2
                        )}
                      </pre>
                    </details>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-400">{a.ip ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {pages > 1 && (
          <div className="px-4 pb-4">
            <Pagination page={page} pages={pages} hrefForPage={(p) => buildHref({ page: String(p) })} />
          </div>
        )}
      </Card>
    </>
  );
}

function safeParse(v: unknown): unknown {
  if (v == null) return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}
