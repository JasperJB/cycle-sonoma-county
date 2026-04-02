import { getSession } from "@/lib/auth/session";
import { SiteHeaderClient } from "@/components/site-header-client";

export async function SiteHeader() {
  const session = await getSession();

  return <SiteHeaderClient session={session} />;
}
