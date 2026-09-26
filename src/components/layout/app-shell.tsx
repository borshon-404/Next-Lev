"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  User as UserIcon,
  Users,
  Network,
  Share2,
  Gift,
  Wallet,
  ArrowLeftRight,
  LogOut,
  Package,
  ShoppingBag,
  Trophy,
  FileSearch,
  Bell,
  Settings,
  Menu,
  X,
  Zap,
  UserCog,
  Percent,
  Landmark,
  Receipt,
  Banknote,
  ShieldCheck,
  BarChart3,
  ScrollText,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/misc";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  user: UserIcon,
  users: UserCog,
  team: Users,
  genealogy: Network,
  referrals: Share2,
  commissions: Gift,
  wallet: Wallet,
  transactions: ArrowLeftRight,
  packages: Package,
  purchases: ShoppingBag,
  rank: Trophy,
  kyc: FileSearch,
  notifications: Bell,
  settings: Settings,
  "commission-rules": Percent,
  withdrawals: Landmark,
  deposits: Banknote,
  reports: BarChart3,
  "audit-logs": ScrollText,
  "mlm-settings": SlidersHorizontal,
  security: ShieldCheck,
  "user-detail": UserIcon,
};

export function AppShell({
  userName,
  userEmail,
  role,
  unread,
  nav,
  children,
}: {
  userName: string;
  userEmail: string;
  role: "MEMBER" | "ADMIN";
  unread: number;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href={role === "ADMIN" ? "/admin" : "/dashboard"} className="flex items-center gap-2.5 px-5 pt-5 pb-4" onClick={() => setDrawer(false)}>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-white">
          <Zap className="h-5 w-5" />
        </span>
        <span className="text-lg font-bold text-white">
          Nexlev
          <span className={["ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold", role === "ADMIN" ? "bg-violet-500/30 text-violet-300" : "bg-indigo-500/30 text-indigo-300"].join(" ")}>
            {role === "ADMIN" ? "Admin" : "Member"}
          </span>
        </span>
      </Link>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
        {nav.map((item) => {
          const Icon = ICONS[item.icon] ?? Bell;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawer(false)}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-indigo-500/15 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
              ].join(" ")}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.icon === "notifications" && (item.badge ?? 0) > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                  {(item.badge ?? 0) > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-slate-950 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setDrawer(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-950 shadow-2xl">
            <button
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              onClick={() => setDrawer(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setDrawer(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-slate-900">Nexlev</span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={role === "ADMIN" ? "/admin/notifications" : "/notifications"}
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function LogoutButton() {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async () => {
        setPending(true);
        const { logoutAction } = await import("@/server/auth/actions");
        await logoutAction();
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
      >
        <LogOut className="h-4.5 w-4.5" />
        {pending ? "Signing out…" : "Log out"}
      </button>
    </form>
  );
}

export function UserCard({ name, email, username }: { name: string; email: string; username: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
        <p className="truncate text-xs text-slate-500">
          @{username} · {email}
        </p>
      </div>
    </div>
  );
}
