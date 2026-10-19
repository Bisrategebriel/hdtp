/**
 * Calendar days as ISO strings (YYYY-MM-DD), computed in UTC so they never shift with
 * the server's time zone. Shared by the app and scripts/seed.
 */
const DAY_MS = 86_400_000;

export function parseDay(iso: string): number {
  return Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
}

export function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return isoDay(parseDay(iso) + days * DAY_MS);
}

export function nightsBetween(from: string, to: string): number {
  return Math.round((parseDay(to) - parseDay(from)) / DAY_MS);
}

/** Today in Addis Ababa (UTC+3), matching app.hotel_today() in the database. */
export function hotelToday(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Africa/Addis_Ababa" });
}

/** "Mon 19 Oct" */
export function formatDay(iso: string): string {
  return new Date(parseDay(iso)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
