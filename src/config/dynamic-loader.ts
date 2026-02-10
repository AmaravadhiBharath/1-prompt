/**
 * Dynamic AI Configuration Loader
 * Supports loading from multiple sources: Environment, Remote Config, Local Storage
 * Enables changing AI providers without code deployment
 */

import type { AIConfiguration, AIProvider } from "./ai-config";
import {
  DEFAULT_AI_CONFIG,
  loadAIConfiguration,
  validateAIConfig,
} from "./ai-config";
import { resilientFetch } from "../services/resilient-api";

export interface ConfigSource {
  name: string;
  priority: number;
  load: () => Promise<Partial<AIConfiguration> | null>;
}

export class DynamicConfigLoader {
  private static instance: DynamicConfigLoader;
  private config: AIConfiguration = DEFAULT_AI_CONFIG;
  private sources: ConfigSource[] = [];
  private lastUpdate: number = 0;
  private updateInterval: number = 5 * 60 * 1000; // 5 minutes
  private isLoading: boolean = false;

  private constructor() {
    this.initializeSources();
  }

  static getInstance(): DynamicConfigLoader {
    if (!DynamicConfigLoader.instance) {
      DynamicConfigLoader.instance = new DynamicConfigLoader();
    }
    return DynamicConfigLoader.instance;
  }

  /**
   * Initialize configuration sources in priority order
   */
  private initializeSources(): void {
    this.sources = [
      {
        name: "environment",
        priority: 1,
        load: this.loadFromEnvironment.bind(this),
      },
      {
        name: "remote-admin",
        priority: 2,
        load: this.loadFromRemoteAdmin.bind(this),
      },
      {
        name: "remote-config",
        priority: 3,
        load: this.loadFromRemoteConfig.bind(this),
      },
      {
        name: "runtime-config",
        priority: 2.5, // Higher than remote-config, lower than admin
        load: this.loadFromRuntimeConfig.bind(this),
      },
      {
        name: "local-storage",
        priority: 4,
        load: this.loadFromLocalStorage.bind(this),
      },
    ];

    // Sort by priority (lower number = higher priority)
    this.sources.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get current AI configuration
   */
  async getConfig(): Promise<AIConfiguration> {
    const now = Date.now();
    if (now - this.lastUpdate > this.updateInterval) {
      await this.refreshConfig();
    }
    return this.config;
  }

  /**
   * Force refresh configuration from all sources
   */
  async refreshConfig(): Promise<void> {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    console.log("[DynamicConfigLoader] 🔄 Refreshing AI configuration...");

    try {
      let finalConfig = { ...DEFAULT_AI_CONFIG };

      // Load from all sources in reverse priority order (lowest priority first)
      for (const source of [...this.sources].reverse()) {
        try {
          const sourceConfig = await source.load();
          if (sourceConfig) {
            finalConfig = this.mergeConfigs(finalConfig, sourceConfig);
            console.log(
              `[DynamicConfigLoader] ✅ Loaded config from ${source.name}`,
            );
          }
        } catch (error) {
          console.warn(
            `[DynamicConfigLoader] ⚠️ Failed to load from ${source.name}:`,
            error,
          );
        }
      }

      // Validate the final configuration
      const validation = validateAIConfig(finalConfig);
      if (!validation.valid) {
        console.error(
          "[DynamicConfigLoader] ❌ Invalid configuration:",
          validation.errors,
        );
        console.log(
          "[DynamicConfigLoader] 🔧 Using default configuration as fallback",
        );
        finalConfig = DEFAULT_AI_CONFIG;
      }

      this.config = finalConfig;
      this.lastUpdate = Date.now();

      console.log(
        `[DynamicConfigLoader] 🎯 Using provider: ${this.config.primary.provider} (${this.config.primary.model})`,
      );

      // Cache the valid config in local storage for next time
      await this.saveToLocalStorage(this.config);
    } catch (error) {
      console.error(
        "[DynamicConfigLoader] ❌ Failed to refresh config:",
        error,
      );
      // Keep using existing config
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load configuration from environment variables
   */
  private async loadFromEnvironment(): Promise<Partial<AIConfiguration> | null> {
    try {
      const envConfig = loadAIConfiguration();

      // Only return non-default values
      if (
        envConfig.primary.provider !== DEFAULT_AI_CONFIG.primary.provider ||
        envConfig.primary.apiKey ||
        envConfig.primary.model !== DEFAULT_AI_CONFIG.primary.model
      ) {
        return envConfig;
      }

      return null;
    } catch (error) {
      console.warn(
        "[DynamicConfigLoader] Environment config load failed:",
        error,
      );
      return null;
    }
  }

  /**
   * Load configuration from remote admin endpoint
   * This allows real-time changes via admin panel
   */
  private async loadFromRemoteAdmin(): Promise<Partial<AIConfiguration> | null> {
    try {
      const adminUrl = this.getAdminConfigUrl();
      if (!adminUrl) {
        return null;
      }

      const response = await resilientFetch(adminUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Note: timeout handled by resilientFetch internally
      });

      if (!response.ok) {
        return null;
      }

      const remoteConfig = await response.json();
      console.log("[DynamicConfigLoader] 📡 Remote admin config loaded");
      return remoteConfig;
    } catch (error) {
      // Silent fail for admin config - it's optional
      return null;
    }
  }

  /**
   * Load configuration from runtime config service (Backend Runtime Config)
   */
  private async loadFromRuntimeConfig(): Promise<Partial<AIConfiguration> | null> {
    try {
      const { config } = await import("./index");
      await config.load();

      const runtimeAi = config.ai;

      if (runtimeAi && runtimeAi.defaultProvider !== "auto") {
        return {
          primary: {
            provider: runtimeAi.defaultProvider as any,
            model: runtimeAi.model,
          },
        };
      }

      return null;
    } catch (error) {
      console.warn("[DynamicConfigLoader] Runtime config load failed:", error);
      return null;
    }
  }

  /**
   * Load configuration from remote config service (GitHub, CDN, etc.)
   */
  private async loadFromRemoteConfig(): Promise<Partial<AIConfiguration> | null> {
    try {
      // Use the existing remote config system
      const remoteConfigService = (
        await import("../services/remote-config")
      ).RemoteConfigService.getInstance();
      const aiConfig = remoteConfigService.getAIConfig();

      if (aiConfig && aiConfig.defaultProvider !== "auto") {
        return {
          primary: {
            provider: aiConfig.defaultProvider,
            model: aiConfig.model,
          },
        };
      }

      return null;
    } catch (error) {
      console.warn("[DynamicConfigLoader] Remote config load failed:", error);
      return null;
    }
  }

  /**
   * Load configuration from Chrome local storage
   */
  private async loadFromLocalStorage(): Promise<Partial<AIConfiguration> | null> {
    try {
      const result = await chrome.storage.local.get(["ai_configuration_cache"]);
      if (result.ai_configuration_cache) {
        const cached = JSON.parse(result.ai_configuration_cache);

        // Check if cache is not too old (24 hours)
        const maxAge = 24 * 60 * 60 * 1000;
        if (cached.timestamp && Date.now() - cached.timestamp < maxAge) {
          return cached.config;
        }
      }

      return null;
    } catch (error) {
      console.warn("[DynamicConfigLoader] Local storage load failed:", error);
      return null;
    }
  }

  /**
   * Save configuration to local storage as cache
   */
  private async saveToLocalStorage(config: AIConfiguration): Promise<void> {
    try {
      const cacheData = {
        config,
        timestamp: Date.now(),
      };

      await chrome.storage.local.set({
        ai_configuration_cache: JSON.stringify(cacheData),
      });
    } catch (error) {
      console.warn(
        "[DynamicConfigLoader] Failed to save to local storage:",
        error,
      );
    }
  }

  /**
   * Get admin config URL from environment or hardcoded
   */
  private getAdminConfigUrl(): string | null {
    // Try Chrome storage for admin-configured URL
    try {
      chrome.storage.sync.get(["ai_admin_config_url"], (result) => {
        return result.ai_admin_config_url || null;
      });
    } catch {
      // Ignore if Chrome APIs not available
    }

    // Fallback to hardcoded admin endpoint (you can change this)
    return "https://1prompt-backend.amaravadhibharath.workers.dev/admin/ai-config";
  }

  /**
   * Deep merge configurations
   */
  private mergeConfigs(
    base: AIConfiguration,
    override: Partial<AIConfiguration>,
  ): AIConfiguration {
    return {
      primary: { ...base.primary, ...override.primary },
      fallbacks: override.fallbacks || base.fallbacks,
      settings: { ...base.settings, ...override.settings },
      environments: base.environments, // Don't merge environments from remote
    };
  }

  /**
   * Update AI provider configuration remotely (for admin use)
   */
  async updateProvider(
    provider: AIProvider,
    model?: string,
    apiKey?: string,
  ): Promise<boolean> {
    try {
      const newConfig: Partial<AIConfiguration> = {
        primary: {
          ...this.config.primary,
          provider,
          model: model || this.config.primary.model,
          apiKey: apiKey || this.config.primary.apiKey,
        },
      };

      // Validate before applying
      const testConfig = this.mergeConfigs(this.config, newConfig);
      const validation = validateAIConfig(testConfig);

      if (!validation.valid) {
        console.error(
          "[DynamicConfigLoader] ❌ Invalid provider update:",
          validation.errors,
        );
        return false;
      }

      // Apply the change
      this.config = testConfig;
      await this.saveToLocalStorage(this.config);

      console.log(
        `[DynamicConfigLoader] ✅ Provider updated to ${provider} (${model || "default model"})`,
      );
      return true;
    } catch (error) {
      console.error(
        "[DynamicConfigLoader] ❌ Failed to update provider:",
        error,
      );
      return false;
    }
  }

  /**
   * Get current provider info for debugging
   */
  getCurrentProviderInfo(): {
    provider: AIProvider;
    model?: string;
    source: string;
  } {
    return {
      provider: this.config.primary.provider,
      model: this.config.primary.model,
      source: "dynamic", // Could track which source provided the config
    };
  }
}

// Singleton export
export const dynamicConfigLoader = DynamicConfigLoader.getInstance();
