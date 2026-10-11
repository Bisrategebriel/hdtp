import type { FeatureKey } from "@/config/feature-keys";
import { routeFor } from "./routes";

export type PersonaRole =
  | "gm"
  | "front_desk"
  | "housekeeping"
  | "fnb"
  | "finance"
  | "hr"
  | "marketing"
  | "flint_support";

type Persona = {
  role: PersonaRole;
  label: string;
  /** Where the persona switcher lands. */
  home: (slug: string) => string;
};

const featureHome = (key: FeatureKey) => (slug: string) => routeFor(slug, key);

/** Seeded one per tenant by scripts/seed (Flint Support is one user with access to every tenant). */
export const PERSONAS: Persona[] = [
  { role: "gm", label: "General Manager", home: (slug) => `/${slug}/app` },
  { role: "front_desk", label: "Front Desk", home: featureHome("hms.fo.reservations") },
  { role: "housekeeping", label: "Housekeeping", home: featureHome("hms.hk.room_status") },
  { role: "fnb", label: "Food and Beverage", home: featureHome("hms.fnb.pos") },
  { role: "finance", label: "Finance", home: featureHome("hms.finance.revenue") },
  { role: "hr", label: "Human Resources", home: featureHome("hms.hr.staff") },
  { role: "marketing", label: "Marketing", home: featureHome("hms.crm.loyalty") },
  { role: "flint_support", label: "Flint Support", home: featureHome("support.helpdesk") },
];

export const FLINT_SUPPORT_EMAIL = "support@flint.demo";

export function personaEmail(role: PersonaRole, slug: string): string {
  return role === "flint_support" ? FLINT_SUPPORT_EMAIL : `${role.replace("_", "-")}@${slug}.demo`;
}
