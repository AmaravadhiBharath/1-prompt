import { BaseAdapter } from "./base";
import type { ScrapedPrompt } from "../../types";

export class ChatGPTAdapter extends BaseAdapter {
  name = "ChatGPT";

  detect(): boolean {
    return (
      location.hostname.includes("chatgpt.com") ||
      location.hostname.includes("chat.openai.com")
    );
  }

  scrapePrompts(): ScrapedPrompt[] {
    const prompts: ScrapedPrompt[] = [];
    const seen = new Set<string>();

    // DEBUG LOGGING - helpful for tracking extraction errors
    const allArticles = this.deepQuerySelectorAll("article");
    const allUserArticles = this.deepQuerySelectorAll(
      'article[data-testid*="conversation-turn"]:has([data-message-author-role="user"])',
    );
    const legacyRoleElements = this.deepQuerySelectorAll(
      '[data-message-author-role="user"]',
    );

    console.log("[1-prompt] ChatGPT DOM Debug:", {
      articles: allArticles.length,
      userArticles: allUserArticles.length,
      legacyRole: legacyRoleElements.length,
      withTestId: this.deepQuerySelectorAll('[data-testid*="conversation-turn"]')
        .length,
    });

    // Strategy 1: Look for user message containers
    const candidates = this.deepQuerySelectorAll(
      [
        ".whitespace-pre-wrap",
        ".user-message-bubble-color",
        '[data-message-author-role="user"]',
        'article:has([data-message-author-role="user"]) div[class*="markdown"]',
      ].join(", "),
    ).filter((el) => {
      // Must be visible
      const htmlEl = el as HTMLElement;
      if (htmlEl.offsetParent === null) return false;

      // EXCLUDE the input box/composer area definitively
      if (this.isInputElement(el) || el.closest("form") || el.closest("footer"))
        return false;

      // Check for user role in parents
      const isUser =
        el.closest('[data-message-author-role="user"]') ||
        el.closest(".user-message-bubble-color") ||
        el.closest('article[data-testid*="conversation-turn"]:has([data-message-author-role="user"])');

      return !!isUser;
    });

    // Strategy 2: Get "leaf" message content to avoid duplicates
    const leafContainers = candidates.filter((el) => {
      return !Array.from(el.querySelectorAll("*")).some((child) =>
        candidates.includes(child),
      );
    });

    console.log(
      `[1-prompt] ChatGPT candidates: ${candidates.length}, leaf containers: ${leafContainers.length}`,
    );

    leafContainers.forEach((el, index) => {
      let content = this.getVisibleText(el).trim();

      // Clean up common noise
      content = content.replace(/\d\s*\/\s*\d/g, ""); // strip "1 / 1" pagination
      content = content
        .replace(/(copy|read aloud|good response|bad response)$/i, "")
        .trim();

      if (
        content &&
        content.length >= 1 &&
        !this.isUIElement(content) &&
        !seen.has(content)
      ) {
        seen.add(content);
        prompts.push({
          content,
          index,
          platform: "ChatGPT",
          timestamp: Date.now() - (leafContainers.length - index) * 1000,
        });
      }
    });

    // FALLBACK: If we saw articles but found 0 prompts, look again without strict visibility filter
    // This handles race conditions where content is in DOM but not yet fully painted
    if (prompts.length === 0 && allArticles.length > 0) {
      console.log("[1-prompt] NO VISIBLE PROMPTS - Running deep article fallback...");
      allUserArticles.forEach((article, index) => {
        const textNodes = Array.from(article.querySelectorAll('div[class*="markdown"], .whitespace-pre-wrap'));
        textNodes.forEach((node) => {
          const content = node.textContent?.trim();
          if (content && content.length > 1 && !seen.has(content)) {
            seen.add(content);
            prompts.push({
              content,
              index,
              platform: "ChatGPT",
              source: "dom",
            });
          }
        });
      });
    }

    console.log(`[1-prompt] ChatGPT user prompts final: ${prompts.length}`);
    return prompts;
  }
}
