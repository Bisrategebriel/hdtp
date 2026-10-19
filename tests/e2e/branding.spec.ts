import { expect, test } from "@playwright/test";
import { flintBrand } from "../../src/config/flint-brand";
import { loginPresenter, openAsPersona, TENANTS } from "./helpers";

// B2: Flint branding layer (docs/PLAN.md §8.1).
// Surfaces: site and console now; the guest portal (/[tenant]/stay/[token]) joins in Block 5.
test.describe("branding (B2)", () => {
  for (const slug of TENANTS) {
    test(`${slug}: site shows the Flint footer and no console bar without the cookie`, async ({ page }) => {
      await page.goto(`/${slug}`);
      await expect(page.getByTestId("flint-powered-by")).toHaveText(flintBrand.poweredBy);
      await expect(page.getByTestId("flint-console-bar")).toHaveCount(0);
    });

    test(`${slug}: presenter sees the console bar and footer on site and console`, async ({ page }) => {
      await openAsPersona(page, slug);
      for (const path of [`/${slug}/app`, `/${slug}`]) {
        await page.goto(path);
        await expect(page.getByTestId("flint-console-bar")).toBeVisible();
        await expect(page.getByTestId("flint-powered-by")).toHaveText(flintBrand.poweredBy);
      }
    });
  }

  test("tenant theme never changes the Flint console bar", async ({ page }) => {
    await loginPresenter(page);
    const barColor = async (slug: string) => {
      await page.goto(`/${slug}`);
      return page.getByTestId("flint-console-bar").evaluate((el) => getComputedStyle(el).backgroundColor);
    };
    const colors = new Set([await barColor("lakeview"), await barColor("acacia"), await barColor("highland")]);
    expect(colors.size).toBe(1);
  });

  test.fixme("guest portal shows the Flint footer", async () => {
    // Enable when /[tenant]/stay/[token] exists (TASKS.md Block 5).
  });
});
