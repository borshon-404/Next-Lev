import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { UserCog } from "lucide-react";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Users", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const query = typeof params.q === "string" && params.q ? params.q : undefined;
  const status = (typeof params.status === "string" && params.status !== "ALL" ? params.status : undefined) as never;
  const role = (typeof params.role === "string" && params.role !== "ALL" ? params.role : undefined) as never;
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : 1) || 1);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (role) where.role = role;
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { username: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { referralCode: { contains: query, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        role: true,
        status: true,
        referralCode: true,
        createdAt: true,
        sponsor: { select: { username: true } },
        _count: { select: { referrals: true } },
      },
    }),
    prisma.user.count({ where: where as never }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const base = { q: query ?? "", status: status ?? "", role: role ?? "", ...patch };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const qs = p.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Users" description={`${total} accounts on the platform.`} />

      <Card>
        <CardHeader
          title="All users"
          action={
            <FilterBar searchHref={(q) => buildHref({ q, page: "1" })} searchPlaceholder="Search name, username, email, code…">
              <FilterSelect
                name="status"
                value={status ?? "ALL"}
                options={[
                  { value: "ALL", label: "All statuses" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "PENDING", label: "Pending" },
                  { value: "INACTIVE", label: "Inactive" },
                  { value: "SUSPENDED", label: "Suspended" },
                ]}
              />
              <FilterSelect
                name="role"
                value={role ?? "ALL"}
                options={[
                  { value: "ALL", label: "All roles" },
                  { value: "MEMBER", label: "Member" },
                  { value: "ADMIN", label: "Admin" },
                ]}
              />
            </FilterBar>
          }
        />
        {items.length === 0 ? (
          <EmptyState icon={<UserCog className="h-5 w-5" />} message="No users found" description="Try adjusting your search or filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableHead>User</TableHead>
              <TableHead>Referral code</TableHead>
              <TableHead>Sponsor</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Team</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableHeader>
            <TableBody>
              {items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 hover:opacity-80">
                      <Avatar name={u.name} src={u.image} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-900">{u.name}</span>
                        <span className="block truncate text-xs text-slate-400">@{u.username} · {u.email}</span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{u.referralCode}</code>
                  </TableCell>
                  <TableCell className="text-slate-500">{u.sponsor ? `@${u.sponsor.username}` : "—"}</TableCell>
                  <TableCell>
                    <Badge tone={u.role === "ADMIN" ? "purple" : "default"}>{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{u._count.referrals}</TableCell>
                  <TableCell className="text-slate-500">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/users/${u.id}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                      Manage
                    </Link>
                  </TableCell>
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
