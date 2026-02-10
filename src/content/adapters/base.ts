import type { PlatformAdapter, ScrapedPrompt } from '../../types';
import { selectorRegistry, type SelectorStrategy } from '../../services/selector-registry';

// Base class with common utilities for adapters
export abstract class BaseAdapter implements PlatformAdapter {
  abstract name: string;
  abstract detect(): boolean;
  abstract scrapePrompts(): ScrapedPrompt[];

  /**
   * Main scraping method (Async)
   * Remote config disabled - returning wrong results
   * TODO: Fix remote config to filter AI responses properly
   */
  async scrape(): Promise<ScrapedPrompt[]> {
    // Remote config temporarily disabled - was returning AI responses
    // const remotePrompts = await this.scrapePromptsWithConfig();
    // if (remotePrompts.length > 0) {
    //   return remotePrompts;
    // }

    // Use local implementation (like 6b50aaa)
    return this.scrapePrompts();
  }

  /**
   * Attempt to scrape using remote configuration
   * Returns empty array if no config found or extraction fails
   */
  protected async scrapePromptsWithConfig(): Promise<ScrapedPrompt[]> {
    try {
      const hostname = window.location.hostname;
      const config = await selectorRegistry.getSelectors(hostname);

      if (!config || !config.promptSelectors) {
        return [];
      }

      console.log(`[BaseAdapter] Using remote config for ${hostname}`);
      return this.executeStrategy(config);
    } catch (e) {
      console.warn('[BaseAdapter] Remote scrape error:', e);
      return [];
    }
  }

  private executeStrategy(strategy: SelectorStrategy): ScrapedPrompt[] {
    const prompts: ScrapedPrompt[] = [];
    const seen = new Set<string>();

    if (strategy.promptSelectors) {
      for (const selector of strategy.promptSelectors) {
        const elements = this.deepQuerySelectorAll(selector);

        for (const el of elements) {
          // Check exclusions
          if (strategy.excludeSelectors?.some(s => el.matches(s))) continue;

          const content = this.cleanText(this.getVisibleText(el));
          const minLength = strategy.minContentLength || 3;

          if (content && content.length >= minLength && !seen.has(content) && !this.isUIElement(content)) {
            seen.add(content);
            prompts.push({ content, index: prompts.length });
          }
        }
      }
    }

    return prompts;
  }

  // Utility: Deep query selector that pierces shadow DOM
  protected deepQuerySelectorAll(selector: string, root: Node = document): Element[] {
    let nodes: Element[] = [];
    try {
      nodes = Array.from((root as ParentNode).querySelectorAll(selector));
    } catch (e) {
      console.warn('[1prompt] Invalid selector:', selector);
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      const el = node as Element;
      if (el.shadowRoot) {
        nodes = [...nodes, ...this.deepQuerySelectorAll(selector, el.shadowRoot)];
      }
    }
    return nodes;
  }

  // Utility: Clean text content
  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Utility: Check if text is UI noise
  protected isUIElement(text: string): boolean {
    const uiPatterns = /^(copy|regenerate|share|edit|delete|save|retry|cancel|submit|send|stop|continue|new chat|clear)$/i;
    return uiPatterns.test(text.trim()) || text.trim().length < 3;
  }

  // Utility: Extract visible text from element
  protected getVisibleText(element: Element): string {
    const el = element as HTMLElement;
    return el.innerText || el.textContent || '';
  }

  // Utility: Find the main scroll container for the chat
  public getScrollContainer(): HTMLElement | null {
    // Common scroll container patterns
    const selectors = [
      'main',
      '[class*="scroll-area"]',
      '[class*="messages-container"]',
      '[class*="chat-scroll"]',
      'div[style*="overflow-y: auto"]',
      'div[style*="overflow-y: scroll"]'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector) as HTMLElement;
      if (el && el.scrollHeight > el.clientHeight) return el;
    }

    // Fallback: find the largest scrollable element
    const allDivs = Array.from(document.querySelectorAll('div'));
    let largest: HTMLElement | null = null;
    let maxScroll = 0;

    for (const div of allDivs) {
      const scroll = div.scrollHeight;
      if (scroll > maxScroll && window.getComputedStyle(div).overflowY !== 'hidden') {
        maxScroll = scroll;
        largest = div;
      }
    }

    return largest || document.documentElement;
  }
}
