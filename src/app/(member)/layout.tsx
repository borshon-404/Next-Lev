import { prisma } from "@/lib/prisma";
import { requireMemberPage } from "@/server/auth/guards";
import { AppShell, type NavItem } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

const MEMBER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/profile", label: "My Profile", icon: "user" },
  { href: "/team", label: "My Team", icon: "team" },
  { href: "/genealogy", label: "Genealogy", icon: "genealogy" },
  { href: "/referrals", label: "Referrals", icon: "referrals" },
  { href: "/commissions", label: "Commissions", icon: "commissions" },
  { href: "/wallet", label: "Wallet", icon: "wallet" },
  { href: "/transactions", label: "Transactions", icon: "transactions" },
  { href: "/withdrawals", label: "Withdrawals", icon: "withdrawals" },
  { href: "/packages", label: "Packages", icon: "packages" },
  { href: "/purchases", label: "My Purchases", icon: "purchases" },
  { href: "/rank", label: "My Rank", icon: "rank" },
  { href: "/kyc", label: "KYC", icon: "kyc" },
  { href: "/notifications", label: "Notifications", icon: "notifications" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await requireMemberPage();
  const unread = await prisma.notification.count({ where: { userId: user.id, read: false } });

  return (
    <AppShell
      userName={user.name}
      userEmail={user.email}
      role="MEMBER"
      unread={unread}
      nav={MEMBER_NAV.map((n) => (n.href === "/notifications" ? { ...n, badge: unread } : n))}
    >
      {children}
    </AppShell>
  );
}
