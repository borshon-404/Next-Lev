import { promises as fs } from "fs";
import path from "path";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/**
 * Development mailer: writes messages to ./storage/outbox so flows like email
 * verification and password reset are fully testable locally, and logs them.
 *
 * Production: implement this interface with a transactional email provider
 * (SES / Resend / Postmark) and select it via env — call sites never change.
 */
class DevOutboxMailer implements Mailer {
  async send(message: MailMessage): Promise<void> {
    const dir = path.join(process.cwd(), "storage", "outbox");
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(
      dir,
      `${new Date().toISOString().replace(/[:.]/g, "-")}-${message.to.replace(/[^a-z0-9]/gi, "_")}.html`
    );
    await fs.writeFile(
      file,
      `<!-- to: ${message.to} | subject: ${message.subject} -->\n${message.html}`,
      "utf8"
    );
    console.info(`[mailer:dev] "${message.subject}" → ${message.to} (saved to ${file})`);
  }
}

class NoopMailer implements Mailer {
  async send(message: MailMessage): Promise<void> {
    console.warn(`[mailer:noop] Email not configured. Dropped: "${message.subject}" → ${message.to}`);
  }
}

export const mailer: Mailer =
  process.env.NODE_ENV === "production" ? new NoopMailer() : new DevOutboxMailer();

export function wrapEmailHtml(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#f1f5f9;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <h1 style="font-size:20px;color:#0f172a;margin:0 0 16px">${title}</h1>
    <div style="color:#334155;font-size:14px;line-height:1.6">${bodyHtml}</div>
  </div></body></html>`;
}
