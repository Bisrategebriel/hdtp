import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateTenant } from "../../scripts/seed/generate";
import { PROFILES } from "../../scripts/seed/tenants/profiles";

const anchor = "2026-10-19";
const lakeview = PROFILES.find((p) => p.slug === "lakeview")!;
const tenantId = "00000000-0000-0000-0000-000000000001";
const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");

describe("seed generator", () => {
  const rows = generateTenant(tenantId, lakeview, { seed: 20261025, anchor });
  const main = rows.properties.find((p) => p.is_primary)!.id;
  const res = rows.reservations.filter((r) => r.property_id === main);
  const roomOf = new Map(rows.reservation_rooms.map((rr) => [rr.reservation_id, rr]));

  it("is byte-identical for the same seed and anchor", () => {
    expect(hash(generateTenant(tenantId, lakeview, { seed: 20261025, anchor }))).toBe(hash(rows));
  });

  it("changes with the seed", () => {
    expect(hash(generateTenant(tenantId, lakeview, { seed: 1, anchor }).reservations)).not.toBe(hash(rows.reservations));
  });

  it("writes the storyline fixtures (PLAN §7)", () => {
    expect(res.filter((r) => r.check_in === anchor && r.status === "confirmed")).toHaveLength(12);
    expect(res.filter((r) => r.check_out === anchor && r.status === "in_house")).toHaveLength(9);

    const room512 = rows.rooms.find((r) => r.property_id === main && r.number === "512")!;
    const deluxeKing = rows.room_types.find((t) => t.property_id === main && t.code === "DK")!;
    expect(room512.room_type_id).toBe(deluxeKing.id);
    expect(room512.floor).toBe(5);
    const departing = res.find((r) => roomOf.get(r.id as string)?.room_id === room512.id && r.check_out === anchor)!;
    expect(departing.status).toBe("in_house");

    // Open folio: 2 room nights plus minibar, nothing paid yet.
    const folio = rows.folios.find((f) => f.reservation_id === departing.id)!;
    const items = rows.folio_items.filter((i) => i.folio_id === folio.id);
    expect(folio.status).toBe("open");
    expect(items.filter((i) => i.category === "room")).toHaveLength(2);
    expect(items.some((i) => i.description === "Minibar")).toBe(true);
    expect(rows.payments.some((p) => p.folio_id === folio.id)).toBe(false);
  });

  it("leaves at least 3 Deluxe King rooms free tonight", () => {
    const deluxeKing = rows.room_types.find((t) => t.property_id === main && t.code === "DK")!;
    const total = rows.rooms.filter((r) => r.room_type_id === deluxeKing.id).length;
    const booked = res.filter(
      (r) =>
        (r.status === "confirmed" || r.status === "in_house") &&
        (r.check_in as string) <= anchor &&
        (r.check_out as string) > anchor &&
        roomOf.get(r.id as string)?.room_type_id === deluxeKing.id,
    ).length;
    expect(total - booked).toBeGreaterThanOrEqual(3);
  });

  it("never double-books a room on the same night", () => {
    const nights = new Set<string>();
    for (const r of rows.reservations) {
      const roomId = roomOf.get(r.id as string)?.room_id;
      if (!roomId) continue;
      for (let d = new Date(`${r.check_in}T00:00:00Z`); d < new Date(`${r.check_out}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
        const key = `${roomId}:${d.toISOString().slice(0, 10)}`;
        expect(nights.has(key), key).toBe(false);
        nights.add(key);
      }
    }
  });

  it("matches the before-HDTP channel mix (OTA 55 to 65%)", () => {
    const booked = res.filter((r) => r.status !== "cancelled");
    const share = (c: string) => booked.filter((r) => r.channel === c).length / booked.length;
    expect(share("ota")).toBeGreaterThan(0.55);
    expect(share("ota")).toBeLessThan(0.65);
    expect(share("direct")).toBeGreaterThan(0.25);
  });

  it("settles every checked-out folio to a zero balance", () => {
    const paid = new Map<unknown, number>();
    for (const p of rows.payments) paid.set(p.folio_id, (paid.get(p.folio_id) ?? 0) + (p.amount as number));
    const charged = new Map<unknown, number>();
    for (const i of rows.folio_items) charged.set(i.folio_id, (charged.get(i.folio_id) ?? 0) + (i.amount as number));
    for (const f of rows.folios.filter((f) => f.status === "settled")) {
      expect(Math.abs((charged.get(f.id) ?? 0) - (paid.get(f.id) ?? 0))).toBeLessThan(0.05);
    }
  });
});
