import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const root=fileURLToPath(new URL("..",import.meta.url));
const vite=await createServer({appType:"custom",configFile:false,root,resolve:{alias:{"@":root}},server:{middlewareMode:true}});
after(async()=>{await vite.close();});

const contact=await vite.ssrLoadModule("/lib/contact.ts");
const store=await vite.ssrLoadModule("/lib/contact-store.ts");

const valid={name:"  Nimal Perera  ",email:"NIMAL@EXAMPLE.COM ",phone:"+94 77 123 4567",subject:" Social media campaign ",message:" We need a complete campaign for our new launch. ",consent:true,companyWebsite:""};

test("normalizes and accepts a valid contact submission",()=>{
  const result=contact.validateContactPayload(valid);
  assert.equal(result.ok,true);
  assert.equal(result.data.name,"Nimal Perera");
  assert.equal(result.data.email,"nimal@example.com");
});

test("rejects invalid, oversized and non-consensual submissions",()=>{
  assert.equal(contact.validateContactPayload({...valid,email:"bad-email"}).ok,false);
  assert.equal(contact.validateContactPayload({...valid,phone:"<script>alert(1)</script>"}).ok,false);
  assert.equal(contact.validateContactPayload({...valid,message:"short"}).ok,false);
  assert.equal(contact.validateContactPayload({...valid,message:"x".repeat(2001)}).ok,false);
  assert.equal(contact.validateContactPayload({...valid,consent:false}).ok,false);
});

test("detects the hidden honeypot without storing a lead",()=>{
  assert.equal(contact.isLikelyBot({...valid,companyWebsite:"https://spam.example"}),true);
  assert.equal(contact.isLikelyBot(valid),false);
});

test("blocks cross-site, oversized and non-JSON requests",()=>{
  assert.equal(contact.contactOriginAllowed("https://mikras.example/api/contact","https://mikras.example"),true);
  assert.equal(contact.contactOriginAllowed("https://mikras.example/api/contact","https://evil.example"),false);
  assert.equal(contact.contentLengthAccepted(String(contact.CONTACT_MAX_BODY_BYTES)),true);
  assert.equal(contact.contentLengthAccepted(String(contact.CONTACT_MAX_BODY_BYTES+1)),false);
  assert.equal(contact.jsonContentTypeAccepted("application/json; charset=utf-8"),true);
  assert.equal(contact.jsonContentTypeAccepted("text/plain"),false);
});

test("protects CSV exports against spreadsheet formula injection",()=>{
  assert.equal(contact.csvCell("=HYPERLINK(\"https://bad.example\")"),'"\'=HYPERLINK(""https://bad.example"")"');
  assert.equal(contact.csvCell("Normal value"),'"Normal value"');
});

function database(recentCount=0){
  const calls=[];
  return {calls,prepare(sql){const call={sql,values:[]};calls.push(call);return{bind(...values){call.values=values;return this;},async first(){return{count:recentCount};},async run(){return{success:true};}};}};
}

test("hashes the client IP and binds lead values instead of interpolating SQL",async()=>{
  const parsed=contact.validateContactPayload(valid); assert.equal(parsed.ok,true);
  const db=database(); const id=await store.persistContactLead(db,parsed.data,"203.0.113.7",new Date("2026-08-28T00:00:00.000Z"));
  assert.match(id,/^[0-9a-f-]{36}$/i);
  assert.equal(db.calls.length,2);
  assert.match(db.calls[0].sql,/ip_hash=\?/);
  assert.equal(db.calls[0].values[0].length,64);
  assert.notEqual(db.calls[0].values[0],"203.0.113.7");
  assert.match(db.calls[1].sql,/VALUES \(\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?\)/);
  assert.equal(db.calls[1].values[1],"Nimal Perera");
  assert.equal(db.calls[1].values[2],"nimal@example.com");
});

test("blocks a sixth valid submission inside the 15 minute window",async()=>{
  const parsed=contact.validateContactPayload(valid); assert.equal(parsed.ok,true);
  const db=database(contact.CONTACT_LIMIT);
  await assert.rejects(()=>store.persistContactLead(db,parsed.data,"203.0.113.7"),error=>error instanceof store.ContactRateLimitError);
  assert.equal(db.calls.length,1);
});
