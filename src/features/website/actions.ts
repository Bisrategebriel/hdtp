"use server";

import { redirect } from "next/navigation";
import { getPaymentGateway } from "@/adapters/payment";
import { createAdminClient } from "@/server/admin";
import { getTenant, requireFeature } from "@/features/platform/tenant";
import { getPrimaryPropertyId, getQuote } from "./queries";
import { bookingSchema, type BookingInput } from "./schema";

export type BookingState =
  | { status: "error"; message: string }
  | { status: "challenge"; amount: number }
  | { status: "fields"; errors: Record<string, string> };

const RPC_MESSAGES: Record<string, string> = {
  sold_out: "Sorry, that room type has just sold out for these dates. Please choose another room.",
  price_changed: "The price changed while you were booking. Please review the new total.",
  invalid_dates: "Those dates are no longer available. Please search again.",
};

/**
 * Public booking (B3). Order matters: price on the server, charge the mock gateway, and
 * only a captured payment reaches create_booking(), which writes everything in one
 * transaction. A decline returns before anything is written.
 */
export async function bookStay(input: BookingInput): Promise<BookingState> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] ??= issue.message;
    return { status: "fields", errors };
  }
  const b = parsed.data;

  const tenant = await getTenant(b.slug);
  await requireFeature(tenant, "website.booking");
  await requireFeature(tenant, "website.payment");
  const propertyId = await getPrimaryPropertyId(tenant);

  let quote;
  try {
    quote = await getQuote(tenant, { roomType: b.roomType, plan: b.plan, from: b.from, to: b.to, adults: b.adults, breakfast: b.breakfast });
  } catch {
    return { status: "error", message: RPC_MESSAGES.invalid_dates };
  }

  const reference = `${tenant.slug}-${Date.now()}`;
  const charge = await getPaymentGateway().charge({
    token: b.payment.token,
    amount: quote.total,
    currency: tenant.currency,
    reference,
    challengeApproved: b.payment.challengeApproved,
  });
  if (charge.status === "declined") return { status: "error", message: charge.reason };
  if (charge.status === "challenge_required") return { status: "challenge", amount: quote.total };

  const { data, error } = await createAdminClient().rpc("create_booking", {
    p_tenant: tenant.id,
    p_property: propertyId,
    p_room_type: b.roomType,
    p_rate_plan: b.plan,
    p_from: b.from,
    p_to: b.to,
    p_adults: b.adults,
    p_children: 0,
    p_breakfast: b.breakfast,
    p_guest: {
      first_name: b.guest.firstName,
      last_name: b.guest.lastName,
      email: b.guest.email,
      phone: b.guest.phone || null,
      preferences: b.guest.preferences,
    },
    p_payment: { token: b.payment.token, last4: charge.last4, transaction_id: charge.transactionId, amount: quote.total },
  });
  if (error) {
    // The mock charge is not refunded: nothing real was taken.
    return { status: "error", message: RPC_MESSAGES[error.message] ?? "We could not complete the booking. Please try again." };
  }

  const result = data as { code: string; portal_token: string };
  redirect(`/${tenant.slug}/book/confirmation/${result.code}?t=${encodeURIComponent(result.portal_token)}`);
}
