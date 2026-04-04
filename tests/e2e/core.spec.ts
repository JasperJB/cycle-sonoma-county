import { expect, test } from "@playwright/test";

test("public home and explore pages render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /one-stop shop for sonoma county cycling/i })).toBeVisible();
  await page.goto("/explore");
  await expect(page.getByRole("heading", { name: /find rides, routes, clubs, shops and services, and events/i })).toBeVisible();
});

test("development auth can reach the account page", async ({ page }) => {
  await page.goto("/auth/dev-login");
  await page.getByRole("button", { name: /member demo/i }).click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});

test("organizer flow exposes bike rental option for shop organizations", async ({ page }) => {
  test.slow();
  await page.goto("/auth/dev-login");
  await page.getByRole("button", { name: /organizer demo/i }).click();
  await expect(page).toHaveURL(/\/account/);

  await page.goto("/organizer", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: /add your organization updates for the next issue/i }),
  ).toBeVisible();
  await expect(page.getByLabel(/choose an organization/i)).toBeVisible();
  await page.getByRole("button", { name: /create another organization profile/i }).click();
  await page.locator('select[name="organizationType"]').first().selectOption("SHOP");

  await expect(page.getByText("Has bike rental services")).toBeVisible();
});

test("admin console exposes organization verification controls", async ({ page }) => {
  await page.goto("/auth/dev-login");
  await page.getByRole("button", { name: /admin demo/i }).click();
  await expect(page).toHaveURL(/\/account/);

  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: /weekly tailored newsletter/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /organization verification/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /mark verified|remove verified badge/i }).first(),
  ).toBeVisible();
});

test("desktop header navigation remains visible and grouped links open", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop-chromium", "desktop only");

  await page.goto("/");

  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Explore" })).toBeVisible();
  await expect(header.getByRole("button", { name: "Rides" })).toBeVisible();
  await expect(header.getByRole("button", { name: "Shops & Services" })).toBeVisible();
  await expect(page.getByRole("button", { name: /open navigation menu/i })).toBeHidden();

  await header.getByRole("button", { name: "Rides" }).click();
  await expect(page.getByRole("menuitem", { name: "Beginner-friendly rides" })).toBeVisible();
});

test("mobile header drawer exposes grouped navigation and account actions", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile-chromium", "mobile only");

  await page.goto("/auth/dev-login");
  await page.getByRole("button", { name: /member demo/i }).click();
  await expect(page).toHaveURL(/\/account/);

  await page.goto("/");
  await page.getByRole("button", { name: /open navigation menu/i }).click();

  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("heading", { name: /browse cycle sonoma county/i })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Explore" })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Rides" })).toBeVisible();
  await drawer.getByRole("button", { name: "Rides" }).click();
  await expect(drawer.getByRole("link", { name: "Beginner-friendly rides" })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "About / Contact" })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Account" })).toBeVisible();
  await expect(drawer.getByRole("button", { name: /sign out/i })).toBeVisible();
});

test("home quick pathways surface core tasks", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Find a ride" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Find a race" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Rent a bike" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse verified shops" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Plan a route" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Visiting Sonoma? Start here" })).toBeVisible();
});

test("direct-path links land on filtered discovery pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Find a race" }).click();
  await expect(page).toHaveURL(/\/events\?type=RACE/);
  await expect(page.getByRole("heading", { name: /race events/i })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Rent a bike" }).click();
  await expect(page).toHaveURL(/\/shops\?rentals=true/);
  await expect(page.getByRole("heading", { name: /bike rentals/i })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Browse verified shops" }).click();
  await expect(page).toHaveURL(/\/shops\?verified=true/);
  await expect(page.getByRole("heading", { name: /verified shops & services/i })).toBeVisible();

  await page.goto("/rides");
  await page.getByRole("link", { name: "Beginner-friendly" }).click();
  await expect(page).toHaveURL(/\/rides\?beginner=true/);
  await expect(page.getByRole("heading", { name: /beginner-friendly rides/i })).toBeVisible();
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
  await trigger.click({ force: true });

  const drawer = page.locator("#explore-results-sheet");
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
