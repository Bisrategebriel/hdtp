import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/** Service-role client for assertions on database state (never used by the app code path). */
export function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (E2E_ENV file).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function tenantId(slug: string): Promise<string> {
  const { data, error } = await adminDb().from("tenants").select("id").eq("slug", slug).single();
  if (error) throw error;
  return data.id;
}

export const TENANTS = ["lakeview", "acacia", "highland"] as const;

/** Seeded tiers (scripts/seed/tenants/profiles.ts). Specs that flip a tier restore it. */
export const SEEDED_TIER = { lakeview: "growth", acacia: "essential", highland: "premium" } as const;

export async function loginPresenter(page: Page) {
  const password = process.env.DEMO_PRESENTER_PASSWORD;
  if (!password) throw new Error("DEMO_PRESENTER_PASSWORD is not set (.env.local or the CI environment).");
  await page.goto("/login");
  await page.fill("#password", password);
  await page.keyboard.press("Enter");
  await page.waitForURL("**/demo");
}

/** Presenter login, then sign in as a persona from the demo launcher. */
export async function openAsPersona(page: Page, slug: string, persona = "General Manager") {
  await loginPresenter(page);
  await page.getByTestId(`launcher-${slug}`).getByRole("button", { name: persona }).click();
  await page.waitForURL(`**/${slug}/app**`);
}

export function consoleControl(page: Page, label: "Hotel" | "Tier" | "Program month" | "Persona") {
  // exact: the nav's "Locked in this tier" icons also match a loose "Tier" label.
  return page.getByTestId("flint-console-bar").getByLabel(label, { exact: true });
}

export async function setTier(page: Page, tier: string) {
  const select = consoleControl(page, "Tier");
  await select.selectOption(tier);
  await expect(select).toHaveValue(tier);
}

export function navItem(page: Page, featureKey: string) {
  return page.locator(`nav[aria-label="Modules"] a[data-feature="${featureKey}"]`);
}

export function tenantPrimary(page: Page) {
  return page
    .locator(".tenant-scope")
    .first()
    .evaluate((el) => getComputedStyle(el).getPropertyValue("--primary").trim());
}
