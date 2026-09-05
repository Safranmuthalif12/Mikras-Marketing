import { CONTACT_LIMIT, contactWindowStart, type ContactInput } from "./contact";

export class ContactRateLimitError extends Error {
  constructor() { super("Too many contact submissions"); this.name = "ContactRateLimitError"; }
}

export async function hashContactIp(ip: string): Promise<string> {
  const bytes = new TextEncoder().encode(`mikras-contact-v1:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function persistContactLead(db: D1Database, input: ContactInput, clientIp: string | null, now = new Date()): Promise<string> {
  const timestamp = now.toISOString();
  const ipHash = clientIp ? await hashContactIp(clientIp) : null;

  if (ipHash) {
    const recent = await db.prepare("SELECT COUNT(*) AS count FROM contact_leads WHERE ip_hash=? AND created_at>=?")
      .bind(ipHash, contactWindowStart(now)).first<{ count: number }>();
    if (Number(recent?.count ?? 0) >= CONTACT_LIMIT) throw new ContactRateLimitError();
  }

  const id = crypto.randomUUID();
  await db.prepare("INSERT INTO contact_leads (id,name,email,phone,subject,message,status,notes,source,ip_hash,consent_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(id,input.name,input.email,input.phone,input.subject,input.message,"new","","website",ipHash,timestamp,timestamp,timestamp).run();
  return id;
}
