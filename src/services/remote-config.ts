interface SelectorConfig {
  userSelectors?: string[];
  buttonSelectors?: string[];
  inputSelectors?: string[];
}

export interface RemoteConfig {
  version: number;
  platforms: Record<string, SelectorConfig>;
  aiConfig?: {
    defaultProvider: "auto" | "openai" | "anthropic" | "gemini";
    model?: string;
  };
}

// Default hardcoded configuration (fallback)
const DEFAULT_CONFIG: RemoteConfig = {
  version: 1,
  platforms: {
    chatgpt: {
      userSelectors: ['[data-message-author-role="user"]', ".user-message"],
      buttonSelectors: ['button[data-testid="send-button"]'],
      inputSelectors: ["#prompt-textarea"],
    },
    claude: {
      userSelectors: [".font-user-message", '[data-test-id="user-message"]'],
      buttonSelectors: ['button[aria-label="Send Message"]'],
      inputSelectors: ['div[contenteditable="true"]'],
    },
    // Add other platforms as needed
  },
  aiConfig: {
    defaultProvider: "auto",
  },
};

export const STORAGE_KEY = "remote_selector_config";
export const REMOTE_URL =
  "https://raw.githubusercontent.com/bharathamaravadi/sauce-config/main/selectors.json"; // Replace with your actual URL
export const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const LAST_FETCH_KEY = "remote_config_last_fetch";

export class RemoteConfigService {
  private static instance: RemoteConfigService;
  private config: RemoteConfig = DEFAULT_CONFIG;

  private constructor() {}

  static getInstance(): RemoteConfigService {
    if (!RemoteConfigService.instance) {
      RemoteConfigService.instance = new RemoteConfigService();
    }
    return RemoteConfigService.instance;
  }

  async initialize(): Promise<void> {
    // 1. Load from local storage first (fast)
    const stored = await chrome.storage.local.get([
      STORAGE_KEY,
      LAST_FETCH_KEY,
    ]);
    if (stored[STORAGE_KEY]) {
      this.config = { ...DEFAULT_CONFIG, ...stored[STORAGE_KEY] };
    }
  }

  // Removed fetchUpdates to prevent bundling Firebase in content scripts
  // Updates are now handled by the background script via remote-config-fetcher.ts

  getSelectors(platform: string): SelectorConfig | null {
    return this.config.platforms[platform] || null;
  }

  getAIConfig() {
    return this.config.aiConfig || DEFAULT_CONFIG.aiConfig!;
  }
}
