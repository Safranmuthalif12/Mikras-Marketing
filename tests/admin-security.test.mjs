import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const root=fileURLToPath(new URL("..",import.meta.url));
const vite=await createServer({appType:"custom",configFile:false,root,server:{middlewareMode:true}});
after(async()=>{await vite.close();});
const security=await vite.ssrLoadModule("/lib/admin-security-core.ts");

test("uses the maximum PBKDF2 iteration count supported by Cloudflare Workers",()=>{
  assert.equal(security.PASSWORD_HASH_ITERATIONS,100_000);
});

test("enforces the strong admin password policy",()=>{
  assert.match(security.passwordIssue("short"),/12/);
  assert.match(security.passwordIssue("alllowercase123!"),/uppercase/);
  assert.match(security.passwordIssue("ALLUPPERCASE123!"),/lowercase/);
  assert.match(security.passwordIssue("NoNumberHere!"),/number/);
  assert.match(security.passwordIssue("NoSymbolHere123"),/symbol/);
  assert.equal(security.passwordIssue("SecurePassword123!"),null);
});

test("hashes passwords with a random salt and verifies without plaintext storage",async()=>{
  const first=await security.hashPassword("SecurePassword123!");
  const second=await security.hashPassword("SecurePassword123!");
  assert.notEqual(first.salt,second.salt);assert.notEqual(first.hash,second.hash);
  assert.equal(await security.verifyPassword("SecurePassword123!",first.salt,first.hash),true);
  assert.equal(await security.verifyPassword("WrongPassword123!",first.salt,first.hash),false);
  assert.equal(first.hash.includes("SecurePassword123!"),false);
});

test("creates high-entropy URL-safe tokens and SHA-256 token hashes",async()=>{
  const token=security.randomToken();const other=security.randomToken();
  assert.match(token,/^[A-Za-z0-9_-]{40,}$/);assert.notEqual(token,other);
  const digest=await security.sha256(token);assert.match(digest,/^[A-Za-z0-9_-]{40,}$/);assert.notEqual(digest,token);
});

test("blocks open redirects and cross-origin admin writes",()=>{
  assert.equal(security.safeReturnPath("/admin?tab=notes"),"/admin?tab=notes");
  assert.equal(security.safeReturnPath("//evil.example"),"/admin");
  assert.equal(security.safeReturnPath("https://evil.example"),"/admin");
  assert.equal(security.originAllowed("https://mikras.lk/api/admin","https://mikras.lk"),true);
  assert.equal(security.originAllowed("https://mikras.lk/api/admin","https://evil.example"),false);
  assert.equal(security.trustedChatGPTSiteHost("https://mikras-marketing.example.chatgpt.site/admin"),true);
  assert.equal(security.trustedChatGPTSiteHost("https://chatgpt.site.evil.example/admin"),false);
});

test("uses bounded session, reset and account-lock time windows",()=>{
  const now=new Date("2026-09-05T00:00:00.000Z");
  assert.equal(new Date(security.resetExpiry(now)).getTime()-now.getTime(),30*60*1000);
  assert.equal(new Date(security.lockExpiry(now)).getTime()-now.getTime(),15*60*1000);
  assert.equal(new Date(security.sessionExpiry(now)).getTime()-now.getTime(),14*24*60*60*1000);
});
