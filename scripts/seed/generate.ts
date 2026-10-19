/**
 * Pure, deterministic seed generator (docs/PLAN.md §7). No I/O: the same (profile, seed,
 * anchor) always returns byte-identical rows, which tests/unit/seed.test.ts checks.
 * index.ts writes the rows.
 */
import { Rng } from "./rng";
import { stableId } from "./ids";
import { addDays, baseOccupancy, rateFactor } from "./calendar";
import { pickWeighted, randomGuestName, randomPreferences } from "./names";
import type { PropertySpec, TenantProfile } from "./tenants/profiles";

type Row = Record<string, string | number | boolean | null | string[] | Record<string, unknown>>;

export type SeedRows = {
  properties: Row[];
  room_types: Row[];
  rooms: Row[];
  rate_plans: Row[];
  daily_rates: Row[];
  site_content: Row[];
  guests: Row[];
  reservations: Row[];
  reservation_rooms: Row[];
  folios: Row[];
  folio_items: Row[];
  payments: Row[];
  hk_tasks: Row[];
};

/** Insert order respects foreign keys. */
export const TABLE_ORDER: (keyof SeedRows)[] = [
  "properties", "room_types", "rooms", "rate_plans", "daily_rates", "site_content",
  "guests", "reservations", "reservation_rooms", "folios", "folio_items", "payments", "hk_tasks",
];

const RATE_PLANS = [
  { code: "BAR", name: "Best available rate", factor: 1, refundable: true, breakfast: false, description: "Flexible: free cancellation until 24 hours before arrival." },
  { code: "NRF", name: "Non-refundable saver", factor: 0.9, refundable: false, breakfast: false, description: "Pay now and save 10%. No changes or refunds." },
  { code: "CORP", name: "Corporate", factor: 0.88, refundable: true, breakfast: false, description: "For partner companies. Flexible cancellation." },
  { code: "PKG", name: "Bed and breakfast", factor: 1.12, refundable: true, breakfast: true, description: "Breakfast for every guest, every morning." },
] as const;
type PlanCode = (typeof RATE_PLANS)[number]["code"];

const OTA_SOURCES = ["TravelNest", "StayFinder", "GlobeRooms"]; // fictional agencies
const LOS: [number, number][] = [[1, 0.3], [2, 0.3], [3, 0.2], [4, 0.1], [5, 0.05], [6, 0.03], [7, 0.02]];
const AVG_LOS = 2.4;
const FNB_OUTLETS = ["Restaurant", "Bar", "Room service", "Coffee lounge"];
const REVIEW_LINES = [
  "Spotless rooms and the friendliest front desk we have met.",
  "Breakfast was excellent and the coffee ceremony was a highlight.",
  "Quiet, comfortable and close to everything we needed.",
  "Booked direct on the website in two minutes. Check-in was quick.",
  "Great value for the location. We will be back.",
  "The spa was the perfect end to a long working week.",
  "Helpful staff who arranged our airport transfer at short notice.",
  "Lovely views and a very comfortable bed.",
];

const round2 = (n: number) => Math.round(n * 100) / 100;
const round50 = (n: number) => Math.round(n / 50) * 50;
const pad = (n: number) => String(n).padStart(2, "0");

export type GenerateOptions = { seed: number; anchor: string };

export function generateTenant(tenantId: string, p: TenantProfile, { seed, anchor }: GenerateOptions): SeedRows {
  const rows: SeedRows = {
    properties: [], room_types: [], rooms: [], rate_plans: [], daily_rates: [], site_content: [],
    guests: [], reservations: [], reservation_rooms: [], folios: [], folio_items: [], payments: [], hk_tasks: [],
  };
  const root = new Rng(seed).fork(p.slug);
  const back = p.dataset === "full" ? 365 : p.dataset === "light" ? 90 : 0;
  const forward = p.dataset === "full" ? 120 : p.dataset === "light" ? 30 : 0;
  const rateFrom = -Math.max(back + 10, 30);
  const rateTo = 180;

  // Rate plans (tenant-wide).
  const planIds = {} as Record<PlanCode, string>;
  RATE_PLANS.forEach((rp, i) => {
    planIds[rp.code] = stableId(`${p.slug}:plan:${rp.code}`);
    rows.rate_plans.push({
      id: planIds[rp.code], tenant_id: tenantId, code: rp.code, name: rp.name, description: rp.description,
      refundable: rp.refundable, includes_breakfast: rp.breakfast, sort: i, origin: "seed",
    });
  });

  // Inventory and daily rates, per property.
  const rate = new Map<string, number>(); // `${typeId}:${plan}:${date}` -> amount
  const inventory = p.properties.map((prop, pi) => {
    const propertyId = stableId(`property:${p.slug}:${pi}`);
    rows.properties.push({ id: propertyId, tenant_id: tenantId, name: prop.name, city: prop.city, is_primary: pi === 0, origin: "seed" });
    const typeIds: Record<string, string> = {};
    prop.roomTypes.forEach((rt, i) => {
      typeIds[rt.code] = stableId(`${p.slug}:type:${pi}:${rt.code}`);
      rows.room_types.push({
        id: typeIds[rt.code], tenant_id: tenantId, property_id: propertyId, code: rt.code, name: rt.name,
        description: rt.description, bed: rt.bed, size_sqm: rt.sizeSqm, max_adults: rt.maxAdults,
        base_rate: rt.baseRate, amenities: rt.amenities, image: null, sort: i, origin: "seed",
      });
      for (let d = rateFrom; d <= rateTo; d++) {
        const date = addDays(anchor, d);
        for (const rp of RATE_PLANS) {
          const amount = round50(rt.baseRate * rateFactor(date, p.kind) * rp.factor);
          rate.set(`${typeIds[rt.code]}:${rp.code}:${date}`, amount);
          rows.daily_rates.push({
            id: stableId(`${p.slug}:rate:${typeIds[rt.code]}:${rp.code}:${date}`), tenant_id: tenantId,
            room_type_id: typeIds[rt.code], rate_plan_id: planIds[rp.code], date, amount, origin: "seed",
          });
        }
      }
    });
    const rooms = buildRooms(prop).map((r) => ({ ...r, id: stableId(`${p.slug}:room:${pi}:${r.number}`), typeId: typeIds[r.code] }));
    return { propertyId, prop, typeIds, rooms };
  });

  seedContent(rows, tenantId, p, root.fork("content"));

  if (p.dataset !== "none") {
    const tx = new Transactions(rows, tenantId, p, anchor, back, forward, rate, planIds, root);
    inventory.forEach((inv, pi) => tx.property(inv, pi === 0 && p.dataset === "full"));
  }

  // Rooms last: their status depends on who is in house tonight.
  const roomOf = roomByReservation(rows);
  const occupied = new Set(rows.reservations.filter((r) => r.status === "in_house").map((r) => roomOf.get(r.id as string)));
  const status = root.fork("room-status");
  for (const inv of inventory) {
    for (const room of inv.rooms) {
      rows.rooms.push({
        id: room.id, tenant_id: tenantId, property_id: inv.propertyId, room_type_id: room.typeId,
        number: room.number, floor: room.floor,
        status: occupied.has(room.id) ? "occupied" : pickWeighted(status, [["inspected", 0.7], ["clean", 0.25], ["dirty", 0.05]]),
        origin: "seed",
      });
    }
  }
  return rows;
}

function roomByReservation(rows: SeedRows) {
  return new Map(rows.reservation_rooms.map((rr) => [rr.reservation_id as string, rr.room_id as string | null]));
}

function buildRooms(prop: PropertySpec) {
  const rooms: { number: string; floor: number; code: string }[] = [];
  for (let floor = 1; floor <= prop.floors; floor++) {
    for (let pos = 1; pos <= prop.roomsPerFloor; pos++) {
      const code = prop.layout.find(([, from, to]) => pos >= from && pos <= to)?.[0];
      if (!code) throw new Error(`${prop.name}: no room type for position ${pos}`);
      rooms.push({ number: `${floor}${pad(pos)}`, floor, code });
    }
  }
  return rooms;
}

function seedContent(rows: SeedRows, tenantId: string, p: TenantProfile, rng: Rng) {
  let n = 0;
  const add = (kind: string, title: string, body: string, data: Record<string, unknown>) =>
    rows.site_content.push({
      id: stableId(`${p.slug}:content:${n}`), tenant_id: tenantId, kind, title, body, image: null,
      data, published: true, sort: n++, origin: "seed",
    });
  for (const o of p.content.offers) add("offer", o.title, o.body, { price: o.price, badge: o.badge });
  for (const h of p.content.highlights) add("page", h.title, h.body, { section: "highlight" });
  for (let i = 0; i < 6; i++) {
    const { firstName, lastName, nationality } = randomGuestName(rng);
    add("review", REVIEW_LINES[(i * 3 + rng.int(0, 7)) % REVIEW_LINES.length], "", {
      author: `${firstName} ${lastName[0]}.`, country: nationality, rating: rng.chance(0.75) ? 5 : 4,
    });
  }
}

type RoomSlot = { id: string; number: string; floor: number; code: string; typeId: string };
type Inventory = { propertyId: string; prop: PropertySpec; typeIds: Record<string, string>; rooms: RoomSlot[] };
type Channel = "direct" | "ota" | "walk_in";
type Status = "confirmed" | "in_house" | "checked_out" | "cancelled" | "no_show";

/** Reservations, folios, payments and hk_tasks for one tenant. */
class Transactions {
  private resCount = 0;
  private guestPool: string[] = [];
  private occupancy = new Map<string, Uint8Array>();
  private offset: number;

  constructor(
    private rows: SeedRows,
    private tenantId: string,
    private p: TenantProfile,
    private anchor: string,
    private back: number,
    private forward: number,
    private rate: Map<string, number>,
    private planIds: Record<PlanCode, string>,
    private root: Rng,
  ) {
    this.offset = back + 20;
  }

  property(inv: Inventory, fixtures: boolean) {
    const len = this.offset + this.forward + 20;
    for (const r of inv.rooms) this.occupancy.set(r.id, new Uint8Array(len));
    const room = (n: string) => inv.rooms.find((r) => r.number === n)!;
    const rng = this.root.fork(`reservations:${inv.propertyId}`);

    if (fixtures) {
      // Storyline (PLAN §7): 512 is occupied the last two nights and departs today;
      // 509 to 513 stay free from tonight so Deluxe King has rooms to sell and assign.
      this.mark(room("512"), -2, 0);
      for (const n of ["509", "510", "511", "512", "513"]) this.mark(room(n), 0, 4, 2);
    }

    const typeWeights = Object.entries(inv.typeIds).map(
      ([code]) => [code, inv.rooms.filter((r) => r.code === code).length] as [string, number],
    );

    for (let a = -(this.back + 10); a <= this.forward; a++) {
      const date = addDays(this.anchor, a);
      const target = (inv.rooms.length * baseOccupancy(date, this.p.kind)) / AVG_LOS / 0.88;
      const arrivals = Math.max(0, Math.round(target * rng.normal(1, 0.08)));
      for (let i = 0; i < arrivals; i++) {
        const los = pickWeighted(rng, LOS);
        const d = a + los;
        const channel = pickWeighted<Channel>(rng, [["ota", 0.6], ["direct", 0.28], ["walk_in", 0.12]]);
        const lead = channel === "walk_in" ? 0 : Math.min(channel === "ota" ? 120 : 90, Math.floor(-Math.log(1 - rng.next()) * (channel === "ota" ? 21 : 14)));
        const status = this.statusFor(rng, a, d);
        // Fixture days at the main property are written by hand below.
        if (fixtures && (a === 0 || d === 0)) continue;
        if (a - lead > 0) continue; // not booked yet
        if (channel === "walk_in" && a >= 0) continue;
        const occupying = status !== "cancelled" && status !== "no_show";
        const code = pickWeighted(rng, typeWeights);
        const slot = occupying ? this.findRoom(rng, inv, code, a, d) : inv.rooms.find((r) => r.code === code)!;
        if (!slot) continue;
        if (occupying) this.mark(slot, a, d);
        this.reservation(rng, inv, slot, { a, d, channel, lead, status });
      }
    }

    if (fixtures) {
      const fx = this.root.fork("fixtures");
      // Room 512: direct phone booking, open folio of 2 nights plus minibar.
      this.reservation(fx, inv, room("512"), { a: -2, d: 0, channel: "direct", lead: 6, status: "in_house", plan: "BAR", source: "phone", minibar: true, prepaid: false });
      // 8 more departures today (9 in total).
      for (let i = 0, guard = 0; i < 8 && guard < 500; guard++) {
        const los = fx.int(1, 4);
        const code = pickWeighted(fx, typeWeights.filter(([c]) => c !== "DK"));
        const slot = this.findRoom(fx, inv, code, -los, 0);
        if (!slot) continue;
        this.mark(slot, -los, 0);
        this.reservation(fx, inv, slot, { a: -los, d: 0, channel: pickWeighted<Channel>(fx, [["ota", 0.6], ["direct", 0.4]]), lead: fx.int(2, 30), status: "in_house" });
        i++;
      }
      // 12 arrivals today, rooms assigned at check-in (Block 3).
      for (let i = 0, guard = 0; i < 12 && guard < 500; guard++) {
        const los = fx.int(1, 4);
        const code = pickWeighted(fx, typeWeights);
        const slot = this.findRoom(fx, inv, code, 0, los, (r) => !["509", "510", "511", "512", "513"].includes(r.number));
        if (!slot) continue;
        this.mark(slot, 0, los);
        this.reservation(fx, inv, slot, { a: 0, d: los, channel: pickWeighted<Channel>(fx, [["ota", 0.55], ["direct", 0.45]]), lead: fx.int(1, 40), status: "confirmed" });
        i++;
      }
    }

    this.housekeeping(inv);
  }

  private statusFor(rng: Rng, a: number, d: number): Status {
    if (d < 0) return pickWeighted<Status>(rng, [["checked_out", 0.89], ["cancelled", 0.08], ["no_show", 0.03]]);
    if (a < 0) return "in_house";
    return rng.chance(0.05) ? "cancelled" : "confirmed";
  }

  /** value 1 = booked, 2 = held for the storyline (never given to random bookings). */
  private mark(slot: RoomSlot, from: number, to: number, value = 1) {
    const cal = this.occupancy.get(slot.id)!;
    for (let n = from; n < to; n++) cal[n + this.offset] = value;
  }

  private isFree(slot: RoomSlot, from: number, to: number) {
    const cal = this.occupancy.get(slot.id)!;
    for (let n = from; n < to; n++) if (cal[n + this.offset]) return false;
    return true;
  }

  private findRoom(rng: Rng, inv: Inventory, code: string, from: number, to: number, ok: (r: RoomSlot) => boolean = () => true) {
    const candidates = inv.rooms.filter((r) => r.code === code && ok(r));
    const start = rng.int(0, candidates.length - 1);
    for (let i = 0; i < candidates.length; i++) {
      const slot = candidates[(start + i) % candidates.length];
      if (this.isFree(slot, from, to)) return slot;
    }
    return null;
  }

  private guest(rng: Rng, allowRepeat: boolean): string {
    if (allowRepeat && this.guestPool.length > 50 && rng.chance(0.18)) return rng.pick(this.guestPool);
    const { firstName, lastName, nationality } = randomGuestName(rng);
    const id = stableId(`${this.p.slug}:guest:${this.rows.guests.length}`);
    const n = this.rows.guests.length;
    this.rows.guests.push({
      id, tenant_id: this.tenantId, first_name: firstName, last_name: lastName,
      email: `${firstName}.${lastName}.${n}@example.com`.toLowerCase(),
      phone: nationality === "Ethiopia" ? `+2519${String(10000000 + ((n * 7919) % 89999999)).slice(0, 8)}` : null,
      nationality, preferences: randomPreferences(rng), origin: "seed",
    });
    this.guestPool.push(id);
    return id;
  }

  private reservation(
    rng: Rng,
    inv: Inventory,
    slot: RoomSlot,
    o: { a: number; d: number; channel: Channel; lead: number; status: Status; plan?: PlanCode; source?: string; minibar?: boolean; prepaid?: boolean },
  ) {
    const n = this.resCount++;
    const id = stableId(`${this.p.slug}:res:${n}`);
    const checkIn = addDays(this.anchor, o.a);
    const checkOut = addDays(this.anchor, o.d);
    const plan: PlanCode = o.plan ?? (o.channel === "ota" ? pickWeighted(rng, [["BAR", 0.7], ["NRF", 0.3]]) : o.channel === "walk_in" ? "BAR" : pickWeighted(rng, [["BAR", 0.5], ["NRF", 0.25], ["PKG", 0.15], ["CORP", 0.1]]));
    const source = o.source ?? (o.channel === "ota" ? rng.pick(OTA_SOURCES) : o.channel === "walk_in" ? "front_desk" : pickWeighted(rng, [["website", 0.55], ["phone", 0.25], ["email", 0.15], ["chatbot", 0.05]]));
    const adults = slot.code === "TW" || rng.chance(0.55) ? 2 : 1;
    const bookedDay = addDays(this.anchor, o.a - o.lead);
    const bookedAt = `${bookedDay}T${pad(rng.int(4, 18))}:${pad(rng.int(0, 59))}:00Z`;
    const guestId = this.guest(rng, o.a < 0);
    const s = this.p.settings;

    // Booking value, as quote_stay() would compute it.
    const nights = Array.from({ length: o.d - o.a }, (_, i) => addDays(this.anchor, o.a + i));
    const nightRates = nights.map((date) => this.rate.get(`${slot.typeId}:${plan}:${date}`) ?? slot_rate_missing(date));
    const breakfast = plan !== "PKG" && rng.chance(0.4);
    const roomValue = nightRates.reduce((x, y) => x + y, 0);
    const breakfastValue = breakfast ? s.breakfastPrice * adults * nights.length : 0;
    const service = round2((roomValue + breakfastValue) * s.serviceChargePct / 100);
    const tax = round2((roomValue + breakfastValue + service) * s.vatPct / 100);
    const total = round2(roomValue + breakfastValue + service + tax);

    this.rows.reservations.push({
      id, tenant_id: this.tenantId, property_id: inv.propertyId, guest_id: guestId, rate_plan_id: this.planIds[plan],
      code: `${s.codePrefix}-S${String(n + 1).padStart(5, "0")}`, channel: o.channel, source, status: o.status,
      check_in: checkIn, check_out: checkOut, adults, children: rng.chance(0.08) ? 1 : 0, total,
      commission: o.channel === "ota" ? round2(roomValue * s.otaCommissionPct / 100) : 0,
      currency: this.p.currency, online_checkin_at: null, portal_token_hash: null, booked_at: bookedAt, origin: "seed",
    });
    const stays = o.status === "checked_out" || o.status === "in_house";
    this.rows.reservation_rooms.push({
      id: stableId(`${this.p.slug}:rr:${n}`), tenant_id: this.tenantId, reservation_id: id,
      room_type_id: slot.typeId, room_id: stays ? slot.id : null, origin: "seed",
    });
    if (o.status === "cancelled" || o.status === "no_show") return;

    // Folio. Website bookings are prepaid in full at booking (as create_booking does);
    // everything else posts nightly and settles at check-out.
    const prepaid = o.prepaid ?? (o.channel === "direct" && source === "website");
    const folioId = stableId(`${this.p.slug}:folio:${n}`);
    const settled = o.status === "checked_out";
    this.rows.folios.push({
      id: folioId, tenant_id: this.tenantId, reservation_id: id, status: settled ? "settled" : "open",
      settled_at: settled ? `${checkOut}T08:00:00Z` : null, origin: "seed",
    });
    let item = 0;
    const post = (category: string, description: string, amount: number, postedOn: string) => {
      this.rows.folio_items.push({
        id: stableId(`${this.p.slug}:fi:${n}:${item++}`), tenant_id: this.tenantId, folio_id: folioId,
        category, description, amount: round2(amount), posted_on: postedOn, origin: "seed",
      });
      return round2(amount);
    };
    const planName = RATE_PLANS.find((r) => r.code === plan)!.name;
    const postNight = (i: number) => (settled || prepaid ? true : nights[i] < this.anchor);
    let sum = 0;
    nights.forEach((date, i) => {
      if (!postNight(i)) return;
      sum += post("room", `Room night, ${planName}`, nightRates[i], date);
      if (breakfast) sum += post("extra", `Breakfast, ${adults} adult${adults > 1 ? "s" : ""}`, s.breakfastPrice * adults, date);
      const stayed = settled || date < this.anchor;
      if (stayed && rng.chance(0.45)) sum += post("fnb", rng.pick(FNB_OUTLETS), round50(rng.int(300, 3500)), date);
    });
    if (settled && this.p.slug === "lakeview" && rng.chance(0.15)) {
      sum += post("spa", "Spa treatment", round50(rng.int(1500, 4500)), nights[Math.floor(nights.length / 2)]);
    }
    if (o.minibar || (settled && rng.chance(0.2))) {
      sum += post("fnb", "Minibar", round50(rng.int(200, 900)), nights[nights.length - 1]);
    }
    // Service and VAT are posted when the folio is final: at check-out or for prepaid stays.
    if (settled || prepaid) {
      const svc = post("service", "Service charge", (sum * s.serviceChargePct) / 100, checkIn);
      const vat = post("tax", "VAT", ((sum + svc) * s.vatPct) / 100, checkIn);
      sum = round2(sum + svc + vat);
    }

    if (settled || prepaid) {
      const method = prepaid ? "card" : o.channel === "ota" ? "ota" : pickWeighted(rng, o.channel === "walk_in" ? [["cash", 0.5], ["card", 0.3], ["mobile_wallet", 0.2]] : [["card", 0.6], ["mobile_wallet", 0.25], ["cash", 0.15]]);
      this.rows.payments.push({
        id: stableId(`${this.p.slug}:pay:${n}`), tenant_id: this.tenantId, folio_id: folioId, method, amount: sum,
        token: method === "card" ? "tok_success" : null, test_card_last4: method === "card" ? "4242" : null,
        transaction_id: method === "card" ? `seed_${n + 1}` : null,
        paid_at: prepaid ? bookedAt : `${checkOut}T08:00:00Z`, origin: "seed",
      });
    }
  }

  /** Departure cleans for the last 14 days, and today's stayovers. */
  private housekeeping(inv: Inventory) {
    const ids = new Set(inv.rooms.map((r) => r.id));
    const today = this.anchor;
    const from = addDays(today, -14);
    let k = this.rows.hk_tasks.length;
    const roomOf = roomByReservation(this.rows);
    for (const r of this.rows.reservations) {
      if (r.property_id !== inv.propertyId) continue;
      const roomId = roomOf.get(r.id as string);
      if (!roomId || !ids.has(roomId)) continue;
      const out = r.check_out as string;
      if (r.status === "checked_out" && out >= from && out < today) {
        this.rows.hk_tasks.push({
          id: stableId(`${this.p.slug}:hk:${k++}`), tenant_id: this.tenantId, room_id: roomId, reservation_id: r.id,
          kind: "departure", status: "inspected", due_on: out, assigned_to: null,
          started_at: `${out}T08:30:00Z`, cleaned_at: `${out}T09:10:00Z`, inspected_at: `${out}T09:40:00Z`, origin: "seed",
        });
      } else if (r.status === "in_house" && out > today) {
        this.rows.hk_tasks.push({
          id: stableId(`${this.p.slug}:hk:${k++}`), tenant_id: this.tenantId, room_id: roomId, reservation_id: r.id,
          kind: "stayover", status: "pending", due_on: today, assigned_to: null,
          started_at: null, cleaned_at: null, inspected_at: null, origin: "seed",
        });
      }
    }
  }
}

function slot_rate_missing(date: string): never {
  throw new Error(`No daily rate for ${date}: widen the rate calendar in generateTenant()`);
}
