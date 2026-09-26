import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the Nexlev support team.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Contact Us</h1>
      <p className="mt-3 max-w-2xl text-slate-500">
        Questions about the platform, your account or partnerships? Reach out — the message is prepared for our
        support inbox.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          {[
            { icon: Mail, label: "Email", value: siteConfig.supportEmail },
            { icon: Phone, label: "Phone", value: siteConfig.contactPhone },
            { icon: MapPin, label: "Address", value: siteConfig.address },
          ].map((c) => (
            <div key={c.label} className="flex items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{c.label}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-3">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
