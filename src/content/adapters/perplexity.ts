import { BaseAdapter } from './base';
import type { ScrapedPrompt } from '../../types';

export class PerplexityAdapter extends BaseAdapter {
  name = 'Perplexity';

  detect(): boolean {
    return location.hostname.includes('perplexity.ai');
  }

  scrapePrompts(): ScrapedPrompt[] {
    const prompts: ScrapedPrompt[] = [];
    const seen = new Set<string>();

    // Strategy 1: Query text elements
    const queries = document.querySelectorAll('[class*="query"], [class*="question"], [class*="user"]');
    queries.forEach((el, index) => {
      const classList = el.className.toLowerCase();
      // Skip if it's clearly a response/answer
      if (classList.includes('answer') || classList.includes('response') || classList.includes('source')) {
        return;
      }
      const content = this.cleanText(this.getVisibleText(el));
      if (content && content.length > 5 && !this.isUIElement(content) && !seen.has(content)) {
        seen.add(content);
        prompts.push({ content, index });
      }
    });

    // Strategy 2: Thread structure
    if (prompts.length === 0) {
      const threadItems = document.querySelectorAll('[class*="thread"] > div, [class*="Thread"] > div');
      let promptIndex = 0;
      threadItems.forEach((item, idx) => {
        // Every other item might be user query (alternating pattern)
        if (idx % 2 === 0) {
          const content = this.cleanText(this.getVisibleText(item));
          if (content && content.length > 5 && !seen.has(content)) {
            seen.add(content);
            prompts.push({ content, index: promptIndex++ });
          }
        }
      });
    }

    // Strategy 3: Search/input history
    if (prompts.length === 0) {
      const searchHistory = document.querySelectorAll('h1, h2, [class*="title"]');
      searchHistory.forEach((el, index) => {
        const content = this.cleanText(this.getVisibleText(el));
        // Perplexity often shows the query as a heading
        if (content && content.length > 10 && content.length < 500 && !seen.has(content)) {
          seen.add(content);
          prompts.push({ content, index });
        }
      });
    }

    return prompts;
  }
}
