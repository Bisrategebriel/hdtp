import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Cookie-less anon client for the public website. Reads must not depend on who is
 * signed in: a Lakeview persona browsing the Acacia site sees Acacia's public content.
 */
export function createAnonClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
