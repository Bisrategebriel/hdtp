/** HDTP phases as named in the blueprint; phase 0 is the cross-cutting platform core. */
export const PHASES: Record<number, { name: string; short: string }> = {
  0: { name: "Platform core", short: "Platform" },
  1: { name: "Digital assessment and strategy", short: "Assessment" },
  2: { name: "Website modernization", short: "Website" },
  3: { name: "Hotel operations digitization", short: "Operations" },
  4: { name: "Guest experience enhancement", short: "Guest experience" },
  5: { name: "Artificial intelligence", short: "AI" },
  6: { name: "Business intelligence", short: "BI" },
  7: { name: "Continuous innovation and support", short: "Support" },
};
