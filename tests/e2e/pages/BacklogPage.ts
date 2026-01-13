import { expect, type Locator, type Page } from "@playwright/test";

export class BacklogPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addGamesButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = this.page.getByRole("heading", { name: /your backlog/i });
    this.addGamesButton = this.page.getByRole("button", { name: "Add games" }).first();
  }

  async goto() {
    await this.page.goto("/backlog");
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async openAddGamesModal() {
    await expect(this.addGamesButton).toBeVisible();
    await this.addGamesButton.click();
  }

  getGameHeading(title: string) {
    const matcher = new RegExp(`^${this.escapeRegex(title)}$`, "i");
    return this.page.getByRole("heading", { name: matcher });
  }

  async expectGameInBacklog(title: string) {
    await expect(this.getGameHeading(title)).toBeVisible();
  }

  getRemoveButton(title: string) {
    return this.page.getByRole("button", { name: `Remove ${title} from backlog` });
  }

  async removeGameFromBacklogIfPresent(title: string) {
    const heading = this.getGameHeading(title);
    if ((await heading.count()) === 0) {
      return;
    }

    await this.getRemoveButton(title).first().click();
    await expect(this.getGameHeading(title)).toHaveCount(0);
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
