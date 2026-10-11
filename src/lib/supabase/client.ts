"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Browser client, used only by components that subscribe to Realtime. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
