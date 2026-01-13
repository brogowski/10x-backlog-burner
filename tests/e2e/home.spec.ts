import { expect, test } from "@playwright/test";
import { HomePage } from "./pages/HomePage";

test.describe("Authentication landing", () => {
  test("renders the login card and keeps a reference screenshot", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.expectCardsVisible();
    await expect(page).toHaveScreenshot({ fullPage: true });
  });
});
