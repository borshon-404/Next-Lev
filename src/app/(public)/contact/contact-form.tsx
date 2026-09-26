"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { siteConfig } from "@/lib/site-config";

/**
 * Contact form: composes a properly formatted email and opens the user's mail
 * client. (An email-transport integration point — see src/server/notifications/mailer.ts —
 * can deliver these server-side in production.)
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2 || !email.includes("@") || message.trim().length < 10) {
      setError("Please fill in your name, a valid email, and a message of at least 10 characters.");
      return;
    }
    const subject = encodeURIComponent(`Nexlev contact from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name}\n${email}`);
    window.location.href = `mailto:${siteConfig.supportEmail}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" required />
        <Input label="Your email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" required />
      </div>
      <div className="mt-4">
        <Textarea label="Message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" required />
      </div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      {sent && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Your email draft is ready — send it from your mail client to reach us.
        </p>
      )}
      <Button type="submit" className="mt-5 w-full sm:w-auto">
        Send message
      </Button>
    </form>
  );
}
