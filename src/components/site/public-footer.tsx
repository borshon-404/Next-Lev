import Link from "next/link";
import { Zap } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white">
              <Zap className="h-4.5 w-4.5" />
            </span>
            <span className="text-lg font-bold text-white">Nexlev</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-slate-400">{siteConfig.description}</p>
          <p className="mt-4 text-xs text-slate-500">
            Earnings on Nexlev depend on your efforts, market conditions and many other factors. Nothing on this
            site is a promise or guarantee of income or financial results.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Platform</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/how-it-works">How It Works</Link></li>
            <li><Link className="hover:text-white" href="/packages">Packages</Link></li>
            <li><Link className="hover:text-white" href="/compensation-plan">Compensation Plan</Link></li>
            <li><Link className="hover:text-white" href="/faq">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Account</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/login">Log in</Link></li>
            <li><Link className="hover:text-white" href="/register">Register</Link></li>
            <li><Link className="hover:text-white" href="/terms">Terms &amp; Conditions</Link></li>
            <li><Link className="hover:text-white" href="/privacy">Privacy Policy</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li>{siteConfig.supportEmail}</li>
            <li>{siteConfig.contactPhone}</li>
            <li>{siteConfig.address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:px-6">
          <span>© {new Date().getFullYear()} {siteConfig.legalName} All rights reserved.</span>
          <span>Built with a transparent, configurable compensation plan.</span>
        </div>
      </div>
    </footer>
  );
}
