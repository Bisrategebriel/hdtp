import { z } from "zod";
import { addDays, hotelToday, nightsBetween } from "@/lib/dates";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Search form (?from&to&adults). Bad or missing values fall back to tonight, 1 night, 2 adults. */
export function parseSearch(params: Record<string, string | string[] | undefined>) {
  const today = hotelToday();
  const raw = z
    .object({
      from: isoDate.catch(today),
      to: isoDate.optional().catch(undefined),
      adults: z.coerce.number().int().min(1).max(4).catch(2),
    })
    .parse({ from: params.from, to: params.to, adults: params.adults });
  const from = raw.from < today ? today : raw.from;
  let to = raw.to && raw.to > from ? raw.to : addDays(from, 1);
  if (nightsBetween(from, to) > 14) to = addDays(from, 14);
  return { from, to, adults: raw.adults, nights: nightsBetween(from, to) };
}

export type Search = ReturnType<typeof parseSearch>;

/** The room and rate the guest picked on the results page. */
export const selectionSchema = z.object({
  roomType: z.uuid(),
  plan: z.uuid(),
  breakfast: z.enum(["0", "1"]).catch("0"),
});

export const guestSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name").max(60),
  lastName: z.string().trim().min(1, "Enter a last name").max(60),
  email: z.email("Enter a valid email").max(120),
  phone: z.string().trim().max(30).optional().default(""),
  preferences: z.array(z.enum(["high floor", "quiet room", "late check-in", "airport transfer"])).max(4).default([]),
});

/**
 * What the browser sends to the booking action. Note what is absent: the card number.
 * The browser maps a test card to a token and sends only that (CLAUDE.md hard rules).
 */
export const bookingSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  roomType: z.uuid(),
  plan: z.uuid(),
  from: isoDate,
  to: isoDate,
  adults: z.number().int().min(1).max(4),
  breakfast: z.boolean(),
  guest: guestSchema,
  payment: z.object({
    token: z.enum(["tok_success", "tok_decline", "tok_3ds"]),
    challengeApproved: z.boolean().default(false),
  }),
});

export type BookingInput = z.input<typeof bookingSchema>;
