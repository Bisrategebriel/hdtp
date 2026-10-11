import Link from "next/link";
import { getFeatures, getTenant } from "@/features/platform/tenant";
import { PHASES } from "@/config/phases";
import { TIER_LABEL } from "@/config/tiers";
import { routeFor } from "@/features/platform/routes";

/** Console overview: what this tier includes, phase by phase. The executive dashboard replaces this on Day 8. */
export default async function StaffHome({ params }: PageProps<"/[tenant]/app">) {
  const tenant = await getTenant((await params).tenant);
  const features = (await getFeatures(tenant)).filter((f) => f.level !== "support");
  const phases = [...new Set(features.map((f) => f.phase))];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">{tenant.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {TIER_LABEL[tenant.tier]} tier · {features.filter((f) => f.enabled).length} of {features.length} capabilities
        included
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {phases.map((phase) => {
          const items = features.filter((f) => f.phase === phase);
          const on = items.filter((f) => f.enabled);
          return (
            <div key={phase} className="rounded-xl border bg-background p-4" data-testid={`phase-card-${phase}`}>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {phase === 0 ? "Platform" : `Phase ${phase}`}
              </div>
              <div className="mt-1 font-medium">{PHASES[phase].name}</div>
              <div className="mt-3 text-3xl font-semibold text-primary">
                {on.length}
                <span className="text-base font-normal text-muted-foreground">/{items.length}</span>
              </div>
              {on[0] && (
                <Link href={routeFor(tenant.slug, on[0].key)} className="mt-2 inline-block text-xs text-primary hover:underline">
                  Open {on[0].title}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
