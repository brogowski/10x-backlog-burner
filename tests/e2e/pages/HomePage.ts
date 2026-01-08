import { expect, type Locator, type Page } from "@playwright/test"

export class HomePage {
  readonly page: Page
  readonly welcomeHeading: Locator

  constructor(page: Page) {
    this.page = page
    this.welcomeHeading = this.page.getByRole("heading", { name: /welcome back/i })
  }

  async goto() {
    await this.page.goto("/auth")
  }

  async expectCardsVisible() {
    await expect(this.welcomeHeading).toBeVisible()
  }
}

