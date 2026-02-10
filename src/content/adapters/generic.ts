import { BaseAdapter } from './base';
import type { ScrapedPrompt } from '../../types';

// Generic adapter as fallback for unknown platforms
export class GenericAdapter extends BaseAdapter {
  name = 'generic';

  detect(): boolean {
    // Always returns true as fallback
    return true;
  }

  scrapePrompts(): ScrapedPrompt[] {
    const currentUrl = window.location.href;
    let messages: { role: string; content: string }[] = [];

    // Special handling for Gemini (Shadow DOM)
    if (currentUrl.includes('gemini.google.com')) {
      const getShadowElements = (selector: string, root: Document | ShadowRoot = document): Element[] => {
        let elements: Element[] = [];
        root.querySelectorAll(selector).forEach(el => elements.push(el));
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
        let node;
        while (node = walker.nextNode() as Element) {
          if (node.shadowRoot) {
            elements = elements.concat(getShadowElements(selector, node.shadowRoot));
          }
        }
        return elements;
      };

      const userQueries = getShadowElements('user-query');
      if (userQueries.length > 0) {
        return userQueries
          .map((el, idx) => {
            const content = (el as HTMLElement).innerText?.trim();
            return content && content.length > 0 ? { content, index: idx } : null;
          })
          .filter((p): p is ScrapedPrompt => p !== null);
      }
    }

    // Generic Smart Scraping
    const container = this.findChatContainer();
    if (container) {
      messages = this.extractMessages(container);
    }

    // Safety Cap: Limit to 1000 prompts to prevent memory issues
    if (messages.length > 1000) {
      console.warn('[1prompt] Truncating extraction at 1000 prompts safety limit');
      messages = messages.slice(0, 1000);
    }

    return messages.map((m, i) => ({ content: m.content, index: i }));
  }

  private findChatContainer(): Node {
    const selectors = [
      "infinite-scroller",
      '[role="log"]',
      '[role="main"]',
      ".chat-history",
      ".conversation",
      "main"
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && (el as HTMLElement).innerText.length > 200) return el;
    }
    return document.body;
  }

  private extractMessages(root: Node): { role: string; content: string }[] {
    const fragments: { role: string; content: string }[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;

    while (node = walker.nextNode()) {
      const text = node.textContent?.trim() || "";
      const parent = node.parentElement;

      // Filter out noise and AI responses
      if (
        text.length < 2 ||
        this.isSystemNoise(text) ||
        parent?.tagName.toLowerCase() === "model-response" ||
        parent?.classList.contains("model-response-text") ||
        parent?.getAttribute("data-message-author-role") === "assistant"
      ) continue;

      // Heuristic Filtering (Tiger Logic)
      const lowerText = text.toLowerCase();

      // Skip common AI phrases
      if ([
        /should be written (about|on|for)/i,
        /the story should/i,
        /story for class \d+/i,
        /resulting in a positive resolution/i,
        /clear moral about/i,
        /focus on (friendship|teamwork|cooperation)/i,
        /\bmet near\b/i,
        /help solve through/i,
        /spend time together/i
      ].some(regex => regex.test(text))) continue;

      if ([
        /^(one|a) (bright|sunny|dark|cold|warm|beautiful|clear) (day|morning|evening|night)/i,
        /once upon a time/i,
        /the end/i,
        /chapter \d+/i,
        /lived (his|her|their) life/i,
        /was a (golden retriever|cow|dog|cat|yellow frog|rabbit)/i,
        /near a (clear|beautiful|sparkling|calm) (pond|river|lake|stream)/i,
        /who met near/i,
        /faces a small problem/i
      ].some(regex => regex.test(text))) continue;

      if (
        lowerText.startsWith("here is") ||
        lowerText.startsWith("sure, i can") ||
        lowerText.startsWith("i have") ||
        lowerText.startsWith("certainly") ||
        lowerText.startsWith("of course") ||
        lowerText.startsWith("here's a")
      ) continue;

      // Skip command-like words if text is long (likely UI or code explanation)
      if (text.length > 200) {
        const commandWords = ["create", "write", "make", "fix", "generate", "build", "explain", "how", "what", "why", "list", "show", "tell", "give", "help", "find", "debug"];
        const firstWord = text.split(" ")[0].toLowerCase();
        if (!commandWords.includes(firstWord)) continue;
      }

      // Skip specific noise phrases
      if (
        lowerText.includes("the cow, dog, and") ||
        lowerText.includes("yellow frog") ||
        lowerText.includes("calm problem-solving") ||
        lowerText.includes("sahai turns") ||
        lowerText.includes("scattered ai conversations") ||
        lowerText.includes("actionable workflow") ||
        lowerText.includes("work with ai with an edge") ||
        lowerText.includes("generates summaries of all prompts") ||
        lowerText.includes("no duplicates") ||
        lowerText.includes("cancel out the conflict") ||
        /^(\d+\.|-|\*|•)?\s*(the image shows|image of|this image depicts)/i.test(text)
      ) continue;

      fragments.push({ role: "user", content: text });
    }

    return this.mergeFragments(fragments);
  }

  private isSystemNoise(text: string): boolean {
    return ["Regenerate", "Modify", "Share", "Google", "Copy", "Bad response", "Good response"].includes(text);
  }

  private mergeFragments(fragments: { role: string; content: string }[]): { role: string; content: string }[] {
    if (fragments.length === 0) return [];
    const merged: { role: string; content: string }[] = [];
    let current = { ...fragments[0] };

    for (let i = 1; i < fragments.length; i++) {
      const next = fragments[i];
      // If same role (user), merge
      if (next.role === current.role) {
        current.content += "\n" + next.content;
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);
    return merged;
  }
}
