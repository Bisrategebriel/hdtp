"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Re-renders when the tenant row changes (tier flip, theme), so a phone showing the same
 * hotel updates without a reload (B1).
 */
export function TenantLiveRefresh({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`tenant:${tenantId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tenants", filter: `id=eq.${tenantId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, router]);
  return null;
}
