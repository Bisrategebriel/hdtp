import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/server/admin";
import type { Tenant } from "@/features/platform/tenant";

export type BookingSummary = {
  id: string;
  code: string;
  status: string;
  check_in: string;
  check_out: string;
  adults: number;
  total: number;
  online_checkin_at: string | null;
  guest: { first_name: string; last_name: string; email: string | null };
  room_type: string;
};

export function hashPortalToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Reservation for a guest-held portal token (the portal-token lookup allowed in
 * src/server/admin.ts). Only the token's hash is stored, so a leaked database row cannot
 * be turned back into a portal link.
 */
export async function getBookingByToken(tenant: Tenant, token: string): Promise<BookingSummary | null> {
  if (!/^[A-Za-z0-9_-]{16,64}={0,2}$/.test(token)) return null;
  const { data, error } = await createAdminClient()
    .from("reservations")
    .select("id, code, status, check_in, check_out, adults, total, online_checkin_at, guest:guests(first_name, last_name, email), rooms:reservation_rooms(room_type:room_types(name))")
    .eq("tenant_id", tenant.id)
    .eq("portal_token_hash", hashPortalToken(token))
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const rooms = data.rooms as unknown as { room_type: { name: string } }[];
  return {
    ...(data as unknown as Omit<BookingSummary, "room_type" | "total">),
    total: Number(data.total),
    room_type: rooms[0]?.room_type.name ?? "",
  };
}
