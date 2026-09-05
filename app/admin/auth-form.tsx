"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { ArrowLeft, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

type Mode="login"|"setup"|"forgot"|"reset";

export function AdminAuthForm({mode,returnTo="/admin",token="",resetSuccess=false}:{mode:Mode;returnTo?:string;token?:string;resetSuccess?:boolean}){
  const[status,setStatus]=useState<{type:"idle"|"sending"|"success"|"error";message:string}>({type:"idle",message:resetSuccess?"Password changed. Sign in with your new password.":""});
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);form.set("action",mode);form.set("returnTo",returnTo);if(token)form.set("token",token);setStatus({type:"sending",message:"Please wait..."});
    try{const response=await fetch("/api/admin/auth",{method:"POST",body:form});const result=await response.json() as {ok?:boolean;error?:string;message?:string;redirect?:string};if(!response.ok||!result.ok)throw new Error(result.error||"Could not complete this request.");if(result.redirect){window.location.assign(result.redirect);return;}setStatus({type:"success",message:result.message||"Done."});event.currentTarget.reset();}catch(error){setStatus({type:"error",message:error instanceof Error?error.message:"Could not complete this request."});}}
  const title=mode==="setup"?"Secure your control room.":mode==="forgot"?"Reset your password.":mode==="reset"?"Choose a new password.":"Welcome back.";
  const description=mode==="setup"?"Create the first MIKRAS admin account using the one-time setup secret configured on the server.":mode==="forgot"?"Enter your admin email. A one-use link will be sent to the recovery address.":mode==="reset"?"Use 12+ characters with uppercase, lowercase, a number and a symbol.":"Sign in to manage leads, team members, packages, live results and company settings.";
  return <main className="admin-auth-page"><section className="admin-auth-brand"><Link href="/" className="admin-auth-back"><ArrowLeft/>Public website</Link><div><span className="admin-logo">M</span><p>MIKRAS MARKETING</p><h1>Everything your<br/>brand needs.<br/><em>One control room.</em></h1></div></section><section className="admin-auth-panel"><form onSubmit={submit} className="admin-auth-card"><span className="admin-auth-icon">{mode==="forgot"?<Mail/>:mode==="setup"?<ShieldCheck/>:mode==="reset"?<KeyRound/>:<LockKeyhole/>}</span><p className="eyebrow">MIKRAS ADMIN</p><h2>{title}</h2><p>{description}</p>
    {mode==="setup"&&<><label>Display name<input name="displayName" autoComplete="name" maxLength={80} required/></label><label>Recovery email<input name="recoveryEmail" type="email" autoComplete="email" maxLength={254} required/></label></>}
    {mode!=="reset"&&<label>Admin email<input name="email" type="email" autoComplete="username" maxLength={254} required/></label>}
    {(mode==="login"||mode==="setup"||mode==="reset")&&<label>{mode==="reset"?"New password":"Password"}<input name="password" type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={12} maxLength={128} required/></label>}
    {(mode==="setup"||mode==="reset")&&<label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></label>}
    {mode==="setup"&&<label>One-time setup token <small>Optional on the private ChatGPT Site</small><input name="setupToken" type="password" autoComplete="off" minLength={20}/></label>}
    {status.message&&<p className={`admin-auth-status ${status.type}`} role={status.type==="error"?"alert":"status"}>{status.message}</p>}
    <button type="submit" disabled={status.type==="sending"}>{status.type==="sending"?"Please wait...":mode==="setup"?"Create admin account":mode==="forgot"?"Send reset link":mode==="reset"?"Save new password":"Sign in securely"}</button>
    <div className="admin-auth-links">{mode==="login"&&<Link href="/admin/forgot-password">Forgot password?</Link>}{mode!=="login"&&<Link href="/admin/login">Back to sign in</Link>}</div>
  </form></section></main>;
}
