import { BaseAdapter } from './base';
import type { ScrapedPrompt } from '../../types';

export class CursorAdapter extends BaseAdapter {
  name = 'Cursor';

  detect(): boolean {
    return location.hostname.includes('cursor.sh') ||
      location.hostname.includes('cursor.com');
  }

  scrapePrompts(): ScrapedPrompt[] {
    const prompts: ScrapedPrompt[] = [];
    const seen = new Set<string>();

    // Strategy 1: User message elements
    const userMessages = document.querySelectorAll('[class*="user-message"], [class*="UserMessage"], [data-role="user"]');
    userMessages.forEach((el, index) => {
      const content = this.cleanText(this.getVisibleText(el));
      if (content && !this.isUIElement(content) && !seen.has(content)) {
        seen.add(content);
        prompts.push({ content, index });
      }
    });

    if (prompts.length > 0) return prompts;

    // Strategy 2: Chat interface
    const chatMessages = document.querySelectorAll('[class*="chat"] [class*="message"], [class*="conversation"] [class*="turn"]');
    let promptIndex = 0;
    chatMessages.forEach((msg) => {
      const classList = msg.className.toLowerCase();
      // Skip AI responses
      if (classList.includes('assistant') || classList.includes('bot') || classList.includes('ai') || classList.includes('response')) {
        return;
      }
      const content = this.cleanText(this.getVisibleText(msg));
      if (content && content.length > 3 && !seen.has(content)) {
        seen.add(content);
        prompts.push({ content, index: promptIndex++ });
      }
    });

    // Strategy 3: Command palette or prompt history
    if (prompts.length === 0) {
      const commands = document.querySelectorAll('[class*="command"], [class*="prompt-history"], [class*="input-history"]');
      commands.forEach((el, index) => {
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
