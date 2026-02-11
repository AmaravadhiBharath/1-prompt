import { BaseAdapter } from "./base";
import type { ScrapedPrompt } from "../../types";

export class ClaudeAdapter extends BaseAdapter {
  name = "Claude";

  detect(): boolean {
    return location.hostname.includes("claude.ai");
  }

  scrapePrompts(): ScrapedPrompt[] {
    const prompts: ScrapedPrompt[] = [];
    const seen = new Set<string>();

    const candidates = this.deepQuerySelectorAll(
      [
        '[data-testid="human-message"]',
        ".human-message",
        '[class*="human"]',
        'article:has([data-testid="human-message"]) div[class*="markdown"]',
        'article:has(.human-message) div[class*="markdown"]',
      ].join(", "),
    ).filter((el) => {
      const htmlEl = el as HTMLElement;
      // Claude sometimes hides inactive turns in the DOM - check visibility
      if (htmlEl.offsetParent === null && !el.closest('article')) return false;

      // EXCLUDE composer
      if (this.isInputElement(el)) return false;

      const isUser =
        el.closest('[data-testid="human-message"]') ||
        el.closest(".human-message") ||
        el.closest('article[class*="turn"]:has([data-testid="human-message"])') ||
        el.closest('article:has(.human-message)');

      return !!isUser;
    });

    const leafContainers = candidates.filter((el) => {
      return !Array.from(el.querySelectorAll("*")).some((child) =>
        candidates.includes(child),
      );
    });

    leafContainers.forEach((el, index) => {
      const content = this.cleanText(this.getVisibleText(el));
      if (content && !this.isUIElement(content) && !seen.has(content)) {
        seen.add(content);
        prompts.push({ content, index, platform: "Claude" });
      }
    });

    return prompts;
  }
}
