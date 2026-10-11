import "server-only";
import { cache } from "react";
import { forbidden, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PersonaRole } from "./personas";
import type { Tenant } from "./tenant";

export type StaffSession = { userId: string; email: string; role: PersonaRole; fullName: string };

/**
 * The signed-in persona and their role on this tenant. Not a member: 403. This is the
 * app-level half of tenant isolation; RLS is the database half.
 */
export const requireStaff = cache(async (tenant: Tenant): Promise<StaffSession> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/${tenant.slug}/app`);

  const [{ data: membership }, { data: profile }] = await Promise.all([
    supabase.from("memberships").select("role").eq("tenant_id", tenant.id).eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!membership) forbidden();

  return {
    userId: user.id,
    email: user.email ?? "",
    role: membership.role as PersonaRole,
    fullName: profile?.full_name ?? user.email ?? "Staff",
  };
});
