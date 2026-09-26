import { Prisma, type UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Genealogy service.
 *
 * The sponsor tree is stored on User via:
 *  - sponsorId  (direct upline)
 *  - depth      (0 = root)
 *  - path       materialized path ".rootId.childId.selfId." — subtree lookup
 *               is an index-friendly prefix scan: path LIKE ancestor.path || '%'
 */

export interface GenealogyNode {
  id: string;
  name: string;
  username: string;
  email: string;
  image: string | null;
  status: UserStatus;
  referralCode: string;
  depth: number;
  sponsorId: string | null;
  directReferralCount: number;
  joinedAt: Date;
}

const nodeSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  image: true,
  status: true,
  referralCode: true,
  depth: true,
  sponsorId: true,
  createdAt: true,
  _count: { select: { referrals: true } },
} satisfies Prisma.UserSelect;

function toNode(u: Prisma.UserGetPayload<{ select: typeof nodeSelect }>): GenealogyNode {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    image: u.image,
    status: u.status,
    referralCode: u.referralCode,
    depth: u.depth,
    sponsorId: u.sponsorId,
    directReferralCount: u._count.referrals,
    joinedAt: u.createdAt,
  };
}

export async function getUserNode(userId: string): Promise<GenealogyNode | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: nodeSelect });
  return u ? toNode(u) : null;
}

export async function getUserPath(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { path: true } });
  return u?.path ?? null;
}

/**
 * Returns the subtree rooted at `rootId` (excluding the root itself),
 * up to `maxDepth` levels, as a flat list ordered breadth-first.
 * The UI assembles the tree from sponsorId links.
 */
export async function getSubtree(
  rootId: string,
  opts: { maxDepth?: number; limit?: number } = {}
): Promise<GenealogyNode[]> {
  const { maxDepth = 6, limit = 500 } = opts;
  const root = await prisma.user.findUnique({
    where: { id: rootId },
    select: { path: true, depth: true },
  });
  if (!root) return [];
  const users = await prisma.user.findMany({
    where: {
      path: { startsWith: root.path },
      id: { not: rootId },
      depth: { lte: root.depth + maxDepth },
    },
    orderBy: [{ depth: "asc" }, { createdAt: "asc" }],
    take: limit,
    select: nodeSelect,
  });
  return users.map(toNode);
}

/** Ancestor chain from immediate sponsor up to the root. */
export async function getAncestors(userId: string) {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { path: true } });
  if (!me) return [];
  const ids = me.path.split(".").filter((s) => s && s !== userId);
  if (ids.length === 0) return [];
  const ancestors = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, username: true, depth: true, status: true, referralCode: true },
  });
  // Order from root down to immediate sponsor.
  const byId = new Map(ancestors.map((a) => [a.id, a]));
  return ids.map((id) => byId.get(id)).filter((a): a is NonNullable<typeof a> => Boolean(a));
}

export interface TeamStats {
  direct: number;
  total: number;
  active: number;
  inactive: number;
  byLevel: { level: number; count: number }[];
}

export async function getTeamStats(userId: string): Promise<TeamStats> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { path: true, depth: true },
  });
  if (!me) return { direct: 0, total: 0, active: 0, inactive: 0, byLevel: [] };

  const teamWhere = { path: { startsWith: me.path }, id: { not: userId } };
  const [direct, grouped] = await Promise.all([
    prisma.user.count({ where: { sponsorId: userId } }),
    prisma.user.groupBy({
      by: ["depth", "status"],
      where: teamWhere,
      _count: { _all: true },
    }),
  ]);

  let total = 0;
  let active = 0;
  const levelMap = new Map<number, number>();
  for (const g of grouped) {
    total += g._count._all;
    if (g.status === "ACTIVE") active += g._count._all;
    const level = g.depth - me.depth;
    levelMap.set(level, (levelMap.get(level) ?? 0) + g._count._all);
  }
  const byLevel = [...levelMap.entries()]
    .filter(([level]) => level > 0)
    .sort((a, b) => a[0] - b[0])
    .map(([level, count]) => ({ level, count }));

  return { direct, total, active, inactive: total - active, byLevel };
}

export interface ReferralListOptions {
  search?: string;
  status?: UserStatus | "ALL";
  page?: number;
  pageSize?: number;
}

export async function getDirectReferrals(sponsorId: string, opts: ReferralListOptions = {}) {
  const { search, status, page = 1, pageSize = 20 } = opts;
  const where: Prisma.UserWhereInput = {
    sponsorId,
    ...(status && status !== "ALL" ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { username: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: nodeSelect,
    }),
    prisma.user.count({ where }),
  ]);
  return { items: items.map(toNode), total, page, pageSize };
}

/** Admin-wide member search (genealogy search, user pickers). */
export async function searchMembers(query: string, take = 20): Promise<GenealogyNode[]> {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { username: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { referralCode: { contains: query, mode: "insensitive" } },
      ],
    },
    take,
    select: nodeSelect,
  });
  return users.map(toNode);
}

/**
 * True when `userId` sits inside `ancestorId`'s subtree.
 * Used to guarantee sponsor relationships can never form cycles.
 */
export async function isDescendantOf(ancestorId: string, userId: string): Promise<boolean> {
  const [ancestor, user] = await Promise.all([
    prisma.user.findUnique({ where: { id: ancestorId }, select: { path: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { path: true } }),
  ]);
  if (!ancestor || !user) return false;
  if (ancestorId === userId) return false; // a node is not its own descendant
  return user.path.startsWith(ancestor.path);
}
