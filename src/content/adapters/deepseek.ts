import { BaseAdapter } from "./base";
import type { ScrapedPrompt } from "../../types";

export class DeepSeekAdapter extends BaseAdapter {
  name = "DeepSeek";

  detect(): boolean {
    return location.hostname.includes("deepseek.com");
  }

  scrapePrompts(): ScrapedPrompt[] {
    const prompts: ScrapedPrompt[] = [];
    const seen = new Set<string>();

    const candidates = this.deepQuerySelectorAll(
      [
        '[class*="user"], [class*="User"], [data-role="user"]',
        'div[class*="message-container"]:has([class*="user"])',
        'article:has([class*="user"]) div[class*="content"]',
      ].join(", "),
    ).filter((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.offsetParent === null && !el.closest('article')) return false;

      // EXCLUDE composer
      if (this.isInputElement(el)) return false;

      const isUser =
        el.closest('[class*="user"]') ||
        el.closest('[class*="User"]') ||
        el.closest('[data-role="user"]') ||
        el.closest('article:has([class*="user"])');

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
        prompts.push({ content, index, platform: "DeepSeek" });
      }
    });

    return prompts;
  }
}
