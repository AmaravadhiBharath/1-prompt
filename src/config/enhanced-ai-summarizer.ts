/**
 * Enhanced AI Summarizer with Dynamic Provider Support
 * Uses the new configuration system to support multiple AI providers
 * without requiring code changes for provider switching
 */

import type { ScrapedPrompt, SummaryResult } from '../types/index';
import type { AIRequest, ChatMessage, AIResponse } from './ai-providers';
import { AIProviderFactory } from './ai-providers';
import { dynamicConfigLoader } from './dynamic-loader';
import { resilientFetch } from '../services/resilient-api';
import { localSummarizer } from '../services/local-summarizer';

// Consolidation rules for AI providers
const CONSOLIDATION_RULES = `[INTENT COMPILATION PROTOCOL v5.1 - ENTERPRISE]

CORE DIRECTIVE: Compile user intent into a single, cohesive paragraph.
PHILOSOPHY: 1prompt does not summarize conversations. It compiles intent into a unified narrative.

═══════════════════════════════════════════════════════════════════════════════
SECTION A: OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

A1. SINGLE PARAGRAPH ONLY
- Output MUST be a single, justified-style paragraph.
- No bullet points, no numbered lists, no newlines within the text.
- Merge all requirements into a continuous flow.

A2. NO CATEGORY HEADERS
- Do NOT use prefixes like "Story requirement:", "Color elements:", "Output:", "Request:".
- Start sentences directly with the subject.
- ✗ "Story requirement: A story about a cat."
- ✓ "Create a story about a cat..."

A3. FINAL STATE ONLY
- Output the resolved state of all requirements
- No temporal language: "initially", "later", "then", "changed to"
- No conversation narration
- ✗ "User first wanted blue, then green"
- ✓ "The design should use green coloring."

A4. PURE INSTRUCTION ONLY (OUTPUT-ONLY)
- No headers like "Project Specification" or "Summary"
- No intro sentences like "The project entails..." or "The user wants..."
- Start directly with the commands.

A10. NO INTENT FALLBACK
- If no actionable instruction exists after processing, prepend [unprocessed: no actionable intent detected] and preserve raw input verbatim.

═══════════════════════════════════════════════════════════════════════════════
SECTION B: ZERO INFORMATION LOSS
═══════════════════════════════════════════════════════════════════════════════

B1. INCLUDE EVERYTHING
- Every noun, constraint, requirement mentioned ONCE must appear
- Single mentions are equally important as repeated ones

B2. COHESIVE NARRATIVE
- Weave distinct requirements into the paragraph naturally.
- Instead of "Colors: red, blue.", use "The visual elements should incorporate red and blue colors."

B3. DEDUPLICATION WITHOUT LOSS
- Identical statements → merge into ONE complete version

═══════════════════════════════════════════════════════════════════════════════
SECTION C: CONFLICT RESOLUTION
═══════════════════════════════════════════════════════════════════════════════

C1. LATEST WINS (OVERRIDE SUPREMACY)
- Latest explicit instruction takes precedence.
- Remove earlier conflicting instruction completely.
- Do not reference discarded states.

C2. SPECIFICITY OVERRIDE
- Specific overrides generic.
- "Make colorful" → "Use blue and white only" = "Use blue and white only."

[END PROTOCOL v5.1]`;

export interface EnhancedSummaryOptions {
  format?: 'paragraph' | 'points' | 'JSON' | 'XML';
  tone?: 'normal' | 'professional' | 'creative';
  includeAI?: boolean;
  userId?: string;
  userEmail?: string;
  authToken?: string;
  useDirectProvider?: boolean; // If true, bypass backend and use provider directly
}

export class EnhancedAISummarizer {
  private static instance: EnhancedAISummarizer;
  private backendUrl = 'https://1prompt-backend.amaravadhibharath.workers.dev';

  private constructor() { }

  static getInstance(): EnhancedAISummarizer {
    if (!EnhancedAISummarizer.instance) {
      EnhancedAISummarizer.instance = new EnhancedAISummarizer();
    }
    return EnhancedAISummarizer.instance;
  }

  /**
   * Summarize prompts using the configured AI provider
   */
  async summarize(prompts: ScrapedPrompt[], options: EnhancedSummaryOptions = {}): Promise<SummaryResult> {
    if (!prompts.length) {
      throw new Error('No prompts provided for summarization');
    }

    console.log(`[EnhancedAISummarizer] 📝 Starting summarization of ${prompts.length} prompts`);

    try {
      // Get current AI configuration
      const config = await dynamicConfigLoader.getConfig();
      console.log(`[EnhancedAISummarizer] 🎯 Using provider: ${config.primary.provider} (${config.primary.model})`);

      // Decide whether to use backend or direct provider
      // If 'auto' is selected, we prefer the high-reliability Backend
      const useDirectProvider = options.useDirectProvider ||
        (config.primary.provider !== 'auto' && config.settings.autoFallback);

      if (useDirectProvider && config.primary.apiKey) {
        try {
          return await this.summarizeWithDirectProvider(prompts, options, config);
        } catch (e) {
          console.warn('[EnhancedAISummarizer] Direct provider failed, trying backend...', e);
          return await this.summarizeWithBackend(prompts, options, config);
        }
      } else {
        return await this.summarizeWithBackend(prompts, options, config);
      }

    } catch (error) {
      console.error('[EnhancedAISummarizer] ❌ Primary method failed:', error);
      return await this.fallbackSummarize(prompts, options);
    }
  }

  /**
   * Summarize using direct provider connection (client-side)
   */
  private async summarizeWithDirectProvider(
    prompts: ScrapedPrompt[],
    _options: EnhancedSummaryOptions,
    config: any
  ): Promise<SummaryResult> {
    console.log('[EnhancedAISummarizer] 🔧 Using direct provider mode');

    try {
      // Get the appropriate provider
      const provider = await AIProviderFactory.getProvider(config.primary.provider, config.primary);

      // Prepare the content for summarization
      const content = this.prepareContent(prompts);

      // Create the AI request
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: CONSOLIDATION_RULES,
        },
        {
          role: 'user',
          content: `Please consolidate these user prompts into a single, cohesive paragraph:\n\n${content}`,
        },
      ];

      const aiRequest: AIRequest = {
        messages,
        temperature: config.primary.temperature || 0.3,
        maxTokens: config.primary.maxTokens || 4000,
      };

      // Make the request
      const response: AIResponse = await provider.chat(aiRequest);

      console.log(`[EnhancedAISummarizer] ✅ Direct provider summary received (${response.content.length} chars)`);

      return {
        original: prompts,
        summary: response.content.trim(),
        promptCount: {
          before: prompts.length,
          after: prompts.length,
        },
        provider: response.provider,
        model: response.model,
        usage: response.usage,
      };

    } catch (error) {
      console.error('[EnhancedAISummarizer] ❌ Direct provider failed:', error);
      throw error;
    }
  }

  /**
   * Summarize using backend (existing method with enhanced config)
   */
  private async summarizeWithBackend(
    prompts: ScrapedPrompt[],
    options: EnhancedSummaryOptions,
    config: any
  ): Promise<SummaryResult> {
    console.log('[EnhancedAISummarizer] 🌐 Using backend mode');

    try {
      const content = this.prepareContent(prompts);

      const response = await resilientFetch(this.backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}),
        },
        body: JSON.stringify({
          content,
          additionalInfo: CONSOLIDATION_RULES,
          provider: config.primary.provider,
          model: config.primary.model,
          apiKey: config.primary.apiKey,
          userId: options.userId,
          userEmail: options.userEmail,
          options: {
            format: options.format || 'paragraph',
            tone: options.tone || 'normal',
            includeAI: options.includeAI || false,
            mode: 'consolidate',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Backend error: ${response.status}`);
      }

      const data = await response.json();

      return {
        original: prompts,
        summary: data.summary,
        promptCount: {
          before: prompts.length,
          after: prompts.length,
        },
        provider: data.provider || config.primary.provider,
        model: data.model || config.primary.model,
      };

    } catch (error) {
      console.error('[EnhancedAISummarizer] ❌ Backend method failed:', error);
      throw error;
    }
  }

  /**
   * Fallback summarization using local processing
   */
  private async fallbackSummarize(prompts: ScrapedPrompt[], options: EnhancedSummaryOptions): Promise<SummaryResult> {
    console.log('[EnhancedAISummarizer] 🔄 Falling back to local summarization');

    try {
      const config = await dynamicConfigLoader.getConfig();

      // Try fallback providers first
      for (const fallbackConfig of config.fallbacks) {
        try {
          const provider = await AIProviderFactory.getProvider(fallbackConfig.provider, fallbackConfig);

          if (await provider.isAvailable()) {
            console.log(`[EnhancedAISummarizer] 🔄 Trying fallback provider: ${fallbackConfig.provider}`);
            return await this.summarizeWithDirectProvider(prompts, options, { primary: fallbackConfig });
          }
        } catch (error) {
          console.warn(`[EnhancedAISummarizer] Fallback provider ${fallbackConfig.provider} failed:`, error);
        }
      }

      // Final fallback to local summarization
      return await localSummarizer.summarize(prompts);

    } catch (error) {
      console.error('[EnhancedAISummarizer] ❌ All fallback methods failed:', error);

      // Absolute final fallback - just join the prompts
      const content = this.prepareContent(prompts);
      return {
        original: prompts,
        summary: content.length > 4000 ? content.substring(0, 4000) + '...' : content,
        promptCount: {
          before: prompts.length,
          after: 1,
        },
        provider: 'local',
        model: 'fallback',
      };
    }
  }

  /**
   * Prepare content from prompts for summarization
   */
  private prepareContent(prompts: ScrapedPrompt[]): string {
    return prompts
      .map((p, i) => `${i + 1}. ${p.content.trim()}`)
      .join('\n\n');
  }

  /**
   * Test connectivity to configured provider
   */
  async testProvider(): Promise<{ success: boolean; provider: string; error?: string }> {
    try {
      const config = await dynamicConfigLoader.getConfig();
      const provider = await AIProviderFactory.getProvider(config.primary.provider, config.primary);

      const isAvailable = await provider.isAvailable();

      if (isAvailable) {
        return {
          success: true,
          provider: `${config.primary.provider} (${config.primary.model})`,
        };
      } else {
        return {
          success: false,
          provider: `${config.primary.provider} (${config.primary.model})`,
          error: 'Provider is not available',
        };
      }
    } catch (error) {
      return {
        success: false,
        provider: 'unknown',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get current configuration info for debugging
   */
  async getConfigInfo(): Promise<any> {
    try {
      const config = await dynamicConfigLoader.getConfig();
      return {
        primary: config.primary,
        fallbacks: config.fallbacks.map(f => ({ provider: f.provider, model: f.model })),
        settings: config.settings,
        lastUpdate: dynamicConfigLoader['lastUpdate'],
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Force refresh configuration
   */
  async refreshConfiguration(): Promise<void> {
    await dynamicConfigLoader.refreshConfig();
    AIProviderFactory.clearCache(); // Clear cached providers to use new config
  }
}

// Export singleton instance
export const enhancedAISummarizer = EnhancedAISummarizer.getInstance();

// Backward compatibility export
export const aiSummarizer = enhancedAISummarizer;