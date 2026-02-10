import { BaseAdapter } from "./base";
import type { ScrapedPrompt } from "../../types";

export class MetaAIAdapter extends BaseAdapter {
  name = "Meta AI";

  detect(): boolean {
    return location.hostname.includes("meta.ai");
  }

  scrapePrompts(): ScrapedPrompt[] {
    const prompts: ScrapedPrompt[] = [];
    const seen = new Set<string>();

    // Strategy 1: User message containers
    const userMessages = document.querySelectorAll(
      '[class*="user"], [class*="User"], [data-type="user"]',
    );
    userMessages.forEach((el, index) => {
      const classList = el.className.toLowerCase();
      // Skip if it's an AI response
      if (
        classList.includes("assistant") ||
        classList.includes("response") ||
        classList.includes("meta")
      ) {
        return;
      }
      const content = this.cleanText(this.getVisibleText(el));
      if (content && !this.isUIElement(content) && !seen.has(content)) {
        seen.add(content);
        prompts.push({ content, index });
      }
    });

    if (prompts.length > 0) return prompts;

    // Strategy 2: Chat bubble structure (Meta AI typically uses bubbles)
    const bubbles = document.querySelectorAll(
      '[class*="bubble"], [class*="Bubble"]',
    );
    let promptIndex = 0;
    bubbles.forEach((bubble) => {
      const classList = bubble.className.toLowerCase();
      // User bubbles are often on the right or have specific styling
      if (
        classList.includes("right") ||
        classList.includes("user") ||
        classList.includes("outgoing")
      ) {
        const content = this.cleanText(this.getVisibleText(bubble));
        if (content && content.length > 3 && !seen.has(content)) {
          seen.add(content);
          prompts.push({ content, index: promptIndex++ });
        }
      }
    });

    // Strategy 3: Conversation thread
    if (prompts.length === 0) {
      const thread = document.querySelector(
        '[class*="thread"], [class*="conversation"], [role="log"]',
      );
      if (thread) {
        const entries = thread.querySelectorAll(":scope > div, :scope > li");
        entries.forEach((entry, idx) => {
          // Skip entries that look like AI (usually have markdown, code blocks, or specific classes)
          if (
            entry.querySelector('.markdown, pre, code, [class*="response"]')
          ) {
            return;
          }
          const content = this.cleanText(this.getVisibleText(entry));
          if (
            content &&
            content.length > 5 &&
            content.length < 2000 &&
            !seen.has(content)
          ) {
            seen.add(content);
            prompts.push({ content, index: idx });
          }
        });
      }
    }

    return prompts;
  }
}
