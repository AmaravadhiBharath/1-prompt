import type { ScrapedPrompt, SummaryResult } from "../types/index";
import { resilientFetch } from "./resilient-api";
import { localSummarizer } from "./local-summarizer";
import { enhancedAISummarizer } from "../config/enhanced-ai-summarizer";
import { dynamicConfigLoader } from "../config/dynamic-loader";

// Cloudflare Worker URL - API keys stored server-side
const BACKEND_URL = "https://1prompt-backend.amaravadhibharath.workers.dev";

export interface SummaryOptions {
  format?: "paragraph" | "points" | "JSON" | "XML";
  tone?: "normal" | "professional" | "creative";
  includeAI?: boolean;
  userId?: string;
  userEmail?: string;
  authToken?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTERPRISE CONSOLIDATION ENGINE - Intent Compilation Protocol v4.0
// ═══════════════════════════════════════════════════════════════════════════════
const CONSOLIDATION_RULES = `[INTENT COMPILATION PROTOCOL v5.1 - ENTERPRISE]

CORE DIRECTIVE: Compile user intent into a single, cohesive paragraph.
PHILOSOPHY: 1-prompt does not summarize conversations. It compiles intent into a unified narrative.

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

═══════════════════════════════════════════════════════════════════════════════
SECTION D: STYLE
═══════════════════════════════════════════════════════════════════════════════

D1. PROFESSIONAL & DIRECT
- Use professional, imperative or descriptive language.
- "The story requires a mouse..." not "You should write a story about a mouse..."

D2. NO META-COMMENTARY
- No "Here is the summary" or "Based on the transcript".
- Just the content.

[END PROTOCOL v5.1]
`;

// ═══════════════════════════════════════════════════════════════════════════════
// DEPRECATED: Client-side filtering (removed - backend now handles it)
// ═══════════════════════════════════════════════════════════════════════════════

// Common filler phrases that don't add unique info
/*
const FILLER_PATTERNS = [
  /^(ok|okay|yes|no|sure|thanks|thank you|got it|alright|right|yep|nope|cool|great|perfect|nice|good|fine|understood)\.?$/i,
  /^(please|pls|plz)$/i,
  /^(hi|hello|hey|hii)\.?$/i,
];
*/

// ═══════════════════════════════════════════════════════════════════════════════
// Client-side filtering helpers (kept for reference)
// The backend (Cloudflare Worker) now handles all filtering
/*
// Normalize text for comparison (lowercase, trim, collapse whitespace)
function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ''); // Remove punctuation for comparison
}

// Calculate simple similarity ratio between two strings
function similarity(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);

  if (normA === normB) return 1;
  if (normA.length === 0 || normB.length === 0) return 0;

  // Check if one contains the other
  if (normA.includes(normB) || normB.includes(normA)) {
    const shorter = Math.min(normA.length, normB.length);
    const longer = Math.max(normA.length, normB.length);
    return shorter / longer;
  }

  // Simple word overlap
  const wordsA = new Set(normA.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(normB.split(' ').filter(w => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  wordsA.forEach(w => { if (wordsB.has(w)) overlap++; });

  return overlap / Math.max(wordsA.size, wordsB.size);
}

// Check if prompt is just filler/acknowledgment
function isFillerOnly(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length > 50) return false; // Long text is not filler
  return FILLER_PATTERNS.some(pattern => pattern.test(trimmed));
}

// Clean and normalize prompt text
function cleanText(text: string): string {
  return text
    .trim()
    .replace(/\n{3,}/g, '\n\n')  // Max 2 newlines
    .replace(/[ \t]+/g, ' ')     // Collapse spaces
    .replace(/^\s*\n/gm, '');    // Remove empty lines
}

interface FilteredPrompt {
  content: string;
  originalIndex: number;
  merged?: number[];  // Indices of prompts merged into this one
}
*/

// Main filtering function
// DEPRECATED: Client-side filtering was breaking the backend
// The backend (Cloudflare Worker) now handles filtering
// Kept below for reference if needed in the future
/*
function filterPrompts(prompts: ScrapedPrompt[]): FilteredPrompt[] {
  if (prompts.length === 0) return [];
  if (prompts.length === 1) {
    return [{ content: cleanText(prompts[0].content), originalIndex: 0 }];
  }

  const result: FilteredPrompt[] = [];
  const seen = new Set<string>();
  const usedIndices = new Set<number>();

  // Pass 1: Remove exact duplicates (keep first occurrence)
  const dedupedWithIndex: { prompt: ScrapedPrompt; index: number }[] = [];

  for (let i = 0; i < prompts.length; i++) {
    const normalized = normalize(prompts[i].content);
    if (!seen.has(normalized) && prompts[i].content.trim().length > 0) {
      seen.add(normalized);
      dedupedWithIndex.push({ prompt: prompts[i], index: i });
    }
  }

  // Pass 2: Remove near-duplicates (>85% similar)
  const uniquePrompts: { prompt: ScrapedPrompt; index: number }[] = [];

  for (const item of dedupedWithIndex) {
    let isDuplicate = false;

    for (const existing of uniquePrompts) {
      if (similarity(item.prompt.content, existing.prompt.content) > 0.85) {
        // Keep the longer one (more info)
        if (item.prompt.content.length > existing.prompt.content.length) {
          const existingIdx = uniquePrompts.indexOf(existing);
          uniquePrompts[existingIdx] = item;
        }
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      uniquePrompts.push(item);
    }
  }

  // Pass 3: Handle fillers - only remove if we have substantial content
  const substantialCount = uniquePrompts.filter(
    p => !isFillerOnly(p.prompt.content) && p.prompt.content.length > 20
  ).length;

  for (const item of uniquePrompts) {
    const isFiller = isFillerOnly(item.prompt.content);

    // Keep fillers only if: very few prompts OR filler has context (like "yes, do that")
    if (isFiller && substantialCount > 3 && item.prompt.content.length < 20) {
      continue; // Skip pure fillers when we have enough content
    }

    if (!usedIndices.has(item.index)) {
      usedIndices.add(item.index);
      result.push({
        content: cleanText(item.prompt.content),
        originalIndex: item.index,
      });
    }
  }

  // Pass 4: Merge consecutive very similar prompts (iterations/refinements)
  const merged: FilteredPrompt[] = [];
  let i = 0;

  while (i < result.length) {
    const current = result[i];
    const mergedIndices = [current.originalIndex];
    let mergedContent = current.content;

    // Look ahead for similar consecutive prompts
    let j = i + 1;
    while (j < result.length) {
      const next = result[j];
      const sim = similarity(current.content, next.content);

      // If very similar but next adds info, merge them
      if (sim > 0.6 && sim < 0.95 && next.content.length > current.content.length * 0.3) {
        // Find the unique parts of next
        const currentWords = new Set(normalize(mergedContent).split(' '));
        const nextWords = normalize(next.content).split(' ');
        const uniqueWords = nextWords.filter(w => !currentWords.has(w) && w.length > 2);

        if (uniqueWords.length > 0) {
          mergedContent = mergedContent + ' [Update: ' + next.content + ']';
          mergedIndices.push(next.originalIndex);
        }
        j++;
      } else {
        break;
      }
    }

    merged.push({
      content: mergedContent,
      originalIndex: current.originalIndex,
      merged: mergedIndices.length > 1 ? mergedIndices : undefined,
    });

    i = j > i + 1 ? j : i + 1;
  }

  console.log(`[Filter] ${prompts.length} → ${merged.length} prompts (${Math.round((1 - merged.length / prompts.length) * 100)}% reduction)`);

  return merged;
}
*/

export class AISummarizer {
  // Cache for AI results to avoid redundant calls
  private cache = new Map<string, SummaryResult>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Summarize extracted prompts using the configured AI provider
   * Now uses the enhanced configuration system for provider flexibility
   */
  async summarize(
    prompts: ScrapedPrompt[],
    options: SummaryOptions = {},
  ): Promise<SummaryResult> {
    if (!prompts || prompts.length === 0) {
      console.log("[AISummarizer] 📝 No prompts to summarize");
      return {
        original: [],
        summary: "",
        promptCount: { before: 0, after: 0 },
      };
    }

    // Generate cache key from prompts content
    const cacheKey = this.generateCacheKey(prompts, options);

    // Check cache
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      console.log("[AISummarizer] 📝 Using cached AI result");
      return cached;
    }

    console.log(
      `[AISummarizer] 📝 Starting AI compilation for ${prompts.length} prompts`,
    );

    try {
      // First, try the enhanced AI summarizer with dynamic configuration and retry
      const result = await this.retryWithBackoff(async () =>
        enhancedAISummarizer.summarize(prompts, {
          format: options.format,
          tone: options.tone,
          includeAI: options.includeAI,
          userId: options.userId,
          userEmail: options.userEmail,
          authToken: options.authToken,
        })
      );

      console.log(
        `[AISummarizer] ✅ Enhanced AI summary completed via ${result.provider || "backend"}`,
      );

      // Cache the result
      this.setCachedResult(cacheKey, result);

      return result;
    } catch (enhancedError) {
      console.warn(
        "[AISummarizer] ⚠️ Enhanced summarizer failed, trying legacy backend...",
        enhancedError,
      );

      // Fallback to legacy backend method with retry
      const result = await this.retryWithBackoff(async () =>
        this.legacySummarize(prompts, options)
      );

      // Cache the result
      this.setCachedResult(cacheKey, result);

      return result;
    }
  }

  /**
   * Legacy backend compilation method (kept for compatibility)
   */
  private async legacySummarize(
    prompts: ScrapedPrompt[],
    options: SummaryOptions = {},
  ): Promise<SummaryResult> {
    try {
      // Send raw prompts to backend - let the server handle filtering
      // The client-side filtering was breaking the backend
      const content = prompts
        .map((p, i) => `${i + 1}. ${p.content}`)
        .join("\n\n");

      console.log(
        `[AISummarizer] ⏱️ Attempting legacy backend at ${BACKEND_URL}`,
      );
      console.log(
        `[AISummarizer] 📝 Sending ${prompts.length} raw prompts (${content.length} chars)`,
      );

      // Use dynamic config instead of hardcoded remote config
      const config = await dynamicConfigLoader.getConfig();
      const provider = config.primary.provider;
      const model = config.primary.model;

      // Use the defined Enterprise Consolidation Protocol
      const promptTemplate = CONSOLIDATION_RULES.replace("[END PROTOCOL v5.1]", "")
        + "\n\nConversation:\n{prompts}\n\nOutput a single, consolidated prompt:";

      const finalPrompt = promptTemplate.replace("{prompts}", content);

      const response = await resilientFetch(BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(options.authToken
            ? { Authorization: `Bearer ${options.authToken}` }
            : {}),
        },
        body: JSON.stringify({
          content: finalPrompt,
          additionalInfo: "", // Not needed since content includes the full prompt
          provider: provider,
          model: model,
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

      console.log(
        `[AISummarizer] 📡 Backend response: ${response.status} ${response.statusText}`,
      );

      if (!response.ok) {
        let errorMsg = `Worker Error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          errorMsg = `${response.status} ${response.statusText}`;
        }
        console.error(`[AISummarizer] ❌ Backend failed: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log(
        `[AISummarizer] ✅ AI Summary received (${data.summary?.length || 0} chars): ${data.summary?.slice(0, 100)}...`,
      );

      if (!data.summary || data.summary.trim().length === 0) {
        console.error("[AISummarizer] ❌ AI returned empty summary");
        throw new Error("AI returned an empty summary.");
      }

      return {
        original: prompts, // Keep original for user display
        summary: data.summary,
        promptCount: {
          before: prompts.length,
          after: prompts.length,
        },
        model: data.model,
        provider: data.provider,
      };
    } catch (error: any) {
      console.error(
        "[AISummarizer] ❌ Cloud AI failed:",
        error?.message || error,
      );
      console.error(
        "[AISummarizer] ⚠️ Falling back to local client-side compilation...",
      );

      // Fallback to local client-side compilation
      try {
        const localResult = await localSummarizer.summarize(prompts);
        console.log(
          "[AISummarizer] ⚙️ Using local summary as fallback (Client-Side)",
        );
        return localResult;
      } catch (localError) {
        console.error(
          "[AISummarizer] ❌ Local compilation also failed:",
          localError,
        );
        // Final fallback: just join prompts
        throw error;
      }
    }
  }

  /**
   * Generate a cache key from prompts and options
   */
  private generateCacheKey(prompts: ScrapedPrompt[], options: SummaryOptions): string {
    const contentHash = prompts
      .map(p => p.content)
      .sort()
      .join('')
      .slice(0, 1000); // Limit to avoid too long keys
    const optionsStr = JSON.stringify({
      format: options.format,
      tone: options.tone,
      includeAI: options.includeAI,
    });
    return btoa(contentHash + optionsStr).slice(0, 100); // Base64 and limit length
  }

  /**
   * Get cached result if valid
   */
  private getCachedResult(key: string): SummaryResult | null {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() < expiry) {
      return this.cache.get(key) || null;
    }
    // Clean up expired entries
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
    return null;
  }

  /**
   * Set cached result with TTL
   */
  private setCachedResult(key: string, result: SummaryResult): void {
    this.cache.set(key, result);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);

    // Limit cache size to prevent memory leaks
    if (this.cache.size > 50) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.cacheExpiry.delete(oldestKey);
      }
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Jitter
          console.log(`[AISummarizer] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

// Singleton instance
export const aiSummarizer = new AISummarizer();

// Initialize (no-op now, kept for compatibility)
export async function initializeAISummarizer(): Promise<void> {
  console.log(
    "[AISummarizer] Using Cloudflare Worker backend with smart filtering",
  );
}
