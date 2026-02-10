import { BaseAdapter } from './base';
import type { ScrapedPrompt } from '../../types';

export class DeepSeekAdapter extends BaseAdapter {
  name = 'DeepSeek';

  detect(): boolean {
    return location.hostname.includes('deepseek.com');
  }

  scrapePrompts(): ScrapedPrompt[] {
    const prompts: ScrapedPrompt[] = [];
    const seen = new Set<string>();

    // Strategy 1: User message containers
    const userMessages = document.querySelectorAll('[class*="user"], [class*="User"], [data-role="user"]');
    userMessages.forEach((el, index) => {
      const content = this.cleanText(this.getVisibleText(el));
      if (content && !this.isUIElement(content) && !seen.has(content)) {
        seen.add(content);
        prompts.push({ content, index });
      }
    });

    if (prompts.length > 0) return prompts;

    // Strategy 2: Chat bubble structure
    const bubbles = document.querySelectorAll('[class*="bubble"], [class*="message"]');
    let promptIndex = 0;
    bubbles.forEach((bubble) => {
      const classList = bubble.className.toLowerCase();
      // Skip AI responses
      if (classList.includes('assistant') || classList.includes('bot') || classList.includes('ai')) {
        return;
      }
      if (classList.includes('user') || classList.includes('human')) {
        const content = this.cleanText(this.getVisibleText(bubble));
        if (content && content.length > 3 && !seen.has(content)) {
          seen.add(content);
          prompts.push({ content, index: promptIndex++ });
        }
      }
    });

    // Strategy 3: DS markdown containers (DeepSeek specific)
    if (prompts.length === 0) {
      // Look for non-markdown content (ds-markdown are usually AI responses)
      const allDivs = document.querySelectorAll('main div');
      allDivs.forEach((div, idx) => {
        if (!div.querySelector('.ds-markdown') && !div.closest('.ds-markdown')) {
          const content = this.cleanText(this.getVisibleText(div));
          if (content && content.length > 10 && content.length < 2000 && !seen.has(content)) {
            // Additional check: should not look like code or markdown
            if (!content.includes('```') && !content.startsWith('#')) {
              seen.add(content);
              prompts.push({ content, index: idx });
            }
          }
        }
      });
    }

    return prompts;
  }
}
