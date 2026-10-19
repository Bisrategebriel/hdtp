import "server-only";
import { cache } from "react";
import { createAnonClient } from "@/lib/supabase/anon";
import { createAdminClient } from "@/server/admin";
import { addDays, hotelToday } from "@/lib/dates";
import type { Tenant } from "@/features/platform/tenant";
import type { Search } from "./schema";

export type RoomType = {
  id: string;
  code: string;
  name: string;
  description: string;
  bed: string;
  size_sqm: number;
  max_adults: number;
  amenities: string[];
};

export type RatePlan = { id: string; code: string; name: string; description: string; refundable: boolean; includes_breakfast: boolean };

export type QuoteLine = { category: string; description: string; amount: number; posted_on: string };
export type Quote = { nights: number; lines: QuoteLine[]; subtotal: number; service: number; tax: number; total: number };

/**
 * The website books the main property only (PLAN §1.3 item 12). Properties are staff-only
 * rows, so this lookup uses the service role with the tenant from the URL slug.
 */
export const getPrimaryPropertyId = cache(async (tenant: Tenant): Promise<string> => {
  const { data, error } = await createAdminClient()
    .from("properties")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("is_primary", true)
    .single();
  if (error) throw error;
  return data.id;
});

export const listRoomTypes = cache(async (tenant: Tenant): Promise<RoomType[]> => {
  const propertyId = await getPrimaryPropertyId(tenant);
  const { data, error } = await createAnonClient()
    .from("room_types")
    .select("id, code, name, description, bed, size_sqm, max_adults, amenities")
    .eq("tenant_id", tenant.id)
    .eq("property_id", propertyId)
    .order("sort");
  if (error) throw error;
  return data;
});

export const listRatePlans = cache(async (tenant: Tenant): Promise<RatePlan[]> => {
  const { data, error } = await createAnonClient()
    .from("rate_plans")
    .select("id, code, name, description, refundable, includes_breakfast")
    .eq("tenant_id", tenant.id)
    .order("sort");
  if (error) throw error;
  return data;
});

/** Lowest best-available nightly rate per room type over the next 30 days. */
export async function getFromPrices(tenant: Tenant): Promise<Map<string, number>> {
  const [types, plans] = await Promise.all([listRoomTypes(tenant), listRatePlans(tenant)]);
  const bar = plans.find((p) => p.code === "BAR") ?? plans[0];
  const today = hotelToday();
  const { data, error } = await createAnonClient()
    .from("daily_rates")
    .select("room_type_id, amount")
    .eq("tenant_id", tenant.id)
    .eq("rate_plan_id", bar.id)
    .in("room_type_id", types.map((t) => t.id))
    .gte("date", today)
    .lt("date", addDays(today, 30));
  if (error) throw error;
  const min = new Map<string, number>();
  for (const r of data) min.set(r.room_type_id, Math.min(min.get(r.room_type_id) ?? Infinity, Number(r.amount)));
  return min;
}

export type SearchResult = {
  roomType: RoomType;
  available: number;
  plans: { plan: RatePlan; roomTotal: number }[];
};

/** Live availability (the same function the front desk uses) and room totals per rate plan. */
export async function searchStay(tenant: Tenant, search: Search): Promise<SearchResult[]> {
  const propertyId = await getPrimaryPropertyId(tenant);
  const [types, plans, availability, rates] = await Promise.all([
    listRoomTypes(tenant),
    listRatePlans(tenant),
    createAdminClient().rpc("availability", {
      p_tenant: tenant.id,
      p_property: propertyId,
      p_from: search.from,
      p_to: search.to,
    }),
    createAnonClient()
      .from("daily_rates")
      .select("room_type_id, rate_plan_id, amount")
      .eq("tenant_id", tenant.id)
      .gte("date", search.from)
      .lt("date", search.to),
  ]);
  if (availability.error) throw availability.error;
  if (rates.error) throw rates.error;

  const free = new Map((availability.data as { room_type_id: string; available: number }[]).map((a) => [a.room_type_id, a.available]));
  const sums = new Map<string, { total: number; nights: number }>();
  for (const r of rates.data) {
    const key = `${r.room_type_id}:${r.rate_plan_id}`;
    const s = sums.get(key) ?? { total: 0, nights: 0 };
    sums.set(key, { total: s.total + Number(r.amount), nights: s.nights + 1 });
  }

  return types
    .filter((t) => t.max_adults >= search.adults)
    .map((roomType) => ({
      roomType,
      available: free.get(roomType.id) ?? 0,
      plans: plans.flatMap((plan) => {
        const s = sums.get(`${roomType.id}:${plan.id}`);
        // A plan without a rate for every night cannot be sold for these dates.
        return s && s.nights === search.nights ? [{ plan, roomTotal: s.total }] : [];
      }),
    }));
}

/** The authoritative price, from quote_stay() in the database. */
export async function getQuote(
  tenant: Tenant,
  q: { roomType: string; plan: string; from: string; to: string; adults: number; breakfast: boolean },
): Promise<Quote> {
  const { data, error } = await createAdminClient().rpc("quote_stay", {
    p_tenant: tenant.id,
    p_room_type: q.roomType,
    p_rate_plan: q.plan,
    p_from: q.from,
    p_to: q.to,
    p_adults: q.adults,
    p_breakfast: q.breakfast,
  });
  if (error) throw error;
  const quote = data as Quote;
  return {
    ...quote,
    subtotal: Number(quote.subtotal),
    service: Number(quote.service),
    tax: Number(quote.tax),
    total: Number(quote.total),
    lines: quote.lines.map((l) => ({ ...l, amount: Number(l.amount) })),
  };
}

export type SiteContent = { id: string; kind: string; title: string; body: string; data: Record<string, unknown> };

export const getSiteContent = cache(async (tenant: Tenant): Promise<SiteContent[]> => {
  const { data, error } = await createAnonClient()
    .from("site_content")
    .select("id, kind, title, body, data")
    .eq("tenant_id", tenant.id)
    .order("sort");
  if (error) throw error;
  return data as SiteContent[];
});
