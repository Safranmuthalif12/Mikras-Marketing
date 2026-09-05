import { env } from "cloudflare:workers";
import { contactOriginAllowed, contentLengthAccepted, isLikelyBot, jsonContentTypeAccepted, validateContactPayload } from "@/lib/contact";
import { ContactRateLimitError, persistContactLead } from "@/lib/contact-store";
import { sendContactNotification } from "@/lib/email-service";

export const dynamic = "force-dynamic";

const responseHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const json = (body: Record<string, unknown>, status: number, extra: Record<string,string> = {}) => Response.json(body, { status, headers: { ...responseHeaders, ...extra } });
const success = () => json({ ok: true, message: "Thanks — your enquiry has been received. MIKRAS will contact you soon." }, 201);

function clientIp(request: Request): string | null {
  return request.headers.get("cf-connecting-ip")?.trim() || request.headers.get("x-real-ip")?.trim() || null;
}

export async function POST(request: Request) {
  if (!contentLengthAccepted(request.headers.get("content-length"))) return json({ ok: false, error: "Submission is too large." }, 413);
  if (!contactOriginAllowed(request.url,request.headers.get("origin"))) return json({ ok: false, error: "Cross-site submission blocked." }, 403);
  if (!jsonContentTypeAccepted(request.headers.get("content-type"))) return json({ ok: false, error: "JSON content type required." }, 415);

  let payload: unknown;
  try { payload = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON submission." }, 400); }
  if (isLikelyBot(payload)) return success();

  const validation = validateContactPayload(payload);
  if (!validation.ok) return json({ ok: false, error: validation.error }, 400);

  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) return json({ ok: false, error: "Contact service is temporarily unavailable." }, 503);

  try {
    await persistContactLead(db, validation.data, clientIp(request));
    try {
      const admin=await db.prepare("SELECT notification_email AS notificationEmail,notifications_enabled AS notificationsEnabled FROM admin_accounts ORDER BY created_at LIMIT 1").first<{notificationEmail:string;notificationsEnabled:number}>();
      if(admin?.notificationsEnabled&&admin.notificationEmail)await sendContactNotification(admin.notificationEmail,validation.data);
    } catch (error) {
      console.error("Contact notification failed",error instanceof Error?error.message:"unknown error");
    }
    return success();
  } catch (error) {
    if (error instanceof ContactRateLimitError) return json({ ok: false, error: "Too many enquiries were sent. Please try again in 15 minutes." }, 429, { "Retry-After": "900" });
    console.error("Contact submission failed", error instanceof Error ? error.message : "unknown error");
    return json({ ok: false, error: "We could not send your enquiry. Please try again." }, 500);
  }
}
