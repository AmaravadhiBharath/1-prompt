import { BaseAdapter } from './base';
import type { ScrapedPrompt } from '../../types';

export class ClaudeAdapter extends BaseAdapter {
  name = 'Claude';

  detect(): boolean {
    return location.hostname.includes('claude.ai');
  }

  scrapePrompts(): ScrapedPrompt[] {
    const prompts: ScrapedPrompt[] = [];
    const seen = new Set<string>();

    // Find all potential prompt elements
    const candidates = this.deepQuerySelectorAll([
      '[data-testid="human-message"]',
      '.human-message',
      '[class*="human"]',
      '[class*="message"]:not([class*="assistant"]):not([class*="ai"]):not([class*="claude"])'
    ].join(', '));

    // Filter to keep only the top-most elements
    const topLevelElements = candidates.filter(el => {
      return !candidates.some(other => other !== el && other.contains(el));
    });

    topLevelElements.forEach((el, index) => {
      const content = this.cleanText(this.getVisibleText(el));
      if (content && !this.isUIElement(content) && !seen.has(content)) {
        seen.add(content);
        prompts.push({ content, index });
      }
    });

    return prompts;
  }
}
