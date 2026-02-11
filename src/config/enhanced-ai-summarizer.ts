import type { ScrapedPrompt, SummaryResult } from "../types/index";
import { dynamicConfigLoader } from "./dynamic-loader";
import { resilientFetch } from "../services/resilient-api";
import { localSummarizer } from "../services/local-summarizer";
import { config } from "./index";
import { getUserTier, getDailyUsage } from "../services/pricing";

// Consolidation rules v5.1 - Enterprise Grade
const CONSOLIDATION_RULES = `[INTENT COMPILATION PROTOCOL v5.1 - ENTERPRISE]

CORE DIRECTIVE: Compile user intent into a single, cohesive paragraph.
PHILOSOPHY: 1-prompt does not summarize conversations. It compiles intent into a unified narrative.

SECTION A: OUTPUT FORMAT
A1. SINGLE PARAGRAPH ONLY - Output MUST be a single, justified-style paragraph.
A2. NO CATEGORY HEADERS - Do NOT use prefixes like "Story requirement:" or "Output:".
A3. FINAL STATE ONLY - Output the resolved state of all requirements.
A4. PURE INSTRUCTION ONLY - No headers or meta-commentary.

SECTION B: ZERO INFORMATION LOSS
B1. INCLUDE EVERYTHING - Every noun/constraint mentioned ONCE must appear.
B2. COHESIVE NARRATIVE - Weave distinct requirements into the paragraph naturally.

SECTION C: CONFLICT RESOLUTION
C1. LATEST WINS - Latest explicit instruction takes precedence.
C2. SPECIFICITY OVERRIDE - Specific overrides generic.

SECTION D: STYLE
D1. PROFESSIONAL & DIRECT - Use imperative or descriptive language.
D2. NO META-COMMENTARY - No "Here is the summary" or similar.
`;

export interface EnhancedSummaryOptions {
  format?: "paragraph" | "points" | "JSON" | "XML";
  tone?: "normal" | "professional" | "creative";
  includeAI?: boolean;
  userId?: string;
  userEmail?: string;
  authToken?: string;
}

export class EnhancedAISummarizer {
  private static instance: EnhancedAISummarizer;
  private get backendUrl() {
    return `${config.backend.url}/summarize/v5`;
  }

  private constructor() { }

  static getInstance(): EnhancedAISummarizer {
    if (!EnhancedAISummarizer.instance) {
      EnhancedAISummarizer.instance = new EnhancedAISummarizer();
    }
    return EnhancedAISummarizer.instance;
  }

  /**
   * Summarize prompts using the configured AI provider via secure backend
   */
  async summarize(
    prompts: ScrapedPrompt[],
    options: EnhancedSummaryOptions = {},
  ): Promise<SummaryResult> {
    if (!prompts.length) {
      throw new Error("No prompts provided for summarization");
    }

    console.log(
      `[EnhancedAISummarizer] 📝 Starting summarization of ${prompts.length} prompts`,
    );

    try {
      // Get current AI configuration
      const config = await dynamicConfigLoader.getConfig();
      console.log(
        `[EnhancedAISummarizer] 🎯 Using provider via backend: ${config.primary.provider} (${config.primary.model})`,
      );

      // Always use backend mode for security - API keys should stay on server
      return await this.summarizeWithBackend(prompts, options, config);
    } catch (error) {
      console.error("[EnhancedAISummarizer] ❌ Primary method failed:", error);
      console.error("[EnhancedAISummarizer] ❌ Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return await this.fallbackSummarize(prompts, options);
    }
  }

  /**
   * Summarize using backend (secure method where API keys are server-side)
   */
  private async summarizeWithBackend(
    prompts: ScrapedPrompt[],
    options: EnhancedSummaryOptions,
    config: any,
  ): Promise<SummaryResult> {
    console.log(`[EnhancedAISummarizer] 🌐 Requesting summary from backend: ${this.backendUrl}`);
    console.log(`[EnhancedAISummarizer] 📋 Provider: ${config.primary.provider}, Model: ${config.primary.model}`);

    try {
      const content = this.prepareContent(prompts);
      const tier = await getUserTier();
      const usage = await getDailyUsage();

      let provider = config.primary.provider === "auto" ? "gemini" : config.primary.provider;
      let model = config.primary.model || "gemini-1.5-flash";

      // LOGIC: If Go tier (logged-in) and > 10 compiles today, switch to Llama
      if ((tier === "go" || tier === "free") && usage.compiles >= 10) {
        console.log(`[EnhancedAISummarizer] 🔄 Go tier limit reached (${usage.compiles}/10), switching to Llama fallback...`);
        provider = "groq"; // Using groq as the Llama provider
        model = "llama-3.3-70b-versatile";
      }

      console.log(`[EnhancedAISummarizer] 📦 Request payload:`, {
        url: this.backendUrl,
        contentLength: content.length,
        platform: prompts[0]?.platform || "unknown",
        provider,
        model,
      });

      const response = await resilientFetch(this.backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(options.authToken
            ? { Authorization: `Bearer ${options.authToken}` }
            : {}),
        },
        body: JSON.stringify({
          content,
          platform: prompts[0]?.platform || "unknown",
          additionalInfo: CONSOLIDATION_RULES,
          provider,
          model,
          apiKey: config.primary.apiKey, // Extension may pass a user key if needed
          userId: options.userId,
          userEmail: options.userEmail,
          options: {
            format: options.format || "paragraph",
            tone: options.tone || "normal",
            includeAI: options.includeAI || false,
            mode: "consolidate",
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[EnhancedAISummarizer] ❌ Backend error ${response.status}:`, errorData);
        throw new Error(errorData.error || `Backend error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[EnhancedAISummarizer] ✅ Backend response received, provider: ${data.provider}, model: ${data.model}, summary length: ${data.summary?.length}`);
      if (data._debug_gemini) {
        console.warn(`[EnhancedAISummarizer] 🐛 Backend _debug_gemini: ${data._debug_gemini}`);
      }

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
      console.error("[EnhancedAISummarizer] ❌ Backend method failed:", error);
      throw error;
    }
  }

  /**
   * Fallback summarization using local processing (last resort)
   */
  private async fallbackSummarize(
    prompts: ScrapedPrompt[],
    _options: EnhancedSummaryOptions,
  ): Promise<SummaryResult> {
    console.log(
      "[EnhancedAISummarizer] 🔄 Falling back to local client-side summarization",
    );

    try {
      // Direct provider fallback removed for security.
      // Final fallback to local summarization (deterministic logic)
      return await localSummarizer.summarize(prompts);
    } catch (error) {
      console.error(
        "[EnhancedAISummarizer] ❌ All fallback methods failed:",
        error,
      );

      // Absolute final fallback - just join the prompts
      const content = this.prepareContent(prompts);
      return {
        original: prompts,
        summary:
          content.length > 4000 ? content.substring(0, 4000) + "..." : content,
        promptCount: {
          before: prompts.length,
          after: 1,
        },
        provider: "local",
        model: "fallback",
      };
    }
  }

  /**
   * Prepare content from prompts for summarization
   */
  private prepareContent(prompts: ScrapedPrompt[]): string {
    // Simple approach: just provide the conversation as-is
    // The AI prompt template will handle the summarization
    return prompts.map((p, i) => `${i + 1}. ${p.content.trim()}`).join("\n\n");
  }



  /**
   * Get current configuration info for debugging
   */
  async getConfigInfo(): Promise<any> {
    try {
      const config = await dynamicConfigLoader.getConfig();
      return {
        primary: config.primary,
        fallbacks: config.fallbacks.map((f) => ({
          provider: f.provider,
          model: f.model,
        })),
        settings: config.settings,
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
  }
}

// Export singleton instance
export const enhancedAISummarizer = EnhancedAISummarizer.getInstance();

// Backward compatibility export
export const aiSummarizer = enhancedAISummarizer;
