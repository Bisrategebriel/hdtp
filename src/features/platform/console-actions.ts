"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { TIERS } from "@/config/tiers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/admin";
import {
  checkPresenterPassword,
  endPresenterSession,
  startPresenterSession,
  verifyPresenter,
} from "@/server/presenter";
import { PERSONAS, personaEmail, type PersonaRole } from "./personas";

const slugSchema = z.string().regex(/^[a-z0-9-]+$/);

export async function presenterLogin(_prev: { error?: string } | undefined, form: FormData) {
  const password = String(form.get("password") ?? "");
  if (!checkPresenterPassword(password)) return { error: "That password is not right." };
  await startPresenterSession();
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") ? next : "/demo");
}

export async function presenterLogout() {
  await endPresenterSession();
  await (await createClient()).auth.signOut();
  redirect("/login");
}

export async function setTier(slug: string, tier: string) {
  await verifyPresenter();
  const parsed = z.object({ slug: slugSchema, tier: z.enum(TIERS) }).parse({ slug, tier });
  const { error } = await createAdminClient().from("tenants").update({ tier: parsed.tier }).eq("slug", parsed.slug);
  if (error) throw error;
  refresh();
}

export async function setProgramMonth(slug: string, month: number) {
  await verifyPresenter();
  const parsed = z
    .object({ slug: slugSchema, month: z.union([z.literal(0), z.literal(6), z.literal(12), z.literal(24)]) })
    .parse({ slug, month });
  const admin = createAdminClient();
  const { data: tenant, error } = await admin.from("tenants").select("id").eq("slug", parsed.slug).single();
  if (error) throw error;
  const { error: updateError } = await admin
    .from("demo_state")
    .update({ program_month: parsed.month })
    .eq("tenant_id", tenant.id);
  if (updateError) throw updateError;
  refresh();
}

/** Signs in as a seeded persona user; the presenter cookie is untouched. */
export async function switchPersona(slug: string, role: PersonaRole) {
  await verifyPresenter();
  const parsed = z
    .object({ slug: slugSchema, role: z.enum(PERSONAS.map((p) => p.role) as [PersonaRole, ...PersonaRole[]]) })
    .parse({ slug, role });
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: personaEmail(parsed.role, parsed.slug),
    password: process.env.DEMO_PERSONA_PASSWORD ?? "",
  });
  if (error) throw new Error(`Persona sign-in failed: ${error.message}`);
  redirect(PERSONAS.find((p) => p.role === parsed.role)!.home(parsed.slug));
}

/** Restores the tenant's seed state (docs/PLAN.md §7, Reset). */
export async function resetDemo(slug: string) {
  await verifyPresenter();
  const parsedSlug = slugSchema.parse(slug);
  const admin = createAdminClient();
  const { data: tenant, error } = await admin.from("tenants").select("id").eq("slug", parsedSlug).single();
  if (error) throw error;
  const { error: rpcError } = await admin.rpc("demo_reset", { p_tenant: tenant.id });
  if (rpcError) throw rpcError;
  refresh();
}
