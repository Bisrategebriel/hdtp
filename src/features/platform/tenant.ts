import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/anon";
import { createAdminClient } from "@/server/admin";
import type { Tier } from "@/config/tiers";
import { tierAllows } from "@/config/tiers";
import type { FeatureKey } from "@/config/feature-keys";
import { themeSchema, type TenantTheme } from "./theme";

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  tier: Tier;
  theme: TenantTheme;
  currency: string;
  settings: { otaCommissionPct: number; vatPct: number; serviceChargePct: number };
};

export type CatalogFeature = {
  key: FeatureKey;
  category: string;
  phase: number;
  title: string;
  minTier: Tier;
  level: "build" | "interactive" | "concept" | "support";
  depth: "deep" | "medium" | "light";
  description: string | null;
  enabled: boolean;
};

/** Tenant row for a URL slug, once per request. Tenant metadata is public (anon read). */
export const getTenant = cache(async (slug: string): Promise<Tenant> => {
  const { data, error } = await createAnonClient()
    .from("tenants")
    .select("id, slug, name, tier, theme, currency, settings")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return { ...data, theme: themeSchema.parse(data.theme) } as Tenant;
});

export const listTenants = cache(async () => {
  const { data, error } = await createAnonClient().from("tenants").select("slug, name, tier").order("name");
  if (error) throw error;
  return data as { slug: string; name: string; tier: Tier }[];
});

/**
 * Features resolved for a tenant: min_tier <= tenant tier unless overridden.
 * Overrides are tenant-private rows, so they are read with the admin client; the tenant
 * id always comes from the URL slug, never from user input.
 */
export const getFeatures = cache(async (tenant: Tenant): Promise<CatalogFeature[]> => {
  const admin = createAdminClient();
  const [catalog, overrides] = await Promise.all([
    admin.from("tier_features").select("*").order("phase").order("feature_key"),
    admin.from("tenant_feature_overrides").select("feature_key, enabled").eq("tenant_id", tenant.id),
  ]);
  if (catalog.error) throw catalog.error;
  if (overrides.error) throw overrides.error;
  const override = new Map(overrides.data.map((o) => [o.feature_key, o.enabled as boolean]));
  return catalog.data.map((f) => ({
    key: f.feature_key,
    category: f.category,
    phase: f.phase,
    title: f.title,
    minTier: f.min_tier,
    level: f.level,
    depth: f.depth,
    description: f.description,
    enabled: override.get(f.feature_key) ?? tierAllows(tenant.tier, f.min_tier),
  }));
});

export class FeatureLockedError extends Error {
  constructor(public readonly key: FeatureKey) {
    super(`Feature ${key} is not included in this tier.`);
  }
}

/** Server-side guard for actions and route handlers behind a feature flag. */
export async function requireFeature(tenant: Tenant, key: FeatureKey) {
  const feature = (await getFeatures(tenant)).find((f) => f.key === key);
  if (!feature?.enabled) throw new FeatureLockedError(key);
}
