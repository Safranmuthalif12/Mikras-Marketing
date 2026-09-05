export const CONTACT_LIMIT = 5;
export const CONTACT_WINDOW_MS = 15 * 60 * 1000;
export const CONTACT_MAX_BODY_BYTES = 16 * 1024;

export type ContactInput = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

export type ContactValidationResult =
  | { ok: true; data: ContactInput }
  | { ok: false; error: string };

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;
}

function clean(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim()
    : "";
}

export function isLikelyBot(value: unknown): boolean {
  const payload = record(value);
  return Boolean(payload && clean(payload.companyWebsite));
}

export function contactOriginAllowed(requestUrl: string, origin: string | null): boolean {
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(requestUrl).origin; } catch { return false; }
}

export function jsonContentTypeAccepted(value: string | null): boolean {
  return Boolean(value?.toLowerCase().startsWith("application/json"));
}

export function contentLengthAccepted(value: string | null): boolean {
  if (!value) return true;
  const length = Number(value);
  return Number.isFinite(length) && length >= 0 && length <= CONTACT_MAX_BODY_BYTES;
}

export function validateContactPayload(value: unknown): ContactValidationResult {
  const payload = record(value);
  if (!payload) return { ok: false, error: "Invalid submission." };

  const name = clean(payload.name);
  const email = clean(payload.email).toLowerCase();
  const phone = clean(payload.phone);
  const subject = clean(payload.subject);
  const message = clean(payload.message);

  if (name.length < 2 || name.length > 80) return { ok: false, error: "Enter a valid name (2–80 characters)." };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (phone && !/^[0-9+() .-]{7,30}$/.test(phone)) return { ok: false, error: "Enter a valid phone number." };
  if (subject.length < 2 || subject.length > 120) return { ok: false, error: "Enter a subject (2–120 characters)." };
  if (message.length < 10 || message.length > 2000) return { ok: false, error: "Your message must be 10–2000 characters." };
  if (payload.consent !== true) return { ok: false, error: "Please confirm that MIKRAS may contact you about this enquiry." };

  return { ok: true, data: { name, email, phone, subject, message } };
}

export function contactWindowStart(now = new Date()): string {
  return new Date(now.getTime() - CONTACT_WINDOW_MS).toISOString();
}

export function csvCell(value: unknown): string {
  let text = String(value ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
