import { config } from "../config";

/**
 * Valid selector strategy format from backend
 */
export interface SelectorStrategy {
  promptSelectors?: string[];
  excludeSelectors?: string[];
  containerSelector?: string;
  childSelector?: string;
  minContentLength?: number;
}

export interface SelectorRegistry {
  platforms: Record<string, SelectorStrategy>;
  lastUpdated: number;
}

const CACHE_KEY = "prompt_extractor_selectors";
const CACHE_TTL = 3600 * 1000; // 1 hour

/**
 * Service to fetch and cache dynamic scraping selectors from backend
 */
class SelectorRegistryService {
  private registry: SelectorRegistry | null = null;

  /**
   * Get selectors for a specific platform hostname
   */
  async getSelectors(hostname: string): Promise<SelectorStrategy | null> {
    const registry = await this.getRegistry();

    // Check for exact match
    if (registry.platforms[hostname]) {
      return registry.platforms[hostname];
    }

    // Check for flexible match (e.g. chatgpt.com matching www.chatgpt.com)
    for (const key of Object.keys(registry.platforms)) {
      if (hostname.includes(key) || key.includes(hostname)) {
        return registry.platforms[key];
      }
    }

    return null;
  }

  /**
   * Get entire registry (with caching)
   */
  async getRegistry(): Promise<SelectorRegistry> {
    // 1. Return in-memory cache if valid
    if (this.registry && Date.now() - this.registry.lastUpdated < CACHE_TTL) {
      return this.registry;
    }

    // 2. Try Local Storage
    const cached = await this.loadFromStorage();
    if (cached && Date.now() - cached.lastUpdated < CACHE_TTL) {
      this.registry = cached;
      // Refresh background asynchronously if getting stale
      if (Date.now() - cached.lastUpdated > CACHE_TTL * 0.5) {
        this.fetchFromBackend().catch((err) =>
          console.warn("[SelectorRegistry] Background refresh failed", err),
        );
      }
      return cached;
    }

    // 3. Fetch from Backend
    try {
      const fresh = await this.fetchFromBackend();
      this.registry = fresh;
      return fresh;
    } catch (e) {
      console.warn("[SelectorRegistry] Fetch failed, using cache/fallback", e);
      return cached || this.formattedBundledDefaults();
    }
  }

  private async fetchFromBackend(): Promise<SelectorRegistry> {
    // Determine backend URL
    const backendUrl =
      config.backend.url ||
      "https://1-prompt-backend.amaravadhibharath.workers.dev";

    const response = await fetch(`${backendUrl}/config/selectors`);
    if (!response.ok) {
      throw new Error(`Failed to fetch selectors: ${response.status}`);
    }

    const data = await response.json();
    const registry: SelectorRegistry = {
      platforms: data.config.platforms,
      lastUpdated: Date.now(),
    };

    await this.saveToStorage(registry);
    return registry;
  }

  private async loadFromStorage(): Promise<SelectorRegistry | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(CACHE_KEY, (result) => {
        resolve((result[CACHE_KEY] as SelectorRegistry) || null);
      });
    });
  }

  private async saveToStorage(registry: SelectorRegistry): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [CACHE_KEY]: registry }, resolve);
    });
  }

  /**
   * Client-side hardcoded defaults (Fallback)
   * Matching the backend's default structure
   */
  private formattedBundledDefaults(): SelectorRegistry {
    return {
      lastUpdated: Date.now(),
      platforms: {
        "chatgpt.com": {
          promptSelectors: [
            ".whitespace-pre-wrap",
            "div[data-message-author-role='user']",
            "article div.flex-col.gap-1",
          ],
          excludeSelectors: [".sr-only", "button", "svg"],
        },
        "claude.ai": {
          promptSelectors: [
            ".font-user-message",
            "div[data-test-id='user-message']",
          ],
          excludeSelectors: [],
        },
        "deepseek.com": {
          promptSelectors: [".ds-user-message", ".message-user"],
          excludeSelectors: [],
        },
      },
    };
  }
}

export const selectorRegistry = new SelectorRegistryService();
