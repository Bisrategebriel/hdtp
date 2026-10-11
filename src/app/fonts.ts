import { Cormorant_Garamond, Fraunces, Geist_Mono, Inter, Manrope, Source_Sans_3 } from "next/font/google";
import type { FONT_PRESETS } from "@/features/platform/theme";

// next/font self-hosts these at build time, so the offline fallback renders them (PLAN §10).
export const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
export const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cormorant" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans" });

export const fontVariables = [inter, geistMono, manrope, cormorant, fraunces, sourceSans]
  .map((f) => f.variable)
  .join(" ");

/** Heading and body font per theme preset, as CSS variables consumed by .tenant-scope. */
export const FONT_PAIRS: Record<(typeof FONT_PRESETS)[number], { heading: string; body: string }> = {
  modern: { heading: "var(--font-manrope)", body: "var(--font-inter)" },
  classic: { heading: "var(--font-cormorant)", body: "var(--font-inter)" },
  editorial: { heading: "var(--font-fraunces)", body: "var(--font-source-sans)" },
};
