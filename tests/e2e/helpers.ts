import { expect, type Page } from "@playwright/test";

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
