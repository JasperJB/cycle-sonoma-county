import { expect, test } from "@playwright/test";

test("public home and explore pages render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /rides, routes, bike-friendly businesses/i })).toBeVisible();
  await page.goto("/explore");
  await expect(page.getByRole("heading", { name: /find friends, rides, routes, clubs, businesses, and events/i })).toBeVisible();
});

test("development auth can reach the account page", async ({ page }) => {
  await page.goto("/auth/dev-login");
  await page.getByRole("button", { name: /member demo/i }).click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});

test("desktop header navigation remains visible", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop-chromium", "desktop only");

  await page.goto("/");

  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Explore" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Routes" })).toBeVisible();
  await expect(page.getByRole("button", { name: /open navigation menu/i })).toBeHidden();
});

test("mobile header drawer exposes navigation and account actions", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile-chromium", "mobile only");

  await page.goto("/auth/dev-login");
  await page.getByRole("button", { name: /member demo/i }).click();
  await expect(page).toHaveURL(/\/account/);

  await page.goto("/");
  await page.getByRole("button", { name: /open navigation menu/i }).click();

  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("heading", { name: /browse cycle sonoma county/i })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Explore" })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Account" })).toBeVisible();
  await expect(drawer.getByRole("button", { name: /sign out/i })).toBeVisible();
});

test("explore filters preserve query params and keep the map available", async ({ page }) => {
  await page.goto("/explore");
  await page.selectOption('select[name="dataset"]', "routes");
  await page.getByRole("button", { name: /update map/i }).click();

  await expect(page).toHaveURL(/dataset=routes/);
  await expect(page.getByTestId("explore-map")).toBeVisible();
});

test("mobile explore drawer stays in sync with map selection", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile-chromium", "mobile only");

  await page.goto("/explore");
  await page.selectOption('select[name="dataset"]', "routes");
  await page.getByRole("button", { name: /update map/i }).click();
  await expect(page).toHaveURL(/dataset=routes/);

  const trigger = page.getByTestId("explore-results-trigger");
  await expect(trigger).toBeVisible();
  await trigger.click();

  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("heading", { name: "Results" })).toBeVisible();

  const resultCards = drawer.locator("[data-explore-id]");
  await expect(resultCards.nth(1)).toBeVisible();

  const secondTitle = await resultCards.nth(1).locator("h3").innerText();
  const secondId = await resultCards.nth(1).getAttribute("data-explore-id");
  await resultCards.nth(1).locator('button[aria-pressed]').click();
  await expect(drawer.locator('button[aria-pressed="true"]').locator("h3")).toContainText(secondTitle);

  await drawer.getByRole("button", { name: "Close" }).click();
  await expect(trigger).toContainText(secondTitle);

  await page.locator(`[data-marker-id="${secondId}"]`).first().click({ force: true });
  await trigger.click();
  await expect(drawer.locator('button[aria-pressed="true"]').locator("h3")).toContainText(secondTitle);
});
