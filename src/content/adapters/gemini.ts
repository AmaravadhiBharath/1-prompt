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

    // Find all potential prompt elements
    const candidates = this.deepQuerySelectorAll(
      [
        "user-query",
        '[class*="user-query"]',
        '[class*="query-text"]',
        ".query-content",
        ".user-message",
        "[data-query]",
        'div[data-message-author-role="user"]',
      ].join(", "),
    );

    // Filter to keep only the top-most elements (avoid splitting one message into multiple prompts)
    console.log(`[1prompt] Gemini candidates found: ${candidates.length}`);
    const topLevelElements = candidates.filter((el) => {
      return !candidates.some((other) => other !== el && other.contains(el));
    });

    topLevelElements.forEach((el, index) => {
      const content = this.cleanText(this.getVisibleText(el));
      if (content && !this.isUIElement(content) && !seen.has(content)) {
        seen.add(content);
        prompts.push({ content, index });
      }
    });

    // Fallback: Strategy 3: Look in main conversation area if nothing found
    if (prompts.length === 0) {
      const main = document.querySelector('main, [role="main"]');
      if (main) {
        const turns = main.querySelectorAll(
          '[class*="turn"], [class*="message"]',
        );
        let promptIndex = 0;
        turns.forEach((turn) => {
          const classList = turn.className.toLowerCase();
          if (
            classList.includes("model") ||
            classList.includes("response") ||
            classList.includes("answer")
          ) {
            return;
          }
          const content = this.cleanText(this.getVisibleText(turn));
          if (content && content.length > 5 && !seen.has(content)) {
            seen.add(content);
            prompts.push({ content, index: promptIndex++ });
          }
        });
      }
    }

    return prompts;
  }
}
