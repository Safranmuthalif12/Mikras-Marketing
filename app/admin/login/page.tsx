import { redirect } from "next/navigation";
import { adminSetupRequired, getAdminSession, safeReturnPath } from "@/app/admin-auth";
import { AdminAuthForm } from "../auth-form";

export const dynamic="force-dynamic";
export default async function AdminLoginPage({searchParams}:{searchParams:Promise<{returnTo?:string;reset?:string}>}){
  const params=await searchParams;const session=await getAdminSession();if(session)redirect(safeReturnPath(params.returnTo));
  const setup=await adminSetupRequired();return <AdminAuthForm mode={setup?"setup":"login"} returnTo={safeReturnPath(params.returnTo)} resetSuccess={params.reset==="success"}/>;
}
