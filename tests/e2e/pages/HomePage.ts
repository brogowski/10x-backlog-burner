import { expect, type Locator, type Page } from "@playwright/test"

export class HomePage {
  readonly page: Page
  readonly welcomeHeading: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator

  constructor(page: Page) {
    this.page = page
    this.welcomeHeading = this.page.getByRole("heading", { name: /welcome back/i })
    this.emailInput = this.page.getByLabel("Email")
    this.passwordInput = this.page.locator("input#login-password")
    this.loginButton = this.page.getByRole("button", { name: /log in/i })
  }

  async goto() {
    await this.page.goto("/auth")
  }

  async expectCardsVisible() {
    await expect(this.welcomeHeading).toBeVisible()
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }
}

