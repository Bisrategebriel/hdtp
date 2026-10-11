import { createHash } from "node:crypto";

/** Deterministic UUID (v5-style layout) from a stable name, so reseeds keep the same ids. */
export function stableId(name: string): string {
  const h = createHash("sha1").update(`hdtp:${name}`).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
