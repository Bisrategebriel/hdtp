import { Rng } from "@/lib/rng";

export type SampleKind = "table" | "bar" | "line" | "kanban" | "timeline" | "form";

/** Default visual per phase until the catalog row sets sample_kind (Day 12). */
export function defaultSampleKind(phase: number): SampleKind {
  if (phase === 6) return "bar";
  if (phase === 5) return "line";
  if (phase === 7) return "kanban";
  return "table";
}

const STAFF = ["Hana", "Dawit", "Selam", "Yonas", "Meron", "Abel", "Liya", "Kidus", "Saron", "Bereket", "Tigist", "Nahom"];
const STATUSES = ["Open", "In progress", "Done", "Awaiting approval"];

const TABLE_PRESETS: Record<number, { columns: string[]; row: (r: Rng, i: number) => string[] }> = {
  0: {
    columns: ["Event", "Actor", "When", "Result"],
    row: (r, i) => [r.pick(["Sign-in", "Role change", "Export", "Setting updated"]), r.pick(STAFF), `${i + 1}h ago`, r.pick(["Allowed", "Allowed", "Blocked"])],
  },
  1: {
    columns: ["Item", "Owner", "Status", "Score"],
    row: (r) => [r.pick(["Booking engine", "PMS", "Wi-Fi", "Website", "POS", "Email"]), r.pick(STAFF), r.pick(STATUSES), `${r.int(35, 92)}/100`],
  },
  2: {
    columns: ["Page", "Visitors", "Conversion", "Status"],
    row: (r) => [r.pick(["Home", "Rooms", "Offers", "Events", "Gallery", "Contact"]), r.int(300, 4200).toLocaleString("en"), `${(r.next() * 4 + 0.5).toFixed(1)}%`, r.pick(["Published", "Draft"])],
  },
  3: {
    columns: ["Reference", "Department", "Assigned to", "Status", "Amount (ETB)"],
    row: (r, i) => [`#${1040 + i}`, r.pick(["Front office", "Housekeeping", "Restaurant", "Finance", "HR"]), r.pick(STAFF), r.pick(STATUSES), r.int(800, 48000).toLocaleString("en")],
  },
  4: {
    columns: ["Guest", "Room", "Request", "Status"],
    row: (r) => [`Guest ${r.int(100, 999)}`, `${r.int(1, 6)}${String(r.int(1, 30)).padStart(2, "0")}`, r.pick(["Late checkout", "Spa slot", "Airport pickup", "Extra towels", "Dinner table"]), r.pick(STATUSES)],
  },
  5: {
    columns: ["Segment", "Signal", "Confidence", "Suggested action"],
    row: (r) => [r.pick(["Business", "Diaspora", "Leisure", "Groups"]), r.pick(["Rising demand", "Price sensitivity", "Repeat intent"]), `${r.int(60, 94)}%`, r.pick(["Offer upgrade", "Send spa bundle", "Hold rate"])],
  },
  6: {
    columns: ["Metric", "This month", "Last month", "Variance"],
    row: (r) => {
      const a = r.int(40, 95);
      const b = r.int(40, 95);
      return [r.pick(["Occupancy", "Direct share", "CSAT", "F&B covers"]), `${a}`, `${b}`, `${a - b > 0 ? "+" : ""}${a - b}`];
    },
  },
  7: {
    columns: ["Ticket", "Priority", "Owner", "Status"],
    row: (r, i) => [`T-${2200 + i}`, r.pick(["P1", "P2", "P3", "P4"]), r.pick(STAFF), r.pick(STATUSES)],
  },
};

export type ConceptSample =
  | { kind: "table"; columns: string[]; rows: string[][] }
  | { kind: "bar" | "line"; points: { label: string; value: number }[] }
  | { kind: "kanban"; columns: { title: string; cards: string[] }[] }
  | { kind: "timeline"; items: { when: string; text: string }[] }
  | { kind: "form"; fields: string[] };

/** Deterministic sample data for a concept screen: same tenant and feature, same rows. */
export function conceptSample(key: string, tenantSlug: string, phase: number, kind: SampleKind): ConceptSample {
  const r = new Rng(20261025).fork(`${tenantSlug}:${key}`);
  switch (kind) {
    case "table": {
      const preset = TABLE_PRESETS[phase] ?? TABLE_PRESETS[3];
      return { kind, columns: preset.columns, rows: Array.from({ length: 10 }, (_, i) => preset.row(r, i)) };
    }
    case "bar":
    case "line": {
      const months = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
      let v = r.int(40, 60);
      return {
        kind,
        points: months.map((label) => ({ label, value: (v = Math.max(5, Math.min(100, v + r.int(-8, 10)))) })),
      };
    }
    case "kanban":
      return {
        kind,
        columns: ["Requested", "In progress", "Done"].map((title) => ({
          title,
          cards: Array.from({ length: r.int(2, 4) }, () =>
            r.pick(["Add spa packages to portal", "Automate night audit", "Group booking form", "Staff app offline mode", "Loyalty tier review", "Menu photo refresh"]),
          ),
        })),
      };
    case "timeline":
      return {
        kind,
        items: Array.from({ length: 6 }, (_, i) => ({
          when: `Month ${i * 4}`,
          text: r.pick(["Kick-off", "Configuration", "Staff training", "Go-live", "Review", "Optimisation"]),
        })),
      };
    case "form":
      return { kind, fields: ["Name", "Department", "Priority", "Details"] };
  }
}
