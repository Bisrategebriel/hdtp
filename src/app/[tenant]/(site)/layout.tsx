import { getTenant } from "@/features/platform/tenant";
import { SiteHeader } from "@/features/website/components/site-header";

/** Public website shell: tenant header above every page (home, rooms, booking). */
export default async function SiteLayout({ children, params }: LayoutProps<"/[tenant]">) {
  const tenant = await getTenant((await params).tenant);
  return (
    <>
      <SiteHeader tenant={tenant} />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
