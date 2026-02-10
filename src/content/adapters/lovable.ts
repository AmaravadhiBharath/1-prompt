import { BaseAdapter } from './base';
import type { ScrapedPrompt } from '../../types';

export class LovableAdapter extends BaseAdapter {
  name = 'Lovable';

  detect(): boolean {
    return location.hostname.includes('lovable.dev');
  }

  /**
   * Clean text by removing UI elements only (buttons, SVG, nav, etc.)
   * Does NOT remove text content - preserves user prompts completely.
   */
  private cleanContent(node: HTMLElement): string {
    const clone = node.cloneNode(true) as HTMLElement;

    // Remove only actual UI elements
    const uiSelectors = [
      'button',
      'svg',
      'path',
      '[role="button"]',
      '[aria-hidden="true"]',
      '.lucide',
      '[class*="chevron"]',
      '[class*="tooltip"]',
      '[class*="badge"]',
      'nav',
      'header',
      'footer',
      'aside'
    ];

    clone.querySelectorAll(uiSelectors.join(', ')).forEach(el => el.remove());
    return this.cleanText(this.getVisibleText(clone));
  }


  /**
   * Determine if a prose element is a user prompt based on DOM structure
   * User prompts have 'whitespace-normal' class
   * AI responses have 'prose-h1:mb-2' class
   */
  private isUserPrompt(element: HTMLElement): boolean {
    const classes = element.className;

    // User prompts have whitespace-normal class
    if (classes.includes('whitespace-normal')) {
      return true;
    }

    // AI responses have prose-h1:mb-2 class - explicitly reject these
    if (classes.includes('prose-h1:mb-2')) {
      return false;
    }

    // Fallback: Check parent container alignment
    // User messages are right-aligned (justify-end, ml-auto)
    // AI messages are left-aligned
    let curr = element.parentElement;
    let depth = 0;
    while (curr && depth < 5) {
      const parentClasses = curr.className;
      if (parentClasses.includes('justify-end') || parentClasses.includes('ml-auto')) {
        return true;
      }
      if (parentClasses.includes('assistant') || parentClasses.includes('bot')) {
        return false;
      }
      curr = curr.parentElement;
      depth++;
    }

    // Default: assume not a user prompt if unclear
    return false;
  }

  scrapePrompts(): ScrapedPrompt[] {
    console.log('[SahAI] Lovable Extraction Engine starting (v1.1.0 - ba96d2c multi-position)...');

    const prompts: ScrapedPrompt[] = [];
    const seen = new Set<string>();

    // Get all prose elements 
    const proseElements = this.deepQuerySelectorAll('[class*="prose"]');
    console.log(`[SahAI] Found ${proseElements.length} total prose elements`);

    proseElements.forEach(el => {
      const element = el as HTMLElement;

      // FILTER: Only extract user prompts (skip AI responses)
      if (!this.isUserPrompt(element)) {
        return;
      }

      const text = element.textContent?.trim() || '';

      // Skip if too short or too long
      if (text.length < 2 || text.length > 5000) {
        return;
      }

      // Skip if already seen
      if (seen.has(text)) {
        return;
      }

      // Clean the text
      const content = this.cleanContent(element);

      // Add if not empty
      if (content && content.length > 2 && !seen.has(content)) {
        seen.add(content);
        prompts.push({ content, index: prompts.length });
      }
    });

    console.log(`[SahAI] Total user prompts extracted: ${prompts.length}`);
    return prompts;
  }

  public getScrollContainer(): HTMLElement | null {
    let container = document.querySelector('main') as HTMLElement;
    if (container && container.scrollHeight > container.clientHeight) {
      return container;
    }

    const selectors = [
      '.flex.flex-col.overflow-y-auto',
      '[class*="overflow-y-auto"]',
      '[class*="chat-container"]',
      '[class*="messages-container"]',
      '.flex-1.overflow-y-auto',
      '[role="region"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && element.scrollHeight > element.clientHeight * 1.2) {
        return element;
      }
    }

    return null;
  }
}
