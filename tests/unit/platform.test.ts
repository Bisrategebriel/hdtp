import { describe, expect, it } from "vitest";
import { Rng } from "@/lib/rng";
import { tierAllows } from "@/config/tiers";
import { tokenForTestCard } from "@/adapters/payment/test-cards";
import { mockPaymentGateway } from "@/adapters/payment/mock";
import { mockAIProvider } from "@/adapters/ai/mock";
import { conceptSample } from "@/features/concept/concept-data";
import { FEATURE_KEYS } from "@/config/feature-keys";
import { loadCatalog } from "../../scripts/seed/catalog";

describe("Rng", () => {
  it("is deterministic for the same seed and stream", () => {
    const a = new Rng(42).fork("reservations");
    const b = new Rng(42).fork("reservations");
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()));
  });

  it("gives independent streams per fork name", () => {
    expect(new Rng(42).fork("a").next()).not.toEqual(new Rng(42).fork("b").next());
  });
});

describe("tiers", () => {
  it("unlocks lower-tier features in higher tiers only", () => {
    expect(tierAllows("premium", "growth")).toBe(true);
    expect(tierAllows("essential", "growth")).toBe(false);
  });
});

describe("feature catalog", () => {
  const catalog = loadCatalog();

  it("has 91 unique features matching the generated keys", () => {
    expect(catalog).toHaveLength(91);
    expect(new Set(catalog.map((r) => r.feature_key)).size).toBe(91);
    expect([...FEATURE_KEYS].sort()).toEqual(catalog.map((r) => r.feature_key).sort());
  });

  it("puts Essential's core four modules (Front Office, Housekeeping, Restaurant, Finance) in Essential", () => {
    const tier = (k: string) => catalog.find((r) => r.feature_key === k)?.min_tier;
    for (const k of ["hms.fo.reservations", "hms.hk.room_status", "hms.fnb.pos", "hms.finance.revenue"]) {
      expect(tier(k)).toBe("essential");
    }
    expect(tier("hms.hr.staff")).toBe("growth");
    expect(tier("hms.workflow_builder")).toBe("premium");
  });
});

describe("mock payment gateway", () => {
  it("accepts only the documented test numbers", () => {
    expect(tokenForTestCard("4242 4242 4242 4242")).toBe("tok_success");
    expect(tokenForTestCard("5555 5555 5555 4444")).toBeNull();
  });

  it("declines, challenges and captures by token", async () => {
    const base = { amount: 100, currency: "ETB", reference: "LV-1" };
    expect((await mockPaymentGateway.charge({ ...base, token: "tok_decline" })).status).toBe("declined");
    expect((await mockPaymentGateway.charge({ ...base, token: "tok_3ds" })).status).toBe("challenge_required");
    expect((await mockPaymentGateway.charge({ ...base, token: "tok_3ds", challengeApproved: true })).status).toBe("captured");
  });
});

describe("mock AI provider", () => {
  const kb = [{ intent: "breakfast", keywords: ["breakfast"], answer: "Breakfast is served 06:30 to 10:30." }];

  it("answers known intents and hands spa requests to staff", async () => {
    const r = await mockAIProvider.reply("What time is breakfast?", kb);
    expect(r.intent).toBe("breakfast");
    expect((await mockAIProvider.reply("Can you book a massage tomorrow?", kb)).handoff).toBe("staff");
  });
});

describe("concept sample data", () => {
  it("is stable for the same tenant and feature", () => {
    expect(conceptSample("hms.hr.payroll", "lakeview", 3, "table")).toEqual(
      conceptSample("hms.hr.payroll", "lakeview", 3, "table"),
    );
  });
});
