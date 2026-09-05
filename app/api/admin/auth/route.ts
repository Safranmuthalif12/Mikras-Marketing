import {
  adminRequestOriginAllowed,
  clearAdminSession,
  loginAdmin,
  requestPasswordReset,
  resetAdminPassword,
  safeReturnPath,
  setupAdminAccount,
} from "@/app/admin-auth";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { trustedChatGPTSiteHost } from "@/lib/admin-security-core";

export const dynamic = "force-dynamic";

const value=(form:FormData,key:string)=>String(form.get(key)??"");
const responseHeaders={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const json=(body:Record<string,unknown>,status=200)=>Response.json(body,{status,headers:responseHeaders});

export async function POST(request:Request){
  if(!adminRequestOriginAllowed(request))return json({ok:false,error:"Cross-site request blocked."},403);
  try{
    const form=await request.formData();const action=value(form,"action");const returnTo=safeReturnPath(value(form,"returnTo"));
    if(action==="setup"){
      const password=value(form,"password");if(password!==value(form,"confirmPassword"))return json({ok:false,error:"Passwords do not match."},400);
      const platformUser=trustedChatGPTSiteHost(request.url)?await getChatGPTUser():null;
      const result=await setupAdminAccount({email:value(form,"email"),displayName:value(form,"displayName"),recoveryEmail:value(form,"recoveryEmail"),password,setupToken:value(form,"setupToken"),trustedEmail:platformUser?.email},request.url);
      return result.ok?json({ok:true,redirect:returnTo},201):json({ok:false,error:result.error},400);
    }
    if(action==="login"){
      const result=await loginAdmin(value(form,"email"),value(form,"password"),request.url);
      return result.ok?json({ok:true,redirect:returnTo}):json({ok:false,error:result.error},401);
    }
    if(action==="forgot"){
      await requestPasswordReset(value(form,"email"),new URL(request.url).origin);
      return json({ok:true,message:"If that admin account exists, a secure reset link has been sent."});
    }
    if(action==="reset"){
      const password=value(form,"password");if(password!==value(form,"confirmPassword"))return json({ok:false,error:"Passwords do not match."},400);
      const result=await resetAdminPassword(value(form,"token"),password);
      return result.ok?json({ok:true,redirect:"/admin/login?reset=success"}):json({ok:false,error:result.error},400);
    }
    if(action==="logout"){
      await clearAdminSession();return json({ok:true,redirect:"/admin/login"});
    }
    return json({ok:false,error:"Unknown action."},400);
  }catch(error){console.error("Admin auth request failed",error instanceof Error?error.message:"unknown error");return json({ok:false,error:"The admin service is temporarily unavailable."},500);}
}
