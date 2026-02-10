import { BaseAdapter } from "./base";
import type { ScrapedPrompt } from "../../types";

export class BoltAdapter extends BaseAdapter {
  name = "Bolt";

  detect(): boolean {
    return location.hostname.includes("bolt.new");
  }

  scrapePrompts(): ScrapedPrompt[] {
    const prompts: ScrapedPrompt[] = [];
    const seen = new Set<string>();

    // Strategy 1: User input containers
    const userInputs = document.querySelectorAll(
      '[class*="user"], [class*="prompt"], [class*="input-message"]',
    );
    userInputs.forEach((el, index) => {
      const classList = el.className.toLowerCase();
      // Skip if it's an AI response
      if (
        classList.includes("assistant") ||
        classList.includes("response") ||
        classList.includes("output")
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

    // Strategy 2: Chat message structure
    const messages = document.querySelectorAll(
      '[class*="message"], [class*="Message"]',
    );
    let promptIndex = 0;
    messages.forEach((msg) => {
      const classList = msg.className.toLowerCase();
      // Look for user indicators
      if (
        classList.includes("user") ||
        classList.includes("human") ||
        classList.includes("you")
      ) {
        const content = this.cleanText(this.getVisibleText(msg));
        if (content && content.length > 3 && !seen.has(content)) {
          seen.add(content);
          prompts.push({ content, index: promptIndex++ });
        }
      }
    });

    // Strategy 3: Workspace/project prompts
    if (prompts.length === 0) {
      // Bolt might show prompts in a project context
      const workspacePrompts = document.querySelectorAll(
        '[class*="workspace"] [class*="prompt"], [class*="project"] [class*="request"]',
      );
      workspacePrompts.forEach((el, index) => {
        const content = this.cleanText(this.getVisibleText(el));
        if (content && content.length > 5 && !seen.has(content)) {
          seen.add(content);
          prompts.push({ content, index });
        }
      });
    }

    return prompts;
  }
}
