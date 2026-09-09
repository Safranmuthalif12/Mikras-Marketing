export const ADMIN_SESSION_COOKIE = "mikras_admin_session";
export const ADMIN_SESSION_DAYS = 14;
export const ADMIN_RESET_MINUTES = 30;
export const ADMIN_MAX_LOGIN_ATTEMPTS = 5;
export const ADMIN_LOCK_MINUTES = 15;
// Cloudflare Workers WebCrypto currently caps PBKDF2 at 100,000 iterations.\nexport const PASSWORD_HASH_ITERATIONS = 100_000;

const encoder = new TextEncoder();

export function normalizeAdminEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function validAdminEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function passwordIssue(password: string): string | null {
  if (password.length < 12) return "Use at least 12 characters.";
  if (password.length > 128) return "Password is too long.";
  if (!/[a-z]/.test(password)) return "Add a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Add an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Add a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Add a symbol.";
  return null;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function randomToken(bytes = 32): string {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return bytesToBase64Url(value);
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function hashPassword(password: string, salt = randomToken(18)): Promise<{ hash: string; salt: string }> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: base64UrlToBytes(salt), iterations: PASSWORD_HASH_ITERATIONS }, key, 256);
  return { hash: bytesToBase64Url(new Uint8Array(bits)), salt };
}

export function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return difference === 0;
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const actual = await hashPassword(password, salt);
  return constantTimeEqual(actual.hash, expectedHash);
}

export function sessionExpiry(now = new Date()): string {
  return new Date(now.getTime() + ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function resetExpiry(now = new Date()): string {
  return new Date(now.getTime() + ADMIN_RESET_MINUTES * 60 * 1000).toISOString();
}

export function lockExpiry(now = new Date()): string {
  return new Date(now.getTime() + ADMIN_LOCK_MINUTES * 60 * 1000).toISOString();
}

export function safeReturnPath(value: unknown): string {
  const path = String(value ?? "");
  if (!path.startsWith("/") || path.startsWith("//")) return "/admin";
  try {
    const url = new URL(path, "https://mikras.local");
    if (url.origin !== "https://mikras.local") return "/admin";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/admin";
  }
}

export function originAllowed(requestUrl: string, origin: string | null): boolean {
  if (!origin) return true;
  try { return new URL(requestUrl).origin === new URL(origin).origin; } catch { return false; }
}

export function trustedChatGPTSiteHost(requestUrl:string):boolean{
  try{const host=new URL(requestUrl).hostname.toLowerCase();return host==="chatgpt.site"||host.endsWith(".chatgpt.site");}catch{return false;}
}
