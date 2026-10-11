import Link from "next/link";
import { LayoutDashboard, Lock } from "lucide-react";
import { PHASES } from "@/config/phases";
import { routeFor } from "../routes";
import type { CatalogFeature, Tenant } from "../tenant";

/**
 * Navigation generated from the feature catalog: no hand-maintained menu, and every item
 * opens a working screen, a concept screen or a locked state (no dead clicks).
 */
export function StaffNav({ tenant, features }: { tenant: Tenant; features: CatalogFeature[] }) {
  const byPhase = new Map<number, CatalogFeature[]>();
  for (const f of features) {
    if (f.level === "support") continue;
    byPhase.set(f.phase, [...(byPhase.get(f.phase) ?? []), f]);
  }

  return (
    <nav className="flex flex-col gap-1 text-sm" aria-label="Modules">
      <Link
        href={`/${tenant.slug}/app`}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 font-medium hover:bg-muted"
      >
        <LayoutDashboard className="size-4" /> Overview
      </Link>
      {[...byPhase.entries()].map(([phase, items]) => (
        <details key={phase} className="group" open={phase === 3}>
          <summary className="cursor-pointer list-none rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted">
            {phase === 0 ? PHASES[0].short : `Phase ${phase} · ${PHASES[phase].short}`}
          </summary>
          <ul className="mb-1 ml-2 border-l pl-2">
            {items.map((f) => (
              <li key={f.key}>
                <Link
                  href={routeFor(tenant.slug, f.key)}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-muted"
                  data-feature={f.key}
                  data-locked={!f.enabled}
                >
                  <span className={f.enabled ? "" : "text-muted-foreground"}>{f.title}</span>
                  {!f.enabled ? (
                    <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Locked in this tier" />
                  ) : f.level === "concept" ? (
                    <span className="shrink-0 rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-800">
                      concept
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </nav>
  );
}
