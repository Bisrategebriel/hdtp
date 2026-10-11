import { readFileSync } from "node:fs";
import path from "node:path";

export type CatalogRow = {
  feature_key: string;
  category: string;
  phase: number;
  title: string;
  min_tier: "essential" | "growth" | "premium";
  depth: "deep" | "medium" | "light";
  level: "build" | "interactive" | "concept" | "support";
};

const TIER = { E: "essential", G: "growth", P: "premium" } as const;

/** Parses supabase/seed/tier_features.csv. Fields never contain commas, so a plain split is enough. */
export function loadCatalog(): CatalogRow[] {
  const file = path.resolve(process.cwd(), "supabase/seed/tier_features.csv");
  const [header, ...lines] = readFileSync(file, "utf8").trim().split(/\r?\n/);
  const cols = header.split(",");
  return lines.map((line, i) => {
    const values = line.split(",");
    if (values.length !== cols.length) throw new Error(`tier_features.csv line ${i + 2}: expected ${cols.length} fields`);
    const r = Object.fromEntries(cols.map((c, j) => [c, values[j].trim()]));
    const tier = TIER[r.min_tier as keyof typeof TIER];
    if (!tier) throw new Error(`tier_features.csv line ${i + 2}: bad min_tier ${r.min_tier}`);
    return {
      feature_key: r.feature_key,
      category: r.category,
      phase: Number(r.phase),
      title: r.title,
      min_tier: tier,
      depth: r.depth as CatalogRow["depth"],
      level: r.level as CatalogRow["level"],
    };
  });
}
