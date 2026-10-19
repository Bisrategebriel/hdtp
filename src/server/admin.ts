import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS, so this is the ONLY file that may read
 * SUPABASE_SERVICE_ROLE_KEY. Allowed callers (docs/PLAN.md §3): public booking with the
 * tenant resolved from the URL slug, portal-token lookup, presenter console actions
 * after verifyPresenter(), and two read-only lookups keyed by the URL slug:
 * getFeatures() in features/platform/tenant.ts (tenant feature overrides) and the
 * ConsoleBar (demo_state, rendered only after isPresenter()).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. See .env.example.");
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
