import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_LOCK_MINUTES,
  ADMIN_MAX_LOGIN_ATTEMPTS,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_DAYS,
  constantTimeEqual,
  hashPassword,
  lockExpiry,
  normalizeAdminEmail,
  originAllowed,
  passwordIssue,
  randomToken,
  resetExpiry,
  safeReturnPath,
  sessionExpiry,
  sha256,
  validAdminEmail,
  verifyPassword,
} from "@/lib/admin-security-core";
import { sendPasswordResetEmail } from "@/lib/email-service";

type Runtime = { DB?: D1Database; ADMIN_EMAILS?: string; ADMIN_SETUP_TOKEN?: string };
type AccountRow = {
  email:string;displayName:string;passwordHash:string;passwordSalt:string;recoveryEmail:string;
  notificationEmail:string;notificationsEnabled:number;failedAttempts:number;lockedUntil:string|null;sessionVersion:number;
};
export type AdminIdentity = { email:string;displayName:string;sessionVersion:number };

function runtime(): Runtime { return env as unknown as Runtime; }
export function adminDatabase(): D1Database {
  const db=runtime().DB; if(!db) throw new Error("Admin database is unavailable."); return db;
}
export function configuredAdminEmails(): string[] {
  return (runtime().ADMIN_EMAILS??"").split(",").map(normalizeAdminEmail).filter(validAdminEmail);
}
export function isAdminEmail(email:string):boolean { return configuredAdminEmails().includes(normalizeAdminEmail(email)); }
export function adminRequestOriginAllowed(request:Request):boolean { return originAllowed(request.url,request.headers.get("origin")); }

async function accountByEmail(db:D1Database,email:string):Promise<AccountRow|null>{
  return (await db.prepare("SELECT email,display_name AS displayName,password_hash AS passwordHash,password_salt AS passwordSalt,recovery_email AS recoveryEmail,notification_email AS notificationEmail,notifications_enabled AS notificationsEnabled,failed_attempts AS failedAttempts,locked_until AS lockedUntil,session_version AS sessionVersion FROM admin_accounts WHERE email=?").bind(email).first<AccountRow>())??null;
}

export async function adminSetupRequired():Promise<boolean>{
  try { const row=await adminDatabase().prepare("SELECT COUNT(*) AS count FROM admin_accounts").first<{count:number}>(); return Number(row?.count??0)===0; }
  catch { return true; }
}

export async function getAdminSession():Promise<AdminIdentity|null>{
  const token=(await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if(!token)return null;
  try{
    const tokenHash=await sha256(token); const now=new Date().toISOString();
    const row=await adminDatabase().prepare("SELECT a.email,a.display_name AS displayName,a.session_version AS sessionVersion,s.session_version AS storedVersion FROM admin_sessions s JOIN admin_accounts a ON a.email=s.admin_email WHERE s.token_hash=? AND s.expires_at>? LIMIT 1").bind(tokenHash,now).first<AdminIdentity&{storedVersion:number}>();
    if(!row||row.sessionVersion!==row.storedVersion||!isAdminEmail(row.email))return null;
    return {email:row.email,displayName:row.displayName,sessionVersion:row.sessionVersion};
  }catch{return null;}
}

export async function requireAdminPage():Promise<AdminIdentity>{
  const admin=await getAdminSession(); if(admin)return admin; redirect("/admin/login?returnTo=%2Fadmin");
}

export async function requireAdminApi(){
  const admin=await getAdminSession();
  if(!admin)return{ok:false as const,response:Response.json({error:"Admin sign-in required"},{status:401,headers:{"Cache-Control":"no-store"}})};
  return{ok:true as const,admin};
}

async function issueSession(db:D1Database,email:string,version:number,requestUrl:string):Promise<void>{
  const token=randomToken();const now=new Date();const expiresAt=sessionExpiry(now);
  await db.prepare("INSERT INTO admin_sessions (token_hash,admin_email,session_version,created_at,expires_at) VALUES (?,?,?,?,?)").bind(await sha256(token),email,version,now.toISOString(),expiresAt).run();
  (await cookies()).set(ADMIN_SESSION_COOKIE,token,{httpOnly:true,sameSite:"strict",secure:new URL(requestUrl).protocol==="https:",path:"/",maxAge:ADMIN_SESSION_DAYS*24*60*60});
}

export async function clearAdminSession():Promise<void>{
  const jar=await cookies();const token=jar.get(ADMIN_SESSION_COOKIE)?.value;
  if(token){try{await adminDatabase().prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(await sha256(token)).run();}catch{}}
  jar.set(ADMIN_SESSION_COOKIE,"",{httpOnly:true,sameSite:"strict",secure:true,path:"/",maxAge:0});
}

export async function setupAdminAccount(input:{email:string;displayName:string;recoveryEmail:string;password:string;setupToken:string;trustedEmail?:string|null},requestUrl:string):Promise<{ok:true}|{ok:false;error:string}>{
  const email=normalizeAdminEmail(input.email);const recoveryEmail=normalizeAdminEmail(input.recoveryEmail||email);
  if(!isAdminEmail(email))return{ok:false,error:"This email is not in ADMIN_EMAILS."};
  if(!validAdminEmail(recoveryEmail))return{ok:false,error:"Enter a valid recovery email."};
  const issue=passwordIssue(input.password);if(issue)return{ok:false,error:issue};
  const expected=runtime().ADMIN_SETUP_TOKEN?.trim()??"";
  const trustedOwner=normalizeAdminEmail(input.trustedEmail)===email;
  if(!trustedOwner&&expected.length<20)return{ok:false,error:"ADMIN_SETUP_TOKEN is not configured on the server."};
  if(!trustedOwner&&!constantTimeEqual(input.setupToken,expected))return{ok:false,error:"The one-time setup token is incorrect."};
  const db=adminDatabase();if(!(await adminSetupRequired()))return{ok:false,error:"Admin setup has already been completed."};
  const now=new Date().toISOString();const hashed=await hashPassword(input.password);const displayName=input.displayName.trim().slice(0,80)||"MIKRAS Admin";
  await db.prepare("INSERT INTO admin_accounts (email,display_name,password_hash,password_salt,recovery_email,notification_email,notifications_enabled,failed_attempts,locked_until,session_version,password_changed_at,created_at,updated_at) VALUES (?,?,?,?,?,?,1,0,NULL,1,?,?,?)").bind(email,displayName,hashed.hash,hashed.salt,recoveryEmail,recoveryEmail,now,now,now).run();
  await issueSession(db,email,1,requestUrl);return{ok:true};
}

export async function loginAdmin(emailInput:string,password:string,requestUrl:string):Promise<{ok:true}|{ok:false;error:string}>{
  const email=normalizeAdminEmail(emailInput);const db=adminDatabase();const account=validAdminEmail(email)&&isAdminEmail(email)?await accountByEmail(db,email):null;
  if(account?.lockedUntil&&new Date(account.lockedUntil).getTime()>Date.now())return{ok:false,error:`Too many attempts. Try again in ${ADMIN_LOCK_MINUTES} minutes.`};
  const valid=account?await verifyPassword(password,account.passwordSalt,account.passwordHash):await verifyPassword(password,"AAAAAAAAAAAAAAAAAAAAAAAA", "invalid-password-hash");
  if(!account||!valid){
    if(account){const attempts=account.failedAttempts+1;await db.prepare("UPDATE admin_accounts SET failed_attempts=?,locked_until=?,updated_at=? WHERE email=?").bind(attempts,attempts>=ADMIN_MAX_LOGIN_ATTEMPTS?lockExpiry():null,new Date().toISOString(),email).run();}
    return{ok:false,error:"Email or password is incorrect."};
  }
  await db.prepare("UPDATE admin_accounts SET failed_attempts=0,locked_until=NULL,updated_at=? WHERE email=?").bind(new Date().toISOString(),email).run();
  await issueSession(db,email,account.sessionVersion,requestUrl);return{ok:true};
}

export async function requestPasswordReset(emailInput:string,origin:string):Promise<void>{
  const email=normalizeAdminEmail(emailInput);if(!validAdminEmail(email)||!isAdminEmail(email))return;
  const db=adminDatabase();const account=await accountByEmail(db,email);if(!account)return;
  const token=randomToken();const tokenHash=await sha256(token);const now=new Date();
  const recent=await db.prepare("SELECT COUNT(*) AS count FROM admin_password_resets WHERE admin_email=? AND created_at>?").bind(email,new Date(now.getTime()-5*60*1000).toISOString()).first<{count:number}>();if(Number(recent?.count??0)>0)return;
  await db.batch([db.prepare("DELETE FROM admin_password_resets WHERE admin_email=? OR expires_at<?").bind(email,now.toISOString()),db.prepare("INSERT INTO admin_password_resets (token_hash,admin_email,created_at,expires_at,used_at) VALUES (?,?,?,?,NULL)").bind(tokenHash,email,now.toISOString(),resetExpiry(now))]);
  const delivered=await sendPasswordResetEmail(account.recoveryEmail,`${origin}/admin/reset-password?token=${encodeURIComponent(token)}`);
  if(!delivered)console.error("Password reset email delivery is not configured or failed");
}

export async function resetAdminPassword(token:string,password:string):Promise<{ok:true}|{ok:false;error:string}>{
  const issue=passwordIssue(password);if(issue)return{ok:false,error:issue};
  if(token.length<32)return{ok:false,error:"This reset link is invalid or expired."};
  const db=adminDatabase();const now=new Date().toISOString();const tokenHash=await sha256(token);
  const reset=await db.prepare("SELECT admin_email AS adminEmail FROM admin_password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at>? LIMIT 1").bind(tokenHash,now).first<{adminEmail:string}>();
  if(!reset)return{ok:false,error:"This reset link is invalid or expired."};
  const hashed=await hashPassword(password);
  await db.batch([db.prepare("UPDATE admin_accounts SET password_hash=?,password_salt=?,session_version=session_version+1,failed_attempts=0,locked_until=NULL,password_changed_at=?,updated_at=? WHERE email=?").bind(hashed.hash,hashed.salt,now,now,reset.adminEmail),db.prepare("UPDATE admin_password_resets SET used_at=? WHERE token_hash=?").bind(now,tokenHash),db.prepare("DELETE FROM admin_sessions WHERE admin_email=?").bind(reset.adminEmail)]);
  return{ok:true};
}

export async function changeAdminPassword(admin:AdminIdentity,currentPassword:string,newPassword:string,requestUrl:string):Promise<{ok:true}|{ok:false;error:string}>{
  const issue=passwordIssue(newPassword);if(issue)return{ok:false,error:issue};const db=adminDatabase();const account=await accountByEmail(db,admin.email);
  if(!account||!await verifyPassword(currentPassword,account.passwordSalt,account.passwordHash))return{ok:false,error:"Current password is incorrect."};
  const hashed=await hashPassword(newPassword);const nextVersion=account.sessionVersion+1;const now=new Date().toISOString();
  await db.batch([db.prepare("UPDATE admin_accounts SET password_hash=?,password_salt=?,session_version=?,password_changed_at=?,updated_at=? WHERE email=?").bind(hashed.hash,hashed.salt,nextVersion,now,now,admin.email),db.prepare("DELETE FROM admin_sessions WHERE admin_email=?").bind(admin.email)]);
  await issueSession(db,admin.email,nextVersion,requestUrl);return{ok:true};
}

export { normalizeAdminEmail, passwordIssue, safeReturnPath };
