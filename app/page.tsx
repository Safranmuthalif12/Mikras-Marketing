import { PublicSite } from "./public-site";
import { getPublicData } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getPublicData();
  return <PublicSite data={data} />;
}
