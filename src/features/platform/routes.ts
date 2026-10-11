import type { FeatureKey } from "@/config/feature-keys";

/**
 * Screens that exist as real routes. Every other catalog feature opens the concept
 * template, so navigation never has a dead click (docs/PLAN.md §8.3). Add an entry here
 * when a Build or Interactive screen lands.
 */
const FEATURE_ROUTES: Partial<Record<FeatureKey, string>> = {};

export function routeFor(slug: string, key: FeatureKey): string {
  const path = FEATURE_ROUTES[key];
  return path ? `/${slug}/app/${path}` : `/${slug}/app/concept/${key}`;
}

export function hasRealRoute(key: FeatureKey): boolean {
  return key in FEATURE_ROUTES;
}
