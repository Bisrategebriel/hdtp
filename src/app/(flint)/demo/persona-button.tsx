"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { switchPersona } from "@/features/platform/console-actions";
import type { PersonaRole } from "@/features/platform/personas";

export function PersonaButton({ slug, role, label }: { slug: string; role: PersonaRole; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await switchPersona(slug, role);
          } catch (err) {
            toast.error("Persona sign-in failed", { description: err instanceof Error ? err.message : undefined });
          }
        })
      }
      className="rounded-full border px-2.5 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
