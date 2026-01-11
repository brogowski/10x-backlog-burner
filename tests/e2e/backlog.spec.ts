import { expect, test } from "@playwright/test"

import { BacklogPage } from "./pages/BacklogPage"
import { HomePage } from "./pages/HomePage"
import { SearchAddModalPage } from "./pages/SearchAddModalPage"

const E2E_USERNAME = process.env.E2E_USERNAME
const E2E_PASSWORD = process.env.E2E_PASSWORD
const TARGET_GAME = "Dota 2"

test.describe("Backlog flow", () => {
  test.skip(!E2E_USERNAME || !E2E_PASSWORD, "E2E credentials not configured")

  test("logs in and adds Dota 2 to the backlog", async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()
    await homePage.expectCardsVisible()
    await homePage.login(E2E_USERNAME!, E2E_PASSWORD!)
    await page.waitForURL("**/in-progress", { timeout: 10_000 })

    const backlogPage = new BacklogPage(page)
    await backlogPage.goto()
    await backlogPage.expectLoaded()

    await backlogPage.openAddGamesModal()
    const searchModal = new SearchAddModalPage(page)
    await searchModal.waitForOpen()
    await searchModal.search(TARGET_GAME)
    await searchModal.waitForGame(TARGET_GAME)

    const addButton = searchModal.getAddToBacklogButton(TARGET_GAME)
    await expect(addButton).toBeVisible()
    await expect(addButton).toBeEnabled()
    await addButton.click()

    const addedButton = searchModal.getAddedToBacklogButton(TARGET_GAME)
    await expect(addedButton).toBeVisible()
    await expect(addedButton).toBeDisabled()
    await expect(addedButton).toHaveText(/Added/i)

    await searchModal.close()
    await backlogPage.expectGameInBacklog(TARGET_GAME)
  })
})
