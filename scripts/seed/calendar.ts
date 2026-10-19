/**
 * Demand calendar for Addis Ababa hotels (docs/PLAN.md §7, Inventory). All dates are UTC
 * calendar days; "day offset" means days from the seed anchor (0 = today).
 */

export { addDays, hotelToday, isoDay, parseDay } from "../../src/lib/dates";
import { parseDay } from "../../src/lib/dates";

// Base occupancy by month: dry-season conferences and holidays high, the June to August
// rainy season (kiremt) low.
const MONTH_OCCUPANCY = [0.74, 0.8, 0.72, 0.66, 0.62, 0.55, 0.5, 0.52, 0.66, 0.76, 0.78, 0.7];

// Month-day windows with extra demand: Genna, Timket, the AU summit, Enkutatash and Meskel.
const EVENTS: { name: string; from: string; to: string; uplift: number }[] = [
  { name: "Genna", from: "01-05", to: "01-08", uplift: 1.12 },
  { name: "Timket", from: "01-17", to: "01-21", uplift: 1.18 },
  { name: "AU summit", from: "02-08", to: "02-19", uplift: 1.25 },
  { name: "Enkutatash", from: "09-09", to: "09-12", uplift: 1.12 },
  { name: "Meskel", from: "09-25", to: "09-28", uplift: 1.15 },
];

export function eventUplift(iso: string): number {
  const md = iso.slice(5);
  return EVENTS.find((e) => md >= e.from && md <= e.to)?.uplift ?? 1;
}

/** 0 = Sunday. */
export function weekday(iso: string): number {
  return new Date(parseDay(iso)).getUTCDay();
}

export function weekdayFactor(iso: string, kind: "business" | "resort"): number {
  const d = weekday(iso);
  if (kind === "business") return [0.88, 1.08, 1.1, 1.1, 1.06, 0.94, 0.84][d];
  return [1.02, 0.86, 0.86, 0.88, 0.94, 1.18, 1.24][d];
}

export function baseOccupancy(iso: string, kind: "business" | "resort"): number {
  const month = Number(iso.slice(5, 7)) - 1;
  return Math.min(0.96, MONTH_OCCUPANCY[month] * weekdayFactor(iso, kind) * eventUplift(iso));
}

/** Price multiplier: demand drives rate (high season and events cost more). */
export function rateFactor(iso: string, kind: "business" | "resort"): number {
  const month = Number(iso.slice(5, 7)) - 1;
  const season = 0.85 + (MONTH_OCCUPANCY[month] - 0.5) * 0.6;
  const wd = kind === "business" ? (weekdayFactor(iso, kind) > 1 ? 1.04 : 0.96) : weekdayFactor(iso, kind) > 1 ? 1.08 : 0.95;
  return season * wd * (1 + (eventUplift(iso) - 1) * 1.5);
}
