import { isPresenter } from "@/server/presenter";
import { createAdminClient } from "@/server/admin";
import { createClient } from "@/lib/supabase/server";
import { listTenants, type Tenant } from "../tenant";
import type { PersonaRole } from "../personas";
import { ConsoleBarControls } from "./console-bar-controls";

/** Flint demo console (docs/PLAN.md §6 of the blueprint). Rendered only for the presenter. */
export async function ConsoleBar({ tenant }: { tenant: Tenant }) {
  if (!(await isPresenter())) return null;

  const supabase = await createClient();
  const [tenants, demoState, { data: auth }] = await Promise.all([
    listTenants(),
    createAdminClient().from("demo_state").select("program_month").eq("tenant_id", tenant.id).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  let persona: PersonaRole | null = null;
  if (auth.user) {
    const { data } = await supabase
      .from("memberships")
      .select("role")
      .eq("tenant_id", tenant.id)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    persona = (data?.role as PersonaRole | undefined) ?? null;
  }

  return (
    <ConsoleBarControls
      tenants={tenants}
      slug={tenant.slug}
      tier={tenant.tier}
      month={demoState.data?.program_month ?? 0}
      persona={persona}
    />
  );
}
