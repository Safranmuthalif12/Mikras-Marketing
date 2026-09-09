import { env } from "cloudflare:workers";
import { changeAdminPassword, normalizeAdminEmail, requireAdminApi } from "@/app/admin-auth";
import { contactOriginAllowed } from "@/lib/contact";
import { validAdminEmail } from "@/lib/admin-security-core";

export const dynamic = "force-dynamic";

const socialKeys = ["facebook","instagram","tiktok","twitter","linkedin"] as const;
const settingKeys = ["companyName","adminName","phone","whatsapp","whatsappMessage","email","address",...socialKeys,"heroTitle","heroAccent","heroText"];
const statIds = ["happy_clients","completed_projects","client_satisfaction"];
const leadStatuses = ["new","contacted","qualified","won","closed","spam"];
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const raw = (form: FormData, key: string) => String(form.get(key) ?? "");
const number = (form: FormData, key: string, fallback = 0) => { const value = Number(form.get(key)); return Number.isFinite(value) ? value : fallback; };
const checked = (form: FormData, key: string) => form.get(key) === "on" || form.get(key) === "true";
const safeId = (value: string) => value && /^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : crypto.randomUUID();
const safeHttpUrl=(value:string)=>{if(!value)return"";try{const url=new URL(value);return url.protocol==="https:"||url.protocol==="http:"?url.toString():null}catch{return null}};

function bindings() {
  const runtime = env as unknown as { DB?: D1Database; BUCKET?: R2Bucket };
  if (!runtime.DB) throw new Error("Database unavailable");
  return { db: runtime.DB, bucket: runtime.BUCKET };
}

export async function POST(request: Request) {
  if (!contactOriginAllowed(request.url,request.headers.get("origin"))) return Response.json({ error: "Cross-site request blocked" }, { status: 403 });
  const auth = await requireAdminApi(); if (!auth.ok) return auth.response;
  try {
    const form = await request.formData(); const action = text(form, "action"); const now = new Date().toISOString(); const { db, bucket } = bindings();
    if (action === "save_settings") {
      const socialValues=Object.fromEntries(socialKeys.map(key=>[key,safeHttpUrl(text(form,key))])) as Record<(typeof socialKeys)[number],string|null>;
      if(Object.values(socialValues).some(value=>value===null))return Response.json({error:"Social media links must use a valid http(s) URL."},{status:400});
      const values:Record<string,string>={};for(const key of settingKeys)values[key]=text(form,key).slice(0,key==="heroText"||key==="whatsappMessage"?500:180);for(const key of socialKeys)values[key]=socialValues[key]??"";
      await db.batch(settingKeys.map((key) => db.prepare("INSERT INTO site_settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key, values[key], now)));
      return Response.json({ ok: true });
    }
    if (action === "save_member") {
      const id = safeId(text(form, "id")); const name = text(form, "name"); const role = text(form, "role");
      if (!name || !role) return Response.json({ error: "Name and role are required" }, { status: 400 });
      let photoKey = text(form, "existingPhotoKey") || null; const photo = form.get("photo");
      if (photo instanceof File && photo.size > 0) {
        if (!bucket) throw new Error("Image storage unavailable");
        if (photo.size > 5 * 1024 * 1024 || !["image/jpeg","image/png","image/webp","image/avif"].includes(photo.type)) return Response.json({ error: "Use JPG, PNG, WebP or AVIF under 5 MB" }, { status: 400 });
        const extension = photo.type.split("/")[1].replace("jpeg", "jpg"); const nextKey = `members/${id}-${crypto.randomUUID()}.${extension}`;
        await bucket.put(nextKey, photo.stream(), { httpMetadata: { contentType: photo.type } }); if (photoKey) await bucket.delete(photoKey); photoKey = nextKey;
      }
      const instagram=safeHttpUrl(text(form,"instagram"));const linkedin=safeHttpUrl(text(form,"linkedin"));if(instagram===null||linkedin===null)return Response.json({error:"Social links must use a valid http(s) URL."},{status:400});
      const memberEmail=normalizeAdminEmail(text(form,"email"));if(memberEmail&&!validAdminEmail(memberEmail))return Response.json({error:"Enter a valid member email."},{status:400});
      await db.batch([
        db.prepare("INSERT INTO members (id,name,role,bio,photo_key,email,instagram,linkedin,sort_order,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,role=excluded.role,bio=excluded.bio,photo_key=excluded.photo_key,email=excluded.email,instagram=excluded.instagram,linkedin=excluded.linkedin,sort_order=excluded.sort_order,active=excluded.active,updated_at=excluded.updated_at").bind(id,name.slice(0,100),role.slice(0,100),text(form,"bio").slice(0,1500),photoKey,memberEmail,instagram,linkedin,number(form,"sortOrder"),checked(form,"active")?1:0,now,now),
        db.prepare("INSERT INTO site_settings (key,value,updated_at) VALUES ('membersConfigured','1',?) ON CONFLICT(key) DO UPDATE SET value='1',updated_at=excluded.updated_at").bind(now),
      ]);
      return Response.json({ ok: true });
    }
    if (action === "delete_member") {
      const id = safeId(text(form,"id")); const row = await db.prepare("SELECT photo_key AS photoKey FROM members WHERE id=?").bind(id).first<{photoKey:string|null}>();
      await db.batch([db.prepare("DELETE FROM members WHERE id=?").bind(id),db.prepare("INSERT INTO site_settings (key,value,updated_at) VALUES ('membersConfigured','1',?) ON CONFLICT(key) DO UPDATE SET value='1',updated_at=excluded.updated_at").bind(now)]); if (row?.photoKey && bucket) await bucket.delete(row.photoKey);
      return Response.json({ ok: true });
    }
    if (action === "save_package") {
      const id=safeId(text(form,"id")); const name=text(form,"name"); if(!name)return Response.json({error:"Package name is required"},{status:400});
      const featureList=text(form,"features").split("\n").map(v=>v.trim()).filter(Boolean).slice(0,12);
      await db.prepare("INSERT INTO packages (id,name,label,price,price_note,features,featured,active,sort_order,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,label=excluded.label,price=excluded.price,price_note=excluded.price_note,features=excluded.features,featured=excluded.featured,active=excluded.active,sort_order=excluded.sort_order,updated_at=excluded.updated_at").bind(id,name,text(form,"label"),Math.max(0,number(form,"price")),text(form,"priceNote")||"/ project",JSON.stringify(featureList),checked(form,"featured")?1:0,checked(form,"active")?1:0,number(form,"sortOrder"),now).run();
      return Response.json({ ok:true });
    }
    if (action === "delete_package") { await db.prepare("DELETE FROM packages WHERE id=?").bind(safeId(text(form,"id"))).run(); return Response.json({ok:true}); }
    if (action === "save_stat") {
      const id=text(form,"id"); if(!statIds.includes(id))return Response.json({error:"Invalid statistic"},{status:400});
      await db.prepare("INSERT INTO stat_settings (id,label,manual_value,suffix,auto_mode,sort_order,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,manual_value=excluded.manual_value,suffix=excluded.suffix,auto_mode=excluded.auto_mode,sort_order=excluded.sort_order,updated_at=excluded.updated_at").bind(id,text(form,"label"),Math.max(0,number(form,"manualValue")),text(form,"suffix"),checked(form,"autoMode")?1:0,number(form,"sortOrder"),now).run(); return Response.json({ok:true});
    }
    if (action === "save_project") {
      const id=safeId(text(form,"id")); const title=text(form,"title"); const client=text(form,"clientName"); if(!title||!client)return Response.json({error:"Project and client names are required"},{status:400});
      const satisfactionText=text(form,"satisfaction"); const satisfaction=satisfactionText?Math.min(100,Math.max(0,Number(satisfactionText))):null; const status=text(form,"status")==="completed"?"completed":"active";
      await db.prepare("INSERT INTO projects (id,title,client_name,status,satisfaction,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,client_name=excluded.client_name,status=excluded.status,satisfaction=excluded.satisfaction,updated_at=excluded.updated_at").bind(id,title,client,status,satisfaction,now,now).run(); return Response.json({ok:true});
    }
    if (action === "delete_project") { await db.prepare("DELETE FROM projects WHERE id=?").bind(safeId(text(form,"id"))).run(); return Response.json({ok:true}); }
    if (action === "save_lead") {
      const id=text(form,"id"); const status=text(form,"status"); const notes=text(form,"notes").slice(0,2000);
      if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id))return Response.json({error:"Invalid lead"},{status:400});
      if(!leadStatuses.includes(status))return Response.json({error:"Invalid lead status"},{status:400});
      await db.prepare("UPDATE contact_leads SET status=?,notes=?,updated_at=? WHERE id=?").bind(status,notes,now,id).run();
      return Response.json({ok:true});
    }
    if (action === "delete_lead") {
      const id=text(form,"id"); if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id))return Response.json({error:"Invalid lead"},{status:400});
      await db.prepare("DELETE FROM contact_leads WHERE id=?").bind(id).run(); return Response.json({ok:true});
    }
    if(action==="save_admin_preferences"){
      const recoveryEmail=normalizeAdminEmail(text(form,"recoveryEmail"));const notificationEmail=normalizeAdminEmail(text(form,"notificationEmail"));const displayName=text(form,"displayName").slice(0,80)||"MIKRAS Admin";
      if(!validAdminEmail(recoveryEmail)||!validAdminEmail(notificationEmail))return Response.json({error:"Enter valid recovery and notification email addresses."},{status:400});
      await db.prepare("UPDATE admin_accounts SET display_name=?,recovery_email=?,notification_email=?,notifications_enabled=?,updated_at=? WHERE email=?").bind(displayName,recoveryEmail,notificationEmail,checked(form,"notificationsEnabled")?1:0,now,auth.admin.email).run();return Response.json({ok:true});
    }
    if(action==="change_password"){
      const currentPassword=raw(form,"currentPassword");const newPassword=raw(form,"newPassword");if(newPassword!==raw(form,"confirmPassword"))return Response.json({error:"New passwords do not match."},{status:400});
      const result=await changeAdminPassword(auth.admin,currentPassword,newPassword,request.url);return result.ok?Response.json({ok:true}):Response.json({error:result.error},{status:400});
    }
    if(action==="save_note"){
      const id=safeId(text(form,"id"));const title=text(form,"title").slice(0,120);const content=text(form,"content").slice(0,5000);if(!title)return Response.json({error:"Note title is required."},{status:400});
      await db.prepare("INSERT INTO admin_notes (id,title,content,pinned,created_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,content=excluded.content,pinned=excluded.pinned,updated_at=excluded.updated_at").bind(id,title,content,checked(form,"pinned")?1:0,now,now).run();return Response.json({ok:true});
    }
    if(action==="delete_note"){
      const id=text(form,"id");if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id))return Response.json({error:"Invalid note."},{status:400});await db.prepare("DELETE FROM admin_notes WHERE id=?").bind(id).run();return Response.json({ok:true});
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) { console.error("Admin update failed",error instanceof Error?error.message:"unknown error");return Response.json({ error: "Could not save this change. Please try again." }, { status: 500 }); }
}
