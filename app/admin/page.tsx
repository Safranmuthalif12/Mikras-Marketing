import { requireAdminPage } from "@/app/admin-auth";
import { getAdminData } from "@/lib/site-data";
import { AdminPanel } from "./admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdminPage();
  const data = await getAdminData(admin.email);
  return <AdminPanel data={data} userName={admin.displayName} />;
}
