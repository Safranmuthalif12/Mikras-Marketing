import { env } from "cloudflare:workers";
import type { ContactInput } from "./contact";

type MailEnvironment = { RESEND_API_KEY?: string; EMAIL_FROM?: string };

function mailEnvironment(): MailEnvironment {
  return env as unknown as MailEnvironment;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" })[character] ?? character);
}

export function emailConfigured(): boolean {
  const config = mailEnvironment();
  return Boolean(config.RESEND_API_KEY?.trim() && config.EMAIL_FROM?.trim());
}

export async function sendEmail(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
  const config = mailEnvironment();
  if (!config.RESEND_API_KEY?.trim() || !config.EMAIL_FROM?.trim() || !to.trim()) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.RESEND_API_KEY.trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.EMAIL_FROM.trim(), to: [to.trim()], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!response.ok) {
    console.error("Resend delivery failed", response.status);
    return false;
  }
  return true;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const safeUrl = escapeHtml(resetUrl);
  return sendEmail(to, "Reset your MIKRAS admin password", `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#071327">
      <p style="color:#ff5c00;font-weight:700;letter-spacing:.12em">MIKRAS ADMIN</p>
      <h1>Reset your password</h1>
      <p>A password reset was requested for your MIKRAS Marketing admin account.</p>
      <p><a href="${safeUrl}" style="display:inline-block;background:#ff5c00;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Reset password</a></p>
      <p>This secure link expires in 30 minutes and can only be used once. If you did not request it, no action is needed.</p>
    </div>`);
}

export async function sendContactNotification(to: string, lead: ContactInput): Promise<boolean> {
  return sendEmail(to, `New MIKRAS enquiry: ${lead.subject}`, `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#071327">
      <p style="color:#ff5c00;font-weight:700;letter-spacing:.12em">NEW WEBSITE ENQUIRY</p>
      <h1>${escapeHtml(lead.subject)}</h1>
      <p><strong>Name:</strong> ${escapeHtml(lead.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(lead.phone || "Not provided")}</p>
      <div style="margin-top:20px;padding:18px;background:#f5f2ec;border-radius:10px;white-space:pre-wrap">${escapeHtml(lead.message)}</div>
      <p style="margin-top:20px">Open the MIKRAS admin panel to update this lead&apos;s status and notes.</p>
    </div>`, lead.email);
}
