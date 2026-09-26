import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";

/**
 * Admin reporting.
 * Date range presets + custom ranges; aggregates are computed with SQL so
 * large tables are never fully loaded. CSV export reuses the same rows.
 */

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "all";

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export function resolveDateRange(preset: DateRangePreset, customFrom?: string, customTo?: string): DateRange {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  switch (preset) {
    case "today":
      return { from: startOfToday, to: endOfToday };
    case "yesterday": {
      const from = new Date(startOfToday);
      from.setDate(from.getDate() - 1);
      const to = new Date(startOfToday);
      to.setDate(to.getDate() - 1);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    case "last7": {
      const from = new Date(startOfToday);
      from.setDate(from.getDate() - 6);
      return { from, to: endOfToday };
    }
    case "last30": {
      const from = new Date(startOfToday);
      from.setDate(from.getDate() - 29);
      return { from, to: endOfToday };
    }
    case "thisMonth": {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfToday };
    }
    case "lastMonth": {
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    }
    case "all":
      return { from: null, to: null };
    default: {
      let from = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
      let to = customTo ? new Date(`${customTo}T23:59:59.999`) : null;
      if (from && Number.isNaN(from.getTime())) from = null;
      if (to && Number.isNaN(to.getTime())) to = null;
      return { from, to };
    }
  }
}

interface DayPoint {
  day: Date;
  value: number;
  count: number;
}

function fillSeries(points: DayPoint[], from: Date, to: Date): { label: string; value: number; count: number }[] {
  const map = new Map(points.map((p) => [p.day.toISOString().slice(0, 10), p]));
  const out: { label: string; value: number; count: number }[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const p = map.get(key);
    out.push({
      label: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: p ? p.value : 0,
      count: p ? p.count : 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function rangeWhere(range: DateRange, column: "createdAt" | "completedAt" = "createdAt") {
  const bounds =
    range.from && range.to
      ? { gte: range.from, lte: range.to }
      : range.from
        ? { gte: range.from }
        : range.to
          ? { lte: range.to }
          : undefined;
  return { [column]: bounds } as Record<string, unknown>;
}

export interface AdminDashboardStats {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  pendingKyc: number;
  totalSales: number;
  salesCount: number;
  totalCommissions: number;
  pendingCommissions: number;
  pendingWithdrawals: number;
  pendingWithdrawalsAmount: number;
  completedWithdrawalsAmount: number;
  totalDeposits: number;
  series: {
    registrations: { label: string; value: number; count: number }[];
    sales: { label: string; value: number; count: number }[];
    commissions: { label: string; value: number; count: number }[];
    withdrawals: { label: string; value: number; count: number }[];
  };
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const range = resolveDateRange("last30");
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalMembers,
    activeMembers,
    newMembersThisMonth,
    pendingKyc,
    salesAgg,
    commissionAgg,
    pendingCommissionsAgg,
    pendingWithdrawalsAgg,
    completedWithdrawalsAgg,
    depositAgg,
    regRows,
    salesRows,
    commissionRows,
    withdrawalRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.kyc.count({ where: { status: "PENDING" } }),
    prisma.packagePurchase.aggregate({
      where: { status: "COMPLETED", ...rangeWhere(range) },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({ _sum: { amount: true } }),
    prisma.commission.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
    prisma.withdrawal.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.withdrawal.aggregate({
      where: { status: "COMPLETED" },
      _sum: { netAmount: true },
    }),
    prisma.deposit.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.user.findMany({
      where: { createdAt: { gte: range.from! } },
      select: { createdAt: true },
    }),
    prisma.packagePurchase.findMany({
      where: { status: "COMPLETED", ...rangeWhere(range) },
      select: { createdAt: true, amount: true },
    }),
    prisma.commission.findMany({
      where: rangeWhere(range),
      select: { createdAt: true, amount: true },
    }),
    prisma.withdrawal.findMany({
      where: { status: "COMPLETED", ...rangeWhere(range, "completedAt") },
      select: { createdAt: true, netAmount: true, completedAt: true },
    }),
  ]);

  const toSeries = (rows: { createdAt: Date; amount?: { toString(): string }; netAmount?: { toString(): string } }[]) =>
    fillSeries(
      rows.map((r) => ({
        day: r.createdAt,
        value: r.netAmount ? toNumber(r.netAmount) : r.amount ? toNumber(r.amount) : 0,
        count: 1,
      })),
      range.from!,
      range.to!
    ).map((p) => ({ label: p.label, value: p.value, count: p.count }));

  return {
    totalMembers,
    activeMembers,
    newMembersThisMonth,
    pendingKyc,
    totalSales: toNumber(salesAgg._sum.amount),
    salesCount: await prisma.packagePurchase.count({
      where: { status: "COMPLETED", ...rangeWhere(range) },
    }),
    totalCommissions: toNumber(commissionAgg._sum.amount),
    pendingCommissions: toNumber(pendingCommissionsAgg._sum.amount),
    pendingWithdrawals: await prisma.withdrawal.count({ where: { status: "PENDING" } }),
    pendingWithdrawalsAmount: toNumber(pendingWithdrawalsAgg._sum.amount),
    completedWithdrawalsAmount: toNumber(completedWithdrawalsAgg._sum.netAmount),
    totalDeposits: toNumber(depositAgg._sum.amount),
    series: {
      registrations: fillSeries(
        regRows.map((r) => ({ day: r.createdAt, value: 0, count: 1 })),
        range.from!,
        range.to!
      ),
      sales: toSeries(salesRows),
      commissions: toSeries(commissionRows),
      withdrawals: toSeries(
        withdrawalRows.map((w) => ({ ...w, createdAt: w.completedAt ?? w.createdAt }))
      ),
    },
  };
}

// ---------------------------------------------------------------------------
// Detailed reports (tables + CSV export)
// ---------------------------------------------------------------------------

export type ReportType = "members" | "sales" | "commissions" | "withdrawals" | "deposits" | "purchases";

export interface ReportData {
  headers: string[];
  rows: (string | number)[][];
  total: number;
  range: DateRange;
}

export async function getReport(type: ReportType, preset: DateRangePreset, customFrom?: string, customTo?: string): Promise<ReportData> {
  const range = resolveDateRange(preset, customFrom, customTo);
  const w = rangeWhere(range);

  switch (type) {
    case "members": {
      const items = await prisma.user.findMany({
        where: w,
        orderBy: { createdAt: "desc" },
        take: 5000,
        select: { id: true, name: true, email: true, status: true, createdAt: true, sponsor: { select: { name: true } } },
      });
      return {
        headers: ["ID", "Name", "Email", "Status", "Sponsor", "Joined"],
        rows: items.map((u) => [u.id, u.name, u.email, u.status, u.sponsor?.name ?? "—", u.createdAt.toISOString()]),
        total: items.length,
        range,
      };
    }
    case "sales":
    case "purchases": {
      const items = await prisma.packagePurchase.findMany({
        where: { ...w, ...(type === "sales" ? { status: "COMPLETED" } : {}) },
        orderBy: { createdAt: "desc" },
        take: 5000,
        include: { user: { select: { name: true, username: true } }, package: { select: { name: true } } },
      });
      return {
        headers: ["Date", "Member", "Package", "Amount", "Currency", "Status"],
        rows: items.map((p) => [
          p.createdAt.toISOString(),
          `${p.user.name} (@${p.user.username})`,
          p.package.name,
          toNumber(p.amount),
          p.currency,
          p.status,
        ]),
        total: items.length,
        range,
      };
    }
    case "commissions": {
      const items = await prisma.commission.findMany({
        where: w,
        orderBy: { createdAt: "desc" },
        take: 5000,
        include: {
          beneficiary: { select: { name: true, username: true } },
          fromUser: { select: { name: true } },
        },
      });
      return {
        headers: ["Date", "Beneficiary", "From", "Level", "Percentage", "Base", "Amount", "Status"],
        rows: items.map((c) => [
          c.createdAt.toISOString(),
          `${c.beneficiary.name} (@${c.beneficiary.username})`,
          c.fromUser.name,
          c.level,
          toNumber(c.percentage),
          toNumber(c.baseAmount),
          toNumber(c.amount),
          c.status,
        ]),
        total: items.length,
        range,
      };
    }
    case "withdrawals": {
      const items = await prisma.withdrawal.findMany({
        where: w,
        orderBy: { createdAt: "desc" },
        take: 5000,
        include: { user: { select: { name: true, email: true } } },
      });
      return {
        headers: ["Date", "Member", "Email", "Amount", "Fee", "Net", "Method", "Status"],
        rows: items.map((x) => [
          x.createdAt.toISOString(),
          x.user.name,
          x.user.email,
          toNumber(x.amount),
          toNumber(x.fee),
          toNumber(x.netAmount),
          x.paymentMethod,
          x.status,
        ]),
        total: items.length,
        range,
      };
    }
    case "deposits": {
      const items = await prisma.deposit.findMany({
        where: w,
        orderBy: { createdAt: "desc" },
        take: 5000,
        include: { user: { select: { name: true, email: true } } },
      });
      return {
        headers: ["Date", "Member", "Email", "Amount", "Method", "Reference", "Status"],
        rows: items.map((d) => [
          d.createdAt.toISOString(),
          d.user.name,
          d.user.email,
          toNumber(d.amount),
          d.method,
          d.reference ?? "—",
          d.status,
        ]),
        total: items.length,
        range,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Member dashboard data (real DB data — no hard-coded stats)
// ---------------------------------------------------------------------------

export interface MemberDashboardData {
  wallet: {
    available: number;
    pending: number;
    totalEarned: number;
    totalWithdrawn: number;
    totalCommissions: number;
    totalDeposited: number;
  } | null;
  currentPackage: { name: string; price: number; currency: string } | null;
  currentRank: { name: string; level: number; colorHex: string } | null;
  totals: {
    directReferrals: number;
    teamTotal: number;
    teamActive: number;
    pendingCommissions: number;
    paidCommissions: number;
    approvedCommissions: number;
    monthlyEarnings: number;
    accountStatus: string;
  };
  series: {
    monthlyEarnings: { label: string; value: number }[];
    teamGrowth: { label: string; value: number }[];
    commissionByLevel: { level: string; value: number }[];
  };
  recentLedger: {
    id: string;
    type: string;
    amount: number;
    balanceType: string;
    description: string;
    createdAt: Date;
  }[];
}

export async function getMemberDashboardData(userId: string): Promise<MemberDashboardData> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  // Fetch the user first — subtree queries below depend on its materialized path.
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      path: true,
      rank: { include: { rank: { select: { name: true, level: true, colorHex: true } } } },
      purchases: {
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { package: { select: { name: true, price: true, currency: true } } },
      },
    },
  });

  const [
    wallet,
    directCount,
    teamStats,
    pendingAgg,
    approvedAgg,
    paidAgg,
    monthlyRows,
    monthlyTeamRows,
    levelRows,
    recentLedger,
  ] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.user.count({ where: { sponsorId: userId } }),
    (async () => {
      if (!me?.path) return { total: 0, active: 0 };
      const [total, active] = await Promise.all([
        prisma.user.count({ where: { path: { startsWith: me.path }, id: { not: userId } } }),
        prisma.user.count({ where: { path: { startsWith: me.path }, id: { not: userId }, status: "ACTIVE" } }),
      ]);
      return { total, active };
    })(),
    prisma.commission.aggregate({ where: { beneficiaryId: userId, status: "PENDING" }, _sum: { amount: true } }),
    prisma.commission.aggregate({ where: { beneficiaryId: userId, status: "APPROVED" }, _sum: { amount: true } }),
    prisma.commission.aggregate({ where: { beneficiaryId: userId, status: "PAID" }, _sum: { amount: true } }),
    prisma.commission.findMany({
      where: { beneficiaryId: userId, createdAt: { gte: sixMonthsAgo } },
      select: { amount: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: me?.path
        ? { path: { startsWith: me.path }, id: { not: userId }, createdAt: { gte: sixMonthsAgo } }
        : { id: "none" },
      select: { createdAt: true },
    }),
    prisma.commission.groupBy({
      by: ["level"],
      where: { beneficiaryId: userId },
      _sum: { amount: true },
    }),
    prisma.walletLedger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, type: true, amount: true, balanceType: true, description: true, createdAt: true },
    }),
  ]);

  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthlyAgg = await prisma.commission.aggregate({
    where: {
      beneficiaryId: userId,
      status: { in: ["PENDING", "APPROVED", "PAID"] },
      createdAt: { gte: thisMonthStart },
    },
    _sum: { amount: true },
  });

  // Monthly earnings series (last 6 months)
  const monthMap = new Map<string, number>();
  for (const c of monthlyRows) {
    const key = c.createdAt.toISOString().slice(0, 7);
    monthMap.set(key, (monthMap.get(key) ?? 0) + toNumber(c.amount));
  }
  const monthlyEarnings: { label: string; value: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const key = d.toISOString().slice(0, 7);
    monthlyEarnings.push({
      label: d.toLocaleDateString("en-US", { month: "short" }),
      value: monthMap.get(key) ?? 0,
    });
  }

  // Cumulative team growth (last 6 months)
  const teamSorted = [...monthlyTeamRows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const teamMonthMap = new Map<string, number>();
  for (const m of teamSorted) {
    const key = m.createdAt.toISOString().slice(0, 7);
    teamMonthMap.set(key, (teamMonthMap.get(key) ?? 0) + 1);
  }
  const windowTotal = [...teamMonthMap.values()].reduce((a, b) => a + b, 0);
  const teamGrowth: { label: string; value: number }[] = [];
  let running = 0;
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const key = d.toISOString().slice(0, 7);
    running += teamMonthMap.get(key) ?? 0;
    teamGrowth.push({
      label: d.toLocaleDateString("en-US", { month: "short" }),
      value: teamStats.total - (windowTotal - running),
    });
  }

  const latestPackage = me?.purchases[0];

  return {
    wallet: wallet
      ? {
          available: toNumber(wallet.availableBalance),
          pending: toNumber(wallet.pendingBalance),
          totalEarned: toNumber(wallet.totalEarned),
          totalWithdrawn: toNumber(wallet.totalWithdrawn),
          totalCommissions: toNumber(wallet.totalCommissions),
          totalDeposited: toNumber(wallet.totalDeposited),
        }
      : null,
    currentPackage: latestPackage
      ? {
          name: latestPackage.package.name,
          price: toNumber(latestPackage.package.price),
          currency: latestPackage.package.currency,
        }
      : null,
    currentRank: me?.rank ? me.rank.rank : null,
    totals: {
      directReferrals: directCount,
      teamTotal: teamStats.total,
      teamActive: teamStats.active,
      pendingCommissions: toNumber(pendingAgg._sum.amount),
      approvedCommissions: toNumber(approvedAgg._sum.amount),
      paidCommissions: toNumber(paidAgg._sum.amount),
      monthlyEarnings: toNumber(monthlyAgg._sum.amount),
      accountStatus: me?.status ?? "UNKNOWN",
    },
    series: {
      monthlyEarnings,
      teamGrowth,
      commissionByLevel: levelRows
        .sort((a, b) => a.level - b.level)
        .map((l) => ({ level: `L${l.level}`, value: toNumber(l._sum.amount) })),
    },
    recentLedger: recentLedger.map((l) => ({
      id: l.id,
      type: l.type,
      amount: toNumber(l.amount),
      balanceType: l.balanceType,
      description: l.description,
      createdAt: l.createdAt,
    })),
  };
}
