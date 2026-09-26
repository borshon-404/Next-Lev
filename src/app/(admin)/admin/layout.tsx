import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/server/auth/guards";
import { AppShell, type NavItem } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/genealogy", label: "Genealogy", icon: "genealogy" },
  { href: "/admin/packages", label: "Packages", icon: "packages" },
  { href: "/admin/commission-rules", label: "Commission Rules", icon: "commission-rules" },
  { href: "/admin/commissions", label: "Commissions", icon: "commissions" },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: "withdrawals" },
  { href: "/admin/deposits", label: "Deposits", icon: "deposits" },
  { href: "/admin/transactions", label: "Transactions", icon: "transactions" },
  { href: "/admin/kyc", label: "KYC", icon: "kyc" },
  { href: "/admin/ranks", label: "Ranks", icon: "rank" },
  { href: "/admin/mlm-settings", label: "MLM Settings", icon: "mlm-settings" },
  { href: "/admin/reports", label: "Reports", icon: "reports" },
  { href: "/admin/notifications", label: "Notifications", icon: "notifications" },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: "audit-logs" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  const unread = await prisma.notification.count({ where: { userId: user.id, read: false } });
  const pendingKyc = await prisma.kyc.count({ where: { status: "PENDING" } });
  const pendingWithdrawals = await prisma.withdrawal.count({ where: { status: "PENDING" } });

  return (
    <AppShell
      userName={user.name}
      userEmail={user.email}
      role="ADMIN"
      unread={unread}
      nav={ADMIN_NAV.map((n) => {
        if (n.href === "/admin/kyc" && pendingKyc > 0) return { ...n, badge: pendingKyc };
        if (n.href === "/admin/withdrawals" && pendingWithdrawals > 0) return { ...n, badge: pendingWithdrawals };
        return n;
      })}
    >
      {children}
    </AppShell>
  );
}
