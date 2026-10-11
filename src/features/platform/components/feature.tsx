import type { ReactNode } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import type { FeatureKey } from "@/config/feature-keys";
import { TIER_LABEL } from "@/config/tiers";
import { getFeatures, type Tenant } from "../tenant";

/**
 * Tier gate (docs/PLAN.md §3). Shows a locked state with the required tier rather than
 * hiding the module: locked modules are what sells the upgrade.
 */
export async function Feature({ tenant, flag, children }: { tenant: Tenant; flag: FeatureKey; children: ReactNode }) {
  const feature = (await getFeatures(tenant)).find((f) => f.key === flag);
  if (!feature) throw new Error(`Unknown feature flag ${flag}`);
  if (feature.enabled) return <>{children}</>;
  return <LockedPanel tenant={tenant} title={feature.title} minTier={feature.minTier} />;
}

export function LockedPanel({
  tenant,
  title,
  minTier,
}: {
  tenant: Tenant;
  title: string;
  minTier: Tenant["tier"];
}) {
  return (
    <div
      className="mx-auto my-10 max-w-md rounded-xl border bg-background p-6 text-center shadow-sm"
      data-testid="feature-locked"
    >
      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
        <Lock className="size-5" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Available from the <strong>{TIER_LABEL[minTier]}</strong> tier. {tenant.name} is on{" "}
        {TIER_LABEL[tenant.tier]}.
      </p>
      <Link
        href={`/${tenant.slug}/app/concept/platform.tiers`}
        className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Compare tiers
      </Link>
    </div>
  );
}
