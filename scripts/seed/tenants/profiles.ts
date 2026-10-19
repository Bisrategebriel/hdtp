import type { TenantTheme } from "../../../src/features/platform/theme";

export type RoomTypeSpec = {
  code: string;
  name: string;
  bed: string;
  sizeSqm: number;
  maxAdults: number;
  baseRate: number;
  amenities: string[];
  description: string;
};

export type PropertySpec = {
  name: string;
  city: string;
  floors: number;
  roomsPerFloor: number;
  /** Room type by position on each floor, 1-based and inclusive: [code, from, to]. */
  layout: [code: string, from: number, to: number][];
  roomTypes: RoomTypeSpec[];
};

export type TenantProfile = {
  slug: string;
  name: string;
  tier: "essential" | "growth" | "premium";
  /** full: 365 days back, 120 forward. light: 90 back, 30 forward. none: inventory and content only. */
  dataset: "full" | "light" | "none";
  /** Business hotels fill Mon-Thu; resorts fill weekends. */
  kind: "business" | "resort";
  currency: string;
  settings: {
    otaCommissionPct: number;
    vatPct: number;
    serviceChargePct: number;
    breakfastPrice: number;
    codePrefix: string;
  };
  properties: PropertySpec[];
  theme: TenantTheme;
  content: {
    offers: { title: string; body: string; price: number; badge: string }[];
    highlights: { title: string; body: string }[];
  };
};

const AMENITIES = ["Free Wi-Fi", "Air conditioning", "Smart TV", "Rain shower", "Work desk", "Minibar"];

// Fictional hotels (docs/PLAN.md §1.5 item 18). Rates are illustrative placeholders in ETB (A6).
// Block 2 cut line 1 applies: only Lakeview has transactional history; Acacia and Highland
// get inventory, rates and site content so their websites and booking still work.
export const PROFILES: TenantProfile[] = [
  {
    slug: "lakeview",
    name: "Lakeview Suites and Spa",
    tier: "growth",
    dataset: "full",
    kind: "business",
    currency: "ETB",
    settings: { otaCommissionPct: 17, vatPct: 15, serviceChargePct: 10, breakfastPrice: 650, codePrefix: "LV" },
    properties: [
      {
        name: "Lakeview Suites and Spa",
        city: "Addis Ababa",
        floors: 9,
        roomsPerFloor: 20,
        // Room 512 is position 12 on floor 5: a Deluxe King (storyline fixture).
        layout: [["SQ", 1, 8], ["DK", 9, 14], ["TW", 15, 17], ["JS", 18, 19], ["ES", 20, 20]],
        roomTypes: [
          { code: "SQ", name: "Standard Queen", bed: "Queen", sizeSqm: 26, maxAdults: 2, baseRate: 6800, amenities: AMENITIES.slice(0, 4), description: "A calm, well-lit room with a queen bed and a city view." },
          { code: "DK", name: "Deluxe King", bed: "King", sizeSqm: 32, maxAdults: 2, baseRate: 8200, amenities: AMENITIES, description: "Our most booked room: king bed, work desk and a rain shower." },
          { code: "TW", name: "Superior Twin", bed: "2 Twin", sizeSqm: 30, maxAdults: 2, baseRate: 7400, amenities: AMENITIES.slice(0, 5), description: "Two twin beds, ideal for colleagues travelling together." },
          { code: "JS", name: "Junior Suite", bed: "King", sizeSqm: 46, maxAdults: 3, baseRate: 12500, amenities: [...AMENITIES, "Lounge area"], description: "A separate lounge, a king bed and spa access included." },
          { code: "ES", name: "Executive Suite", bed: "King", sizeSqm: 68, maxAdults: 3, baseRate: 18500, amenities: [...AMENITIES, "Lounge area", "Butler service"], description: "Corner suite with a dining area and panoramic views." },
        ],
      },
      {
        name: "Lakeview Garden Residences",
        city: "Bishoftu",
        floors: 2,
        roomsPerFloor: 15,
        layout: [["GR", 1, 11], ["LV", 12, 15]],
        roomTypes: [
          { code: "GR", name: "Garden Room", bed: "Queen", sizeSqm: 28, maxAdults: 2, baseRate: 5900, amenities: AMENITIES.slice(0, 4), description: "Opens onto the garden, a short walk from the crater lake." },
          { code: "LV", name: "Lake Villa", bed: "King", sizeSqm: 55, maxAdults: 4, baseRate: 11000, amenities: [...AMENITIES, "Private terrace"], description: "A villa with a private terrace facing the lake." },
        ],
      },
    ],
    theme: {
      fontPreset: "editorial",
      colors: {
        primary: "#0f4c5c",
        primaryForeground: "#ffffff",
        accent: "#e0a458",
        background: "#f7f5f0",
        foreground: "#1d2b2f",
        muted: "#e6ece9",
      },
      logoText: "Lakeview",
      tagline: "Suites, spa and calm in the heart of the city",
      heroImage: "",
    },
    content: {
      offers: [
        { title: "Weekend spa escape", body: "Two nights, breakfast and a 60-minute massage for two.", price: 24500, badge: "Popular" },
        { title: "Book direct and save", body: "The best rate is always here: 10% off and free late check-out.", price: 7400, badge: "Direct only" },
        { title: "Business traveller", body: "Airport transfer, breakfast and meeting-room credit.", price: 9800, badge: "Corporate" },
      ],
      highlights: [
        { title: "Spa and wellness", body: "Steam, sauna and treatments from 07:00 to 22:00." },
        { title: "Five minutes from Bole", body: "Easy access to the airport and the city's business district." },
        { title: "All-day dining", body: "Ethiopian and international menus, with coffee ceremony daily." },
      ],
    },
  },
  {
    slug: "acacia",
    name: "Acacia Court Hotel",
    tier: "essential",
    dataset: "none",
    kind: "business",
    currency: "ETB",
    settings: { otaCommissionPct: 17, vatPct: 15, serviceChargePct: 10, breakfastPrice: 450, codePrefix: "AC" },
    properties: [
      {
        name: "Acacia Court Hotel",
        city: "Addis Ababa",
        floors: 6,
        roomsPerFloor: 15,
        layout: [["ST", 1, 9], ["SU", 10, 13], ["FA", 14, 15]],
        roomTypes: [
          { code: "ST", name: "Standard Room", bed: "Queen", sizeSqm: 22, maxAdults: 2, baseRate: 4200, amenities: AMENITIES.slice(0, 3), description: "Comfortable and quiet, everything you need for a city stay." },
          { code: "SU", name: "Superior Room", bed: "King", sizeSqm: 27, maxAdults: 2, baseRate: 5200, amenities: AMENITIES.slice(0, 5), description: "More space, a king bed and a work desk." },
          { code: "FA", name: "Family Room", bed: "King + 2 Twin", sizeSqm: 38, maxAdults: 4, baseRate: 6800, amenities: AMENITIES.slice(0, 4), description: "Room for the whole family, with two extra beds." },
        ],
      },
    ],
    theme: {
      fontPreset: "modern",
      colors: {
        primary: "#9a3412",
        primaryForeground: "#ffffff",
        accent: "#65a30d",
        background: "#fffaf5",
        foreground: "#292524",
        muted: "#f5ebe0",
      },
      logoText: "Acacia Court",
      tagline: "A warm city base for business and family stays",
      heroImage: "",
    },
    content: {
      offers: [
        { title: "Family weekend", body: "Family room, breakfast for four and a late check-out.", price: 8900, badge: "Families" },
        { title: "Stay three, pay two", body: "Book three nights and the third is on us.", price: 8400, badge: "Long stay" },
      ],
      highlights: [
        { title: "Central location", body: "Walking distance to shops, cafes and offices." },
        { title: "Rooftop terrace", body: "Coffee, light meals and evening views over the city." },
        { title: "Friendly service", body: "A small team that remembers your name." },
      ],
    },
  },
  {
    slug: "highland",
    name: "Highland Grand Resort",
    tier: "premium",
    dataset: "none",
    kind: "resort",
    currency: "ETB",
    settings: { otaCommissionPct: 17, vatPct: 15, serviceChargePct: 10, breakfastPrice: 800, codePrefix: "HG" },
    properties: [
      {
        name: "Highland Grand Resort",
        city: "Addis Ababa",
        floors: 10,
        roomsPerFloor: 34,
        layout: [["CL", 1, 20], ["DM", 21, 28], ["FA", 29, 31], ["SU", 32, 34]],
        roomTypes: [
          { code: "CL", name: "Classic Room", bed: "King", sizeSqm: 30, maxAdults: 2, baseRate: 9000, amenities: AMENITIES, description: "Classic resort comfort with garden or pool views." },
          { code: "DM", name: "Deluxe Mountain View", bed: "King", sizeSqm: 36, maxAdults: 2, baseRate: 11500, amenities: [...AMENITIES, "Balcony"], description: "A private balcony facing the Entoto hills." },
          { code: "FA", name: "Family Room", bed: "King + 2 Twin", sizeSqm: 45, maxAdults: 4, baseRate: 13500, amenities: AMENITIES, description: "Two connected spaces for families." },
          { code: "SU", name: "Grand Suite", bed: "King", sizeSqm: 80, maxAdults: 3, baseRate: 22000, amenities: [...AMENITIES, "Lounge area", "Butler service"], description: "Our signature suite, with a lounge and butler service." },
        ],
      },
    ],
    theme: {
      fontPreset: "classic",
      colors: {
        primary: "#14532d",
        primaryForeground: "#fefce8",
        accent: "#ca8a04",
        background: "#fbfaf6",
        foreground: "#1c1917",
        muted: "#ecefe7",
      },
      logoText: "Highland Grand",
      tagline: "Resort living, group events and mountain air",
      heroImage: "",
    },
    content: {
      offers: [
        { title: "Conference package", body: "Meeting rooms, lunch and coffee breaks for groups of 20 or more.", price: 15500, badge: "Groups" },
        { title: "Mountain weekend", body: "Two nights with breakfast, a guided hike and dinner.", price: 31000, badge: "Weekend" },
      ],
      highlights: [
        { title: "Events for 800", body: "A ballroom, eight meeting rooms and garden venues." },
        { title: "Heated pool", body: "Indoor and outdoor pools with mountain views." },
        { title: "Four restaurants", body: "From Ethiopian classics to an Italian grill." },
      ],
    },
  },
];
