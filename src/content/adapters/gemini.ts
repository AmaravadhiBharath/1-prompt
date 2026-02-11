import { BaseAdapter } from "./base";
import type { ScrapedPrompt } from "../../types";

export class GeminiAdapter extends BaseAdapter {
  name = "Gemini";

  detect(): boolean {
    return location.hostname.includes("gemini.google.com");
  }

  scrapePrompts(): ScrapedPrompt[] {
    const prompts: ScrapedPrompt[] = [];
    const seen = new Set<string>();

    const candidates = this.deepQuerySelectorAll(
      [
        "user-query",
        '[class*="user-query"]',
        '[class*="query-text"]',
        ".query-content",
        ".user-message",
        'article:has(user-query) div[class*="content"]',
        'article:has(.user-query) div[class*="content"]',
      ].join(", "),
    ).filter((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.offsetParent === null && !el.closest('article')) return false;

      // EXCLUDE composer
      if (this.isInputElement(el)) return false;

      const isUser =
        el.closest("user-query") ||
        el.closest('[class*="user-query"]') ||
        el.closest(".user-message") ||
        el.closest('article:has(user-query)');

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
        prompts.push({ content, index, platform: "Gemini" });
      }
    });

    return prompts;
  }
}
