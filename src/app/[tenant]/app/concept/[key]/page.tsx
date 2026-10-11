import { notFound } from "next/navigation";
import { getFeatures, getTenant } from "@/features/platform/tenant";
import { LockedPanel } from "@/features/platform/components/feature";
import { conceptSample, defaultSampleKind, type SampleKind } from "@/features/concept/concept-data";
import { ConceptVisual } from "@/features/concept/concept-visual";
import { PHASES } from "@/config/phases";
import { TIER_LABEL } from "@/config/tiers";
import { createAdminClient } from "@/server/admin";

/** One template for every concept feature (docs/PLAN.md §8.3). */
export default async function ConceptPage({ params }: PageProps<"/[tenant]/app/concept/[key]">) {
  const { tenant: slug, key } = await params;
  const tenant = await getTenant(slug);
  const feature = (await getFeatures(tenant)).find((f) => f.key === key);
  if (!feature) notFound();

  const { data: extra } = await createAdminClient()
    .from("tier_features")
    .select("full_build, sample_kind")
    .eq("feature_key", key)
    .single();

  const phase = PHASES[feature.phase];
  const kind = (extra?.sample_kind as SampleKind | null) ?? defaultSampleKind(feature.phase);
  const sample = conceptSample(feature.key, tenant.slug, feature.phase, kind);
  const fullBuild: string[] = extra?.full_build ?? [
    `Works on live ${tenant.name} data, shared with every other module`,
    `Role-based access and audit trail for ${phase.name.toLowerCase()}`,
    "Delivered and supported under the HDTP service levels",
  ];

  const body = (
    <article className="mx-auto max-w-5xl" data-testid="concept-screen">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-2xl font-semibold">{feature.title}</h1>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-amber-900" data-testid="concept-badge">
          CONCEPT
        </span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
          {feature.phase === 0 ? "Platform" : `Phase ${feature.phase} · ${phase.short}`}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">From {TIER_LABEL[feature.minTier]}</span>
      </header>

      <section className="mt-5 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <h2 className="text-sm font-semibold">What it does</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {feature.description ??
              `${feature.title} is part of ${phase.name} in the Hotel Digital Transformation Program. This screen shows its scope with sample data.`}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">In the full HDTP build</h2>
          <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
            {fullBuild.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-background p-4">
        <ConceptVisual sample={sample} />
        <p className="mt-3 text-xs text-muted-foreground">Sample data · not live</p>
      </section>

      <p className="mt-6 text-xs text-muted-foreground">
        Concept screen. Shown to illustrate scope;{" "}
        {feature.phase === 0 ? "part of the HDTP platform." : `delivered in Phase ${feature.phase} of HDTP.`}
      </p>
    </article>
  );

  if (feature.enabled) return body;
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm" aria-hidden>
        {body}
      </div>
      <div className="absolute inset-0 flex items-start justify-center pt-10">
        <LockedPanel tenant={tenant} title={feature.title} minTier={feature.minTier} />
      </div>
    </div>
  );
}
