/**
 * Platform-specific scroll configuration for extraction
 * Each platform has different virtual scrolling behavior and DOM characteristics
 *
 * TWO MODES:
 * - SLOW: Thorough extraction, more wait times, guaranteed to get all prompts
 * - FAST: Quick extraction, may miss some prompts on heavy virtual scrolling sites
 */

export interface ScrollConfig {
  topAttempts: number; // How many times to scroll to top
  bottomAttempts: number; // How many times to scroll to bottom
  waitPerScroll: number; // MS to wait after each scroll for DOM to render
  stabilityChecks: number; // Consecutive stable height checks before breaking
  parallelWait: number; // MS to wait before parallel position extraction
  name: string;
}

export type ScrollMode = "slow" | "fast";

/**
 * SLOW CONFIG: Thorough extraction - takes longer but gets all prompts
 * Use for platforms with aggressive virtual scrolling
 */
export const SLOW_CONFIG: Record<string, ScrollConfig> = {
  lovable: {
    name: "Lovable",
    topAttempts: 70,
    bottomAttempts: 70,
    waitPerScroll: 600,
    stabilityChecks: 6,
    parallelWait: 1200,
  },
  chatgpt: {
    name: "ChatGPT",
    topAttempts: 40,
    bottomAttempts: 40,
    waitPerScroll: 400,
    stabilityChecks: 4,
    parallelWait: 800,
  },
  claude: {
    name: "Claude",
    topAttempts: 40,
    bottomAttempts: 40,
    waitPerScroll: 400,
    stabilityChecks: 4,
    parallelWait: 800,
  },
  gemini: {
    name: "Gemini",
    topAttempts: 35,
    bottomAttempts: 35,
    waitPerScroll: 350,
    stabilityChecks: 4,
    parallelWait: 750,
  },
  perplexity: {
    name: "Perplexity",
    topAttempts: 35,
    bottomAttempts: 35,
    waitPerScroll: 350,
    stabilityChecks: 4,
    parallelWait: 750,
  },
  deepseek: {
    name: "DeepSeek",
    topAttempts: 30,
    bottomAttempts: 30,
    waitPerScroll: 300,
    stabilityChecks: 3,
    parallelWait: 600,
  },
  bolt: {
    name: "Bolt.new",
    topAttempts: 30,
    bottomAttempts: 30,
    waitPerScroll: 300,
    stabilityChecks: 3,
    parallelWait: 600,
  },
  cursor: {
    name: "Cursor",
    topAttempts: 30,
    bottomAttempts: 30,
    waitPerScroll: 300,
    stabilityChecks: 3,
    parallelWait: 600,
  },
  "meta-ai": {
    name: "Meta AI",
    topAttempts: 25,
    bottomAttempts: 25,
    waitPerScroll: 250,
    stabilityChecks: 3,
    parallelWait: 500,
  },
};

/**
 * FAST CONFIG: Quick extraction - faster but may miss prompts on some sites
 * Use for platforms with lighter virtual scrolling
 */
export const FAST_CONFIG: Record<string, ScrollConfig> = {
  lovable: {
    name: "Lovable",
    topAttempts: 50,
    bottomAttempts: 50,
    waitPerScroll: 200,
    stabilityChecks: 2,
    parallelWait: 300,
  },
  chatgpt: {
    name: "ChatGPT",
    topAttempts: 30,
    bottomAttempts: 30,
    waitPerScroll: 150,
    stabilityChecks: 2,
    parallelWait: 250,
  },
  claude: {
    name: "Claude",
    topAttempts: 30,
    bottomAttempts: 30,
    waitPerScroll: 150,
    stabilityChecks: 2,
    parallelWait: 250,
  },
  gemini: {
    name: "Gemini",
    topAttempts: 25,
    bottomAttempts: 25,
    waitPerScroll: 120,
    stabilityChecks: 2,
    parallelWait: 200,
  },
  perplexity: {
    name: "Perplexity",
    topAttempts: 25,
    bottomAttempts: 25,
    waitPerScroll: 120,
    stabilityChecks: 2,
    parallelWait: 200,
  },
  deepseek: {
    name: "DeepSeek",
    topAttempts: 20,
    bottomAttempts: 20,
    waitPerScroll: 100,
    stabilityChecks: 2,
    parallelWait: 150,
  },
  bolt: {
    name: "Bolt.new",
    topAttempts: 20,
    bottomAttempts: 20,
    waitPerScroll: 100,
    stabilityChecks: 2,
    parallelWait: 150,
  },
  cursor: {
    name: "Cursor",
    topAttempts: 20,
    bottomAttempts: 20,
    waitPerScroll: 100,
    stabilityChecks: 2,
    parallelWait: 150,
  },
  "meta-ai": {
    name: "Meta AI",
    topAttempts: 15,
    bottomAttempts: 15,
    waitPerScroll: 80,
    stabilityChecks: 2,
    parallelWait: 150,
  },
};

/**
 * PLATFORM MODE ASSIGNMENT
 * Set which mode each platform should use
 * Update this after testing each site
 */
export const PLATFORM_MODE: Record<string, ScrollMode> = {
  lovable: "slow", // Tested: SLOW works, FAST misses prompts
  chatgpt: "fast", // TODO: Test and update
  claude: "fast", // TODO: Test and update
  gemini: "fast", // TODO: Test and update
  perplexity: "fast", // TODO: Test and update
  deepseek: "fast", // TODO: Test and update
  bolt: "fast", // TODO: Test and update
  cursor: "fast", // TODO: Test and update
  "meta-ai": "fast", // TODO: Test and update
};

/**
 * Get scroll configuration for a specific platform
 * Uses the assigned mode (slow/fast) for that platform
 */
export function getScrollConfig(platformName: string | null): ScrollConfig {
  const name = platformName || "generic";
  const normalizedName = name.toLowerCase().replace(/\s+/g, "-");

  // Get the mode for this platform (default to fast)
  const mode = PLATFORM_MODE[normalizedName] || "fast";
  const configSet = mode === "slow" ? SLOW_CONFIG : FAST_CONFIG;

  const config = configSet[normalizedName] || configSet[platformName || ""];

  if (config) {
    console.log(
      `[1-prompt] Platform: ${config.name} (${mode.toUpperCase()} mode)`,
    );
    return config;
  }

  // Fast defaults for unknown platforms
  console.log(`[1-prompt] Platform: ${name} (FAST mode - default)`);
  return {
    name: name,
    topAttempts: 15,
    bottomAttempts: 15,
    waitPerScroll: 100,
    stabilityChecks: 2,
    parallelWait: 150,
  };
}

/**
 * Configuration tier lookup
 * Helps understand which extraction strategy is being used
 */
export function getConfigTier(platformName: string | null): string {
  const config = getScrollConfig(platformName);

  if (config.topAttempts >= 40) {
    return "TIER 1 (Slow/Thorough)";
  } else if (config.topAttempts >= 25) {
    return "TIER 2 (Moderate)";
  } else {
    return "TIER 3 (Fast)";
  }
}

/**
 * Get the mode for a platform
 */
export function getPlatformMode(platformName: string | null): ScrollMode {
  const name = platformName || "generic";
  const normalizedName = name.toLowerCase().replace(/\s+/g, "-");
  return PLATFORM_MODE[normalizedName] || "fast";
}
