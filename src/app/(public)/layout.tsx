import { PublicHeader } from "@/components/site/public-header";
import { PublicFooter } from "@/components/site/public-footer";

/**
 * Public website shell (marketing pages + auth pages).
 * The /packages route is session-aware: members see the purchasable catalog.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
