import { env } from "cloudflare:workers";
import type { AdminData, AdminNote, AdminPreferences, ContactLead, Member, Package, Project, PublicData, SiteSettings, Stat } from "./types";

export const fallbackSettings: SiteSettings = { companyName:"MIKRAS Marketing",adminName:"MIKRAS Admin",phone:"+94 76 000 0000",whatsapp:"+94 76 000 0000",whatsappMessage:"Hello MIKRAS Marketing, I would like to discuss a project.",email:"hello@mikras.lk",address:"Sri Lanka · Working globally",facebook:"",instagram:"",tiktok:"",twitter:"",linkedin:"",heroTitle:"Scale your brand",heroAccent:"beyond limits.",heroText:"We blend bold creative, sharp strategy and performance media to turn ambitious brands into measurable success stories." };
export const previewMembers: Member[] = [
  {id:"preview-1",name:"Team profile 01",role:"Strategy & Growth",bio:"Ready for the admin to replace with a real team member, photo, role, bio and social links.",sortOrder:1,active:true},
  {id:"preview-2",name:"Team profile 02",role:"Creative & Content",bio:"Every team card is managed from the MIKRAS admin panel and opens with a smooth profile animation.",sortOrder:2,active:true},
  {id:"preview-3",name:"Team profile 03",role:"Media & Performance",bio:"Add or reorder members at any time. The public carousel updates automatically.",sortOrder:3,active:true},
  {id:"preview-4",name:"Team profile 04",role:"Client Success",bio:"Contact details and social profiles can be included or hidden for each member.",sortOrder:4,active:true},
];
export const fallbackPackages: Package[] = [
  {id:"kickstart",name:"Digital Kickstart",label:"For new brands",price:6000,priceNote:"/ project",features:["Social audit","Content direction","Starter campaign","Monthly report"],featured:false,active:true,sortOrder:1},
  {id:"growth",name:"Growth Campaign",label:"Most popular",price:14000,priceNote:"/ project",features:["Growth strategy","Content production","Paid campaign setup","Weekly optimisation"],featured:true,active:true,sortOrder:2},
  {id:"accelerator",name:"Brand Accelerator",label:"For scale",price:20000,priceNote:"/ project",features:["Full-funnel plan","Creative direction","Performance campaigns","Priority support"],featured:false,active:true,sortOrder:3},
];
export const fallbackStats: Stat[] = [
  {id:"happy_clients",label:"Happy clients",value:120,manualValue:120,suffix:"+",autoMode:true,sortOrder:1},
  {id:"completed_projects",label:"Projects completed",value:64,manualValue:64,suffix:"+",autoMode:true,sortOrder:2},
  {id:"client_satisfaction",label:"Client satisfaction",value:98,manualValue:98,suffix:"%",autoMode:true,sortOrder:3},
];

function database(){return (env as unknown as {DB?:D1Database}).DB}
function features(value:string):string[]{try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.map(String):[]}catch{return[]}}

export async function getPublicData():Promise<PublicData>{
  const db=database(); if(!db)return{members:previewMembers,packages:fallbackPackages,stats:fallbackStats,settings:fallbackSettings};
  try{
    const [sr,mr,pr,tr,ar]=await Promise.all([
      db.prepare("SELECT key, value FROM site_settings").all<{key:string;value:string}>(),
      db.prepare("SELECT id,name,role,bio,photo_key AS photoKey,email,instagram,linkedin,sort_order AS sortOrder,active FROM members WHERE active=1 ORDER BY sort_order,created_at").all<Record<string,unknown>>(),
      db.prepare("SELECT id,name,label,price,price_note AS priceNote,features,featured,active,sort_order AS sortOrder FROM packages WHERE active=1 ORDER BY sort_order,id").all<Record<string,unknown>>(),
      db.prepare("SELECT id,label,manual_value AS manualValue,suffix,auto_mode AS autoMode,sort_order AS sortOrder FROM stat_settings ORDER BY sort_order,id").all<Record<string,unknown>>(),
      db.prepare("SELECT COUNT(DISTINCT CASE WHEN client_name<>'' THEN client_name END) AS clients,SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,ROUND(AVG(CASE WHEN satisfaction IS NOT NULL THEN satisfaction END)) AS satisfaction FROM projects").first<{clients:number;completed:number;satisfaction:number|null}>(),
    ]);
    const map=Object.fromEntries(sr.results.map(r=>[r.key,r.value])); const settings={...fallbackSettings,...map} as SiteSettings;
    const loadedMembers=mr.results.map(r=>({...r,active:Boolean(r.active),photoUrl:r.photoKey?`/media/${String(r.photoKey)}`:undefined})) as Member[];
    const loadedPackages=pr.results.map(r=>({...r,features:features(String(r.features)),featured:Boolean(r.featured),active:Boolean(r.active)})) as Package[];
    const agg=ar??{clients:0,completed:0,satisfaction:0};
    const loadedStats=tr.results.map(r=>{const item={...r,autoMode:Boolean(r.autoMode)} as Omit<Stat,"value">;const auto=item.id==="happy_clients"?agg.clients:item.id==="completed_projects"?agg.completed:agg.satisfaction??0;return{...item,value:item.autoMode?Number(auto):Number(item.manualValue)} as Stat});
    return{settings,members:loadedMembers.length||map.membersConfigured==="1"?loadedMembers:previewMembers,packages:loadedPackages.length?loadedPackages:fallbackPackages,stats:loadedStats.length?loadedStats:fallbackStats};
  }catch{return{members:previewMembers,packages:fallbackPackages,stats:fallbackStats,settings:fallbackSettings}}
}

export async function getAdminData(adminEmail:string):Promise<AdminData>{
  const data=await getPublicData();const db=database();
  const emptyAdmin:AdminPreferences={email:adminEmail,displayName:"MIKRAS Admin",recoveryEmail:adminEmail,notificationEmail:adminEmail,notificationsEnabled:true,emailDeliveryConfigured:Boolean((env as unknown as {RESEND_API_KEY?:string;EMAIL_FROM?:string}).RESEND_API_KEY&&(env as unknown as {EMAIL_FROM?:string}).EMAIL_FROM)};
  if(!db)return{...data,projects:[],leads:[],notes:[],admin:emptyAdmin};
  try{const[mr,pr,jr,lr,nr,account]=await Promise.all([
    db.prepare("SELECT id,name,role,bio,photo_key AS photoKey,email,instagram,linkedin,sort_order AS sortOrder,active FROM members ORDER BY sort_order,created_at").all<Record<string,unknown>>(),
    db.prepare("SELECT id,name,label,price,price_note AS priceNote,features,featured,active,sort_order AS sortOrder FROM packages ORDER BY sort_order,id").all<Record<string,unknown>>(),
    db.prepare("SELECT id,title,client_name AS clientName,status,satisfaction,created_at AS createdAt FROM projects ORDER BY created_at DESC").all<Record<string,unknown>>(),
    db.prepare("SELECT id,name,email,phone,subject,message,status,notes,source,consent_at AS consentAt,created_at AS createdAt,updated_at AS updatedAt FROM contact_leads ORDER BY created_at DESC LIMIT 500").all<Record<string,unknown>>(),
    db.prepare("SELECT id,title,content,pinned,created_at AS createdAt,updated_at AS updatedAt FROM admin_notes ORDER BY pinned DESC,updated_at DESC").all<Record<string,unknown>>(),
    db.prepare("SELECT email,display_name AS displayName,recovery_email AS recoveryEmail,notification_email AS notificationEmail,notifications_enabled AS notificationsEnabled FROM admin_accounts WHERE email=?").bind(adminEmail).first<Record<string,unknown>>(),
  ]);const members=mr.results.map(r=>({...r,active:Boolean(r.active),photoUrl:r.photoKey?`/media/${String(r.photoKey)}`:undefined})) as Member[];const packages=pr.results.map(r=>({...r,features:features(String(r.features)),featured:Boolean(r.featured),active:Boolean(r.active)})) as Package[];const notes=nr.results.map(r=>({...r,pinned:Boolean(r.pinned)})) as AdminNote[];const admin=account?{...account,notificationsEnabled:Boolean(account.notificationsEnabled),emailDeliveryConfigured:emptyAdmin.emailDeliveryConfigured} as AdminPreferences:emptyAdmin;return{...data,members:members.length?members:data.members,packages:packages.length?packages:data.packages,projects:jr.results as Project[],leads:lr.results as ContactLead[],notes,admin}}catch{return{...data,projects:[],leads:[],notes:[],admin:emptyAdmin}}
}
