import Link from "next/link";
import { redirect } from "next/navigation";
import { isPresenter } from "@/server/presenter";
import { listTenants } from "@/features/platform/tenant";
import { TIER_LABEL } from "@/config/tiers";
import { PERSONAS } from "@/features/platform/personas";
import { PersonaButton } from "./persona-button";

export const metadata = { title: "Demo launcher" };

/** Presenter home: pick a hotel and a persona. The storyline checklists land on Day 12. */
export default async function DemoPage() {
  if (!(await isPresenter())) redirect("/login");
  const tenants = await listTenants();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Demo launcher</h1>
      <p className="mt-1 text-sm text-slate-600">
        Fictional hotels. All data is demo data; projections are illustrative.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {tenants.map((t) => (
          <section key={t.slug} className="rounded-xl border bg-white p-4" data-testid={`launcher-${t.slug}`}>
            <h2 className="font-semibold">{t.name}</h2>
            <p className="text-xs text-slate-500">{TIER_LABEL[t.tier]} tier</p>
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              <Link href={`/${t.slug}`} className="text-orange-700 hover:underline">
                Open hotel website
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PERSONAS.map((p) => (
                <PersonaButton key={p.role} slug={t.slug} role={p.role} label={p.label} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
