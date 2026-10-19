import { expect, test, type Page } from "@playwright/test";
import { adminDb, tenantId } from "./helpers";

// B3: booking engine and mock payment (docs/PLAN.md §8.1). Storyline S1 to S3.
test.describe("booking (B3)", () => {
  test.describe.configure({ mode: "serial" });
  let lakeview: string;

  test.beforeAll(async () => {
    lakeview = await tenantId("lakeview");
  });

  test.afterAll(async () => {
    // Remove the demo bookings this spec created.
    await adminDb().rpc("demo_reset", { p_tenant: lakeview });
  });

  const demoReservations = async () => {
    const { count, error } = await adminDb()
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", lakeview)
      .eq("origin", "demo");
    if (error) throw error;
    return count ?? 0;
  };

  /** Home -> Book now -> tonight, 2 nights, 2 adults -> Deluxe King, BAR -> breakfast -> guest. */
  async function startBooking(page: Page) {
    await page.goto("/lakeview");
    await expect(page.getByTestId("site-hero-title")).toHaveText("Lakeview Suites and Spa");
    // Seeded content renders (a mis-encoded jsonb column once showed "undefined" and "NaN").
    await expect(page.locator("main")).not.toContainText(/undefined|NaN/);
    await page.getByTestId("book-now").click();
    await page.waitForURL("**/lakeview/book");

    const from = await page.locator("#from").inputValue();
    const to = new Date(`${from}T00:00:00Z`);
    to.setUTCDate(to.getUTCDate() + 2);
    await page.locator("#to").fill(to.toISOString().slice(0, 10));
    await page.locator("#adults").selectOption("2");
    await page.getByRole("button", { name: "Check availability" }).click();
    await expect(page.getByTestId("search-summary")).toContainText("2 nights");

    await page.getByTestId("plan-DK-BAR").getByRole("link", { name: "Select" }).click();
    await page.waitForURL("**/book/details**");
    const before = await page.getByTestId("quote-total").textContent();
    await page.getByTestId("extra-breakfast").check();
    await expect(page.getByTestId("quote-total")).not.toHaveText(before ?? "");

    await page.locator("#firstName").fill("Hana");
    await page.locator("#lastName").fill("Bekele");
    await page.locator("#email").fill("hana.bekele@example.com");
    await page.getByLabel("High floor").check();
    return (await page.getByTestId("quote-total").textContent())!.trim();
  }

  test("a non-test card is rejected in the browser and never reaches the server", async ({ page }) => {
    await startBooking(page);
    const actionCalls: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.headers()["next-action"]) actionCalls.push(r.url());
    });
    await page.getByTestId("test-card-input").fill("5555 5555 5555 4444");
    await page.getByTestId("pay-button").click();
    await expect(page.getByText("Test mode: use one of the test card numbers")).toBeVisible();
    expect(actionCalls).toHaveLength(0);
  });

  test("a declined card shows an error and creates nothing", async ({ page }) => {
    const before = await demoReservations();
    await startBooking(page);
    await page.getByTestId("test-card-input").fill("4000 0000 0000 0002");
    await page.getByTestId("pay-button").click();
    await expect(page.getByTestId("booking-error")).toContainText("declined");
    expect(await demoReservations()).toBe(before);
  });

  test("the 3DS card challenges, then books a direct reservation with folio and payment", async ({ page }) => {
    const shownTotal = await startBooking(page);
    const tm = page.getByTestId("test-mode-banner");
    await expect(tm).toContainText("TEST MODE");
    // No cc-* autocomplete anywhere on the payment form (hard rule).
    expect(await page.locator('[autocomplete^="cc-"]').count()).toBe(0);

    await page.getByTestId("test-card-input").fill("4000 0000 0000 3220");
    await page.getByTestId("pay-button").click();
    await expect(page.getByTestId("challenge-dialog")).toBeVisible();
    await page.getByTestId("challenge-approve").click();

    await page.waitForURL("**/book/confirmation/**");
    const code = (await page.getByTestId("confirmation-code").textContent())!.trim();
    expect(code).toMatch(/^LV-[0-9A-F]{6}$/);
    await expect(page.getByText(shownTotal)).toBeVisible();

    const db = adminDb();
    const { data: res, error } = await db
      .from("reservations")
      .select("id, channel, status, total, guest:guests(first_name, preferences), folios(id, folio_items(amount), payments(amount, token, test_card_last4))")
      .eq("tenant_id", lakeview)
      .eq("code", code)
      .single();
    if (error) throw error;
    expect(res.channel).toBe("direct");
    expect(res.status).toBe("confirmed");
    const folio = (res.folios as unknown as { folio_items: { amount: number }[]; payments: { amount: number; token: string; test_card_last4: string }[] }[])[0];
    const charged = folio.folio_items.reduce((s, i) => s + Number(i.amount), 0);
    expect(charged).toBeCloseTo(Number(res.total), 2);
    expect(folio.payments).toEqual([{ amount: Number(res.total), token: "tok_3ds", test_card_last4: "3220" }]);
    expect(`ETB ${Number(res.total).toLocaleString("en-US", { maximumFractionDigits: 2 })}`).toBe(shownTotal);

    const { count } = await db.from("outbox").select("id", { count: "exact", head: true }).eq("reference", res.id);
    expect(count).toBe(1);

    // The portal link from the confirmation opens the guest's stay.
    await page.getByTestId("portal-link").click();
    await expect(page.getByTestId("guest-portal")).toContainText("Welcome, Hana");
  });

  test("works at phone width (390 px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await startBooking(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.getByTestId("pay-button")).toBeVisible();
  });
});
