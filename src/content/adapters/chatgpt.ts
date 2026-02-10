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

    // Primary: Look for elements WITH the user role attribute
    const userMessages = this.deepQuerySelectorAll(
      '[data-message-author-role="user"]',
    );

    console.log(
      `[1-prompt] ChatGPT user messages found: ${userMessages.length}`,
    );

    userMessages.forEach((el, index) => {
      let content = this.cleanText(this.getVisibleText(el));

      // Strip ChatGPT specific headers
      content = content.replace(/^(you said|you)\s*:?\s*/i, "").trim();

      // Skip very long content (AI responses are typically longer)
      if (content.length > 3000) {
        console.log("[1-prompt] Skipping very long content");
        return;
      }

      if (content && !this.isUIElement(content) && !seen.has(content)) {
        seen.add(content);
        prompts.push({ content, index });
      }
    });

    console.log(`[1-prompt] ChatGPT user prompts extracted: ${prompts.length}`);
    return prompts;
  }
}
