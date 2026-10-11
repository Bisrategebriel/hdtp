import { mockDigitalKey } from "./mock";

export type DigitalKeyGrant = { keyId: string; room: string; validFrom: string; validUntil: string };

export interface DigitalKey {
  issue(input: { reservationId: string; room: string; checkIn: string; checkOut: string }): Promise<DigitalKeyGrant>;
}

/** No lock hardware is integrated; the mock returns a key for the animated portal screen. */
export function getDigitalKey(): DigitalKey {
  return mockDigitalKey;
}
