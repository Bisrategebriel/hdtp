import type { PaymentToken } from "./index";

/**
 * Publicly documented test numbers. Anything else is rejected in the browser before
 * submit, so a real card number is never transmitted or stored.
 */
export const TEST_CARDS: { number: string; token: PaymentToken; label: string; last4: string }[] = [
  { number: "4242424242424242", token: "tok_success", label: "Approved", last4: "4242" },
  { number: "4000000000000002", token: "tok_decline", label: "Declined", last4: "0002" },
  { number: "4000000000003220", token: "tok_3ds", label: "Approved after challenge", last4: "3220" },
];

export function tokenForTestCard(input: string): PaymentToken | null {
  const digits = input.replace(/\D/g, "");
  return TEST_CARDS.find((c) => c.number === digits)?.token ?? null;
}
