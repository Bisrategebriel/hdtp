import type { ChargeRequest, ChargeResult, PaymentGateway } from "./index";
import { TEST_CARDS } from "./test-cards";

/** Behaves like a real checkout: success, decline and a 3-D Secure-style challenge. */
export const mockPaymentGateway: PaymentGateway = {
  async charge({ token, reference, challengeApproved }: ChargeRequest): Promise<ChargeResult> {
    const last4 = TEST_CARDS.find((c) => c.token === token)?.last4 ?? "0000";
    switch (token) {
      case "tok_decline":
        return { status: "declined", reason: "The card was declined (test card)." };
      case "tok_3ds":
        if (!challengeApproved) return { status: "challenge_required" };
        return { status: "captured", transactionId: `mock_${reference}`, last4 };
      case "tok_success":
        return { status: "captured", transactionId: `mock_${reference}`, last4 };
    }
  },
};
