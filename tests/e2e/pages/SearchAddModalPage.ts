import { expect, type Locator, type Page } from "@playwright/test"

export class SearchAddModalPage {
  readonly page: Page
  readonly dialog: Locator
  readonly closeButton: Locator
  readonly searchInput: Locator
  readonly genresClearButton: Locator
  readonly releaseAfterInput: Locator
  readonly releaseBeforeInput: Locator
  readonly sortSelect: Locator
  readonly resetFiltersButton: Locator
  readonly retryButton: Locator

  constructor(page: Page) {
    this.page = page
    this.dialog = this.page.getByRole("dialog", { name: /search and add games/i })
    this.closeButton = this.dialog.getByRole("button", { name: /close search modal/i })
    this.searchInput = this.dialog.getByRole("searchbox", { name: /search/i })
    this.genresClearButton = this.dialog
      .locator("p", { hasText: "Genres" })
      .locator("..")
      .getByRole("button", { name: "Clear" })
    this.releaseAfterInput = this.dialog.getByLabel("Released after")
    this.releaseBeforeInput = this.dialog.getByLabel("Released before")
    this.sortSelect = this.dialog.getByLabel("Sort by")
    this.resetFiltersButton = this.dialog.getByRole("button", { name: /reset all/i })
    this.retryButton = this.dialog.getByRole("button", { name: /retry/i })
  }

  async waitForOpen() {
    await this.dialog.waitFor({ state: "visible" })
  }

  async search(value: string) {
    await this.searchInput.fill(value)
    await this.searchInput.press("Enter")
  }

  async close() {
    await this.closeButton.click()
  }

  async waitForGame(title: string) {
    await expect(this.getGameHeading(title)).toBeVisible({ timeout: 20_000 })
  }

  getGenreCheckbox(genre: string) {
    return this.dialog.getByRole("checkbox", { name: genre })
  }

  getFilterChipRemove(label: string) {
    return this.dialog.getByRole("button", { name: `Remove ${label}` })
  }

  getAddToBacklogButton(title: string) {
    return this.getGameScopedButton(title, "Add to backlog")
  }

  getAddToInProgressButton(title: string) {
    return this.getGameScopedButton(title, "Add to in-progress")
  }

  getAddedToBacklogButton(title: string) {
    return this.getGameArticle(title).getByRole("button", { name: /^Added$/i })
  }

  private getGameScopedButton(title: string, name: string) {
    const article = this.getGameArticle(title)
    return article.getByRole("button", { name })
  }

  private getGameArticle(title: string) {
    const heading = this.getGameHeading(title)
    return heading.locator("xpath=ancestor::article")
  }

  getGameHeading(title: string) {
    const matcher = new RegExp(`^${this.escapeRegex(title)}$`, "i")
    return this.dialog.getByRole("heading", { name: matcher })
  }
  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }
}
