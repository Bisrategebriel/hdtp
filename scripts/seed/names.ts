import type { Rng } from "./rng";

/**
 * Guest names are a random first name plus a random father's or family name, so no real
 * person is depicted (docs/PLAN.md §1.5 item 18).
 */
const ETHIOPIAN_FIRST = [
  "Abebe", "Almaz", "Alemu", "Bethlehem", "Biniam", "Dawit", "Eden", "Elias", "Feven", "Genet",
  "Hanna", "Haile", "Kalkidan", "Kidus", "Liya", "Meron", "Mekdes", "Naod", "Rahel", "Samuel",
  "Selam", "Sara", "Tewodros", "Tigist", "Yared", "Yonas", "Zewdu", "Ruth", "Henok", "Mahlet",
];
const ETHIOPIAN_FATHER = [
  "Abate", "Alemayehu", "Assefa", "Bekele", "Desta", "Gebre", "Girma", "Hailu", "Kebede", "Lemma",
  "Mekonnen", "Mengistu", "Negash", "Tadesse", "Tefera", "Tesfaye", "Wolde", "Worku", "Yilma", "Zerihun",
];
const INTERNATIONAL_FIRST = [
  "Amina", "Daniel", "Grace", "James", "Li", "Maria", "Mohammed", "Nadia", "Olivia", "Omar",
  "Priya", "Sophie", "Thomas", "Wei", "Yusuf", "Anna", "Carlos", "Fatima", "Lucas", "Mei",
];
const INTERNATIONAL_LAST = [
  "Adeyemi", "Chen", "Dubois", "Fischer", "Garcia", "Hassan", "Kamau", "Kumar", "Li", "Martin",
  "Mensah", "Moreau", "Mwangi", "Okafor", "Rossi", "Schmidt", "Smith", "Wang", "Wilson", "Zhang",
];

// Domestic, diaspora, regional and international guests.
const NATIONALITIES: [string, number][] = [
  ["Ethiopia", 0.52], ["United States", 0.08], ["Kenya", 0.06], ["China", 0.06], ["United Kingdom", 0.05],
  ["Germany", 0.04], ["India", 0.04], ["Nigeria", 0.04], ["United Arab Emirates", 0.04], ["Djibouti", 0.03],
  ["France", 0.02], ["Italy", 0.02],
];

const PREFERENCES = ["high floor", "quiet room", "near elevator", "late check-in", "extra pillows", "airport transfer"];

export function pickWeighted<T>(rng: Rng, items: readonly [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = rng.next() * total;
  for (const [item, w] of items) {
    x -= w;
    if (x < 0) return item;
  }
  return items[items.length - 1][0];
}

export function randomGuestName(rng: Rng): { firstName: string; lastName: string; nationality: string } {
  const nationality = pickWeighted(rng, NATIONALITIES);
  // Diaspora guests from the US and UK often carry Ethiopian names.
  const ethiopianName = nationality === "Ethiopia" || ((nationality === "United States" || nationality === "United Kingdom") && rng.chance(0.5));
  return ethiopianName
    ? { firstName: rng.pick(ETHIOPIAN_FIRST), lastName: rng.pick(ETHIOPIAN_FATHER), nationality }
    : { firstName: rng.pick(INTERNATIONAL_FIRST), lastName: rng.pick(INTERNATIONAL_LAST), nationality };
}

export function randomPreferences(rng: Rng): string[] {
  if (!rng.chance(0.3)) return [];
  return [rng.pick(PREFERENCES)];
}
