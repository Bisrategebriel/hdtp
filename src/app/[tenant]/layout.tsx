import type { Metadata } from "next";
import { getTenant } from "@/features/platform/tenant";
import { TenantScope } from "@/features/platform/components/tenant-scope";
import { ConsoleBar } from "@/features/platform/components/console-bar";
import { TenantLiveRefresh } from "@/features/platform/components/tenant-live-refresh";
import { FlintFooter } from "@/features/platform/components/flint-footer";

export async function generateMetadata({ params }: LayoutProps<"/[tenant]">): Promise<Metadata> {
  const tenant = await getTenant((await params).tenant);
  return { title: { default: tenant.name, template: `%s · ${tenant.name}` } };
}

/** Every tenant surface (site, portal, console) shares the theme, console bar and Flint footer. */
export default async function TenantLayout({ children, params }: LayoutProps<"/[tenant]">) {
  const tenant = await getTenant((await params).tenant);
  return (
    <TenantScope theme={tenant.theme}>
      <ConsoleBar tenant={tenant} />
      <TenantLiveRefresh tenantId={tenant.id} />
      <div className="flex flex-1 flex-col">{children}</div>
      <FlintFooter />
    </TenantScope>
  );
}
