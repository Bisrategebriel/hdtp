export const TIERS = ["essential", "growth", "premium"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABEL: Record<Tier, string> = {
  essential: "Essential",
  growth: "Growth",
  premium: "Premium",
};

export const TIER_RANK: Record<Tier, number> = { essential: 1, growth: 2, premium: 3 };

/** CSV and catalog use single letters. */
export const TIER_FROM_CODE: Record<"E" | "G" | "P", Tier> = { E: "essential", G: "growth", P: "premium" };

export function tierAllows(current: Tier, required: Tier): boolean {
  return TIER_RANK[current] >= TIER_RANK[required];
}
