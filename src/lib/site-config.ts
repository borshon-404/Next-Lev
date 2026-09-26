/**
 * Central branding / site configuration.
 * Change these values (or move them to SystemSetting) to rebrand the platform.
 */
export const siteConfig = {
  name: "Nexlev",
  legalName: "Nexlev Network Ltd.",
  tagline: "Build, Manage & Grow Your Network",
  description:
    "Nexlev is a professional multi-level marketing management platform with transparent commissions, a secure wallet, and powerful team tools.",
  url: process.env.AUTH_URL ?? "http://localhost:3000",
  supportEmail: "support@nexlev.example",
  contactPhone: "+1 (555) 010-2030",
  address: "128 Market Street, Suite 400, Wilmington, DE 19801, USA",
  currency: "USD",
  social: {
    twitter: "#",
    facebook: "#",
    linkedin: "#",
  },
} as const;

export type SiteConfig = typeof siteConfig;
