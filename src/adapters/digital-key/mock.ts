import type { DigitalKey } from "./index";

export const mockDigitalKey: DigitalKey = {
  async issue({ reservationId, room, checkIn, checkOut }) {
    return { keyId: `key_${reservationId.slice(0, 8)}_${room}`, room, validFrom: checkIn, validUntil: checkOut };
  },
};
