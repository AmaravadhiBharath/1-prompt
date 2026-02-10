import type { ScrapedPrompt, SummaryResult } from '../types';

/**
 * Local Client-Side Summarization
 * Works without any API calls - perfect fallback when AI is unavailable
 */

export class LocalSummarizer {
  /**
   * Smart deduplication: removes similar prompts
   */
  private deduplicatePrompts(prompts: ScrapedPrompt[]): ScrapedPrompt[] {
    if (prompts.length <= 1) return prompts;

    const result: ScrapedPrompt[] = [];
    const normalized = new Set<string>();

    for (const prompt of prompts) {
      const norm = this.normalizeText(prompt.content);

      // Skip exact duplicates
      if (normalized.has(norm)) continue;

      // Skip if very similar to existing
      let isSimilar = false;
      for (const existing of result) {
        if (this.calculateSimilarity(norm, this.normalizeText(existing.content)) > 0.85) {
          isSimilar = true;
          break;
        }
      }

      if (!isSimilar) {
        normalized.add(norm);
        result.push(prompt);
      }
    }

    return result;
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }

  /**
   * Calculate similarity between two strings (0-1)
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (!a.length || !b.length) return 0;

    // Check containment
    if (a.includes(b) || b.includes(a)) {
      const shorter = Math.min(a.length, b.length);
      const longer = Math.max(a.length, b.length);
      return shorter / longer;
    }

    // Word-level overlap
    const wordsA = new Set(a.split(' ').filter(w => w.length > 2));
    const wordsB = new Set(b.split(' ').filter(w => w.length > 2));

    if (!wordsA.size || !wordsB.size) return 0;

    let overlap = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) overlap++;
    }

    return overlap / Math.max(wordsA.size, wordsB.size);
  }



  /**
   * Format summary output (Consolidated Paragraph)
   */
  private formatSummary(prompts: ScrapedPrompt[]): string {
    const deduped = this.deduplicatePrompts(prompts);

    // Create a natural language concatenation
    // This is simple logic, but effective for client-side speed
    const sentences = deduped.map(p => {
      let text = p.content.trim();
      if (!text.endsWith('.') && !text.endsWith('?') && !text.endsWith('!')) {
        text += '.';
      }
      return text;
    });

    // Join them
    const paragraph = sentences.join(' ');

    // Add signature
    return paragraph + '\n\n⚡ Summary by Local Client-Side Logic (Fallback)';
  }

  /**
   * Main summarization method
   */
  async summarize(prompts: ScrapedPrompt[]): Promise<SummaryResult> {
    if (prompts.length === 0) {
      throw new Error('No prompts to summarize');
    }

    // 1. Try Gemini Nano (Chrome Built-in AI) if available
    try {
      const ai = (window as any).ai;
      if (ai && ai.languageModel) {
        const capabilities = await ai.languageModel.capabilities();
        if (capabilities.available !== 'no') {
          // Create session
          const session = await ai.languageModel.create();

          // Prepare simple prompt
          const content = prompts.map(p => p.content).join('\n');
          const promptText = `Summarize these prompts into a single, consolidated paragraph. No filler. No intro. Just the action items:\n\n${content}`;

          // Generate
          const result = await session.prompt(promptText);

          return {
            original: prompts,
            summary: result + "\n\n⚡ Summary by Local Gemini Nano (Chrome Built-in)",
            promptCount: { before: prompts.length, after: prompts.length }
          };
        }
      }
    } catch (e) {
      console.warn('[LocalSummarizer] Gemini Nano failed or not available, falling back to logic:', e);
    }

    // 2. Fallback to Smart Logic (Regex)
    try {
      const summary = this.formatSummary(prompts);
      const deduped = this.deduplicatePrompts(prompts);

      return {
        original: prompts,
        summary, // Already includes signature
        promptCount: {
          before: prompts.length,
          after: deduped.length,
        },
      };
    } catch (error) {
      console.error('[LocalSummarizer] Error:', error);
      throw error;
    }
  }
}

// Singleton instance
export const localSummarizer = new LocalSummarizer();
