import { getFeatures, getTenant } from "@/features/platform/tenant";
import { requireStaff } from "@/features/platform/staff-session";
import { StaffNav } from "@/features/platform/components/staff-nav";
import { PERSONAS } from "@/features/platform/personas";
import { TIER_LABEL } from "@/config/tiers";

export default async function StaffLayout({ children, params }: LayoutProps<"/[tenant]/app">) {
  const tenant = await getTenant((await params).tenant);
  const staff = await requireStaff(tenant);
  const features = await getFeatures(tenant);
  const persona = PERSONAS.find((p) => p.role === staff.role);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b bg-sidebar p-3 md:w-72 md:shrink-0 md:border-r md:border-b-0">
        <div className="mb-3 px-2">
          <div className="font-heading text-lg font-semibold text-primary">{tenant.theme.logoText}</div>
          <div className="text-xs text-muted-foreground">
            {TIER_LABEL[tenant.tier]} tier · {persona?.label ?? staff.role}
          </div>
        </div>
        <div className="max-h-[40vh] overflow-y-auto md:max-h-none">
          <StaffNav tenant={tenant} features={features} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-2 text-sm">
          <span className="text-muted-foreground">{staff.fullName}</span>
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground" data-testid="demo-data-chip">
            Demo data
          </span>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
