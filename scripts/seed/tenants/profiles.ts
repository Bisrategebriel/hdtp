import type { TenantTheme } from "../../../src/features/platform/theme";

export type TenantProfile = {
  slug: string;
  name: string;
  tier: "essential" | "growth" | "premium";
  dataset: "full" | "light";
  currency: string;
  settings: { otaCommissionPct: number; vatPct: number; serviceChargePct: number };
  properties: { name: string; city: string; rooms: number }[];
  theme: TenantTheme;
};

// Fictional hotels (docs/PLAN.md §1.5 item 18).
export const PROFILES: TenantProfile[] = [
  {
    slug: "lakeview",
    name: "Lakeview Suites and Spa",
    tier: "growth",
    dataset: "full",
    currency: "ETB",
    settings: { otaCommissionPct: 17, vatPct: 15, serviceChargePct: 10 },
    properties: [
      { name: "Lakeview Suites and Spa", city: "Addis Ababa", rooms: 180 },
      { name: "Lakeview Garden Residences", city: "Bishoftu", rooms: 30 },
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
      heroImage: "/images/lakeview/hero.jpg",
    },
  },
  {
    slug: "acacia",
    name: "Acacia Court Hotel",
    tier: "essential",
    dataset: "full",
    currency: "ETB",
    settings: { otaCommissionPct: 17, vatPct: 15, serviceChargePct: 10 },
    properties: [{ name: "Acacia Court Hotel", city: "Addis Ababa", rooms: 90 }],
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
      heroImage: "/images/acacia/hero.jpg",
    },
  },
  {
    slug: "highland",
    name: "Highland Grand Resort",
    tier: "premium",
    dataset: "light",
    currency: "ETB",
    settings: { otaCommissionPct: 17, vatPct: 15, serviceChargePct: 10 },
    properties: [{ name: "Highland Grand Resort", city: "Addis Ababa", rooms: 340 }],
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
      heroImage: "/images/highland/hero.jpg",
    },
  },
];
