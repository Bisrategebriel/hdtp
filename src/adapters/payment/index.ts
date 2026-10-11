import { mockPaymentGateway } from "./mock";

/**
 * Card numbers never reach the server (CLAUDE.md, hard rules). The browser checks the
 * number against TEST_CARDS and sends only the matching token.
 */
export type PaymentToken = "tok_success" | "tok_decline" | "tok_3ds";

export type ChargeRequest = {
  token: PaymentToken;
  amount: number;
  currency: string;
  reference: string;
  /** Set after the 3-D Secure-style challenge has been approved in the browser. */
  challengeApproved?: boolean;
};

export type ChargeResult =
  | { status: "captured"; transactionId: string; last4: string }
  | { status: "declined"; reason: string }
  | { status: "challenge_required" };

export interface PaymentGateway {
  charge(request: ChargeRequest): Promise<ChargeResult>;
}

/** The only implementation; a real gateway would be selected here by environment. */
export function getPaymentGateway(): PaymentGateway {
  return mockPaymentGateway;
}
