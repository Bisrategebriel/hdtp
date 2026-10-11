"use client";

import { useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RotateCcw, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { flintBrand } from "@/config/flint-brand";
import { TIERS, TIER_LABEL, type Tier } from "@/config/tiers";
import { PERSONAS, type PersonaRole } from "../personas";
import { presenterLogout, resetDemo, setProgramMonth, setTier, switchPersona } from "../console-actions";

const MONTHS = [0, 6, 12, 24] as const;

type Props = {
  tenants: { slug: string; name: string }[];
  slug: string;
  tier: Tier;
  month: number;
  persona: PersonaRole | null;
};

export function ConsoleBarControls({ tenants, slug, tier, month, persona }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const run = (label: string, action: () => Promise<unknown>) =>
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        toast.error(`${label} failed`, { description: err instanceof Error ? err.message : undefined });
      }
    });

  const switchHotel = (next: string) => {
    // Keep the current surface (site, app, stay) when moving to another hotel.
    const rest = pathname.split("/").slice(2).join("/");
    const surface = rest.startsWith("app") ? rest.split("/")[0] : "";
    router.push(`/${next}${surface ? `/${surface}` : ""}`);
  };

  return (
    <div
      className="flint-scope sticky top-0 z-50 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-xs"
      style={{ background: flintBrand.colors.surface, color: flintBrand.colors.onSurface }}
      data-testid="flint-console-bar"
    >
      <span className="font-semibold tracking-wide" style={{ color: flintBrand.colors.accent }}>
        Flint demo console
      </span>

      <Control label="Hotel">
        <select aria-label="Hotel" value={slug} onChange={(e) => switchHotel(e.target.value)} className={selectClass}>
          {tenants.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </Control>

      <Control label="Tier">
        <select
          aria-label="Tier"
          value={tier}
          onChange={(e) => run("Tier switch", () => setTier(slug, e.target.value))}
          className={selectClass}
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {TIER_LABEL[t]}
            </option>
          ))}
        </select>
      </Control>

      <Control label="Program month">
        <select
          aria-label="Program month"
          value={month}
          onChange={(e) => run("Month change", () => setProgramMonth(slug, Number(e.target.value)))}
          className={selectClass}
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m === 0 ? "Month 0 (today)" : `Month ${m} (illustrative)`}
            </option>
          ))}
        </select>
      </Control>

      <Control label="Persona">
        <select
          aria-label="Persona"
          value={persona ?? ""}
          onChange={(e) => run("Persona switch", () => switchPersona(slug, e.target.value as PersonaRole))}
          className={selectClass}
        >
          <option value="" disabled>
            Choose persona
          </option>
          {PERSONAS.map((p) => (
            <option key={p.role} value={p.role}>
              {p.label}
            </option>
          ))}
        </select>
      </Control>

      <div className="ml-auto flex items-center gap-2">
        {pending && <Loader2 className="size-3.5 animate-spin" aria-label="Working" />}
        <button
          type="button"
          onClick={() => run("Reset", () => resetDemo(slug).then(() => toast.success("Demo data restored")))}
          className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10"
        >
          <RotateCcw className="size-3.5" /> Reset
        </button>
        <button
          type="button"
          onClick={() => run("Sign out", () => presenterLogout())}
          className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10"
        >
          <LogOut className="size-3.5" /> Exit
        </button>
      </div>
    </div>
  );
}

const selectClass =
  "rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-400 [&>option]:text-black";

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-white/60">{label}</span>
      {children}
    </label>
  );
}
