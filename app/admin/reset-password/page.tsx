import { AdminAuthForm } from "../auth-form";
export const dynamic="force-dynamic";
export default async function ResetPasswordPage({searchParams}:{searchParams:Promise<{token?:string}>}){const params=await searchParams;return <AdminAuthForm mode="reset" token={params.token??""}/>;}
