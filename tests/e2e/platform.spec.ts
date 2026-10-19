import { expect, test } from "@playwright/test";
import { consoleControl, navItem, openAsPersona, SEEDED_TIER, setTier, tenantPrimary } from "./helpers";

// B1: tenant, tier and theme switching, plus personas (docs/PLAN.md §8.1).
test.describe("platform (B1)", () => {
  test.afterEach(async ({ page }) => {
    // Leave the shared demo state as seeded, even after a failure.
    if (await consoleControl(page, "Tier").isVisible().catch(() => false)) {
      await setTier(page, SEEDED_TIER.lakeview).catch(() => {});
    }
  });

  test("hotel switcher re-themes the page", async ({ page }) => {
    await openAsPersona(page, "lakeview");
    const lakeview = await tenantPrimary(page);

    await consoleControl(page, "Hotel").selectOption("acacia");
    await page.waitForURL("**/acacia/app**");
    await expect.poll(() => tenantPrimary(page)).not.toBe(lakeview);
  });

  test("tier flip locks and unlocks a module in under 1 second", async ({ page }) => {
    await openAsPersona(page, "lakeview");
    const workflow = navItem(page, "hms.workflow_builder");

    await setTier(page, "essential");
    await expect(workflow).toHaveAttribute("data-locked", "true");

    const started = Date.now();
    await setTier(page, "premium");
    await expect(workflow).toHaveAttribute("data-locked", "false");
    expect(Date.now() - started, "unlock latency (ms)").toBeLessThan(1000);
  });

  test("locked module shows an upgrade prompt naming the tier", async ({ page }) => {
    await openAsPersona(page, "lakeview");
    await page.goto("/lakeview/app/concept/hms.workflow_builder");
    const locked = page.getByTestId("feature-locked");
    await expect(locked).toBeVisible();
    await expect(locked).toContainText("Premium");
  });

  test("persona switch lands on the persona's home in under 2 seconds", async ({ page }) => {
    await openAsPersona(page, "lakeview");
    const started = Date.now();
    await consoleControl(page, "Persona").selectOption("front_desk");
    await page.waitForURL("**/lakeview/app/concept/hms.fo.reservations");
    expect(Date.now() - started, "persona switch latency (ms)").toBeLessThan(2000);
    await expect(consoleControl(page, "Persona")).toHaveValue("front_desk");
  });

  test("staff of one hotel cannot open another hotel's console", async ({ page }) => {
    await openAsPersona(page, "lakeview");
    const response = await page.goto("/acacia/app");
    expect(response?.status()).toBe(403);
  });

  test("unknown hotel slug is a 404", async ({ page }) => {
    const response = await page.goto("/no-such-hotel");
    expect(response?.status()).toBe(404);
  });
});
