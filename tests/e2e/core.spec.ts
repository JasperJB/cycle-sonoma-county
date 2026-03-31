import { expect, test } from "@playwright/test";

test("public home and explore pages render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /rides, routes, shops/i })).toBeVisible();
  await page.goto("/explore");
  await expect(page.getByRole("heading", { name: /map-first discovery/i })).toBeVisible();
});

test("development auth can reach the account page", async ({ page }) => {
  await page.goto("/auth/dev-login");
  await page.getByRole("button", { name: /member demo/i }).click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});
