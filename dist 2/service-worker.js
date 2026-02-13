const BUNDLED_CONFIG = {
  backend: {
    url: "https://1prompt-backend.amaravadhibharath.workers.dev"
  },
  features: {
    telemetryEnabled: true,
    remoteSelectorEnabled: true
  },
  analytics: {
    posthogKey: "",
    posthogHost: "https://us.i.posthog.com"
  },
  email: {
    resendKey: ""
  },
  ai: {
    defaultProvider: "gemini",
    model: "gemini-2.0-flash"
  }
};
class ConfigService {
  config = BUNDLED_CONFIG;
  loaded = false;
  async load() {
    if (this.loaded) return this.config;
    try {
      const response = await fetch(
        `${BUNDLED_CONFIG.backend.url}/config/runtime`
      );
      if (response.ok) {
        const data = await response.json();
        const remoteConfig = data.config;
        this.config = this.mergeConfig(BUNDLED_CONFIG, remoteConfig);
        console.log("[Config] Loaded runtime config from Backend");
      }
    } catch (error) {
      console.log("[Config] Using bundled config");
    }
    this.loaded = true;
    return this.config;
  }
  mergeConfig(base, override) {
    return {
      backend: { ...base.backend, ...override.backend },
      features: { ...base.features, ...override.features },
      analytics: { ...base.analytics, ...override.analytics },
      email: { ...base.email, ...override.email },
      ai: { ...base.ai, ...override.ai }
    };
  }
  get backend() {
    return this.config.backend;
  }
  get features() {
    return this.config.features;
  }
  get analytics() {
    return this.config.analytics;
  }
  get email() {
    return this.config.email;
  }
  get ai() {
    return this.config.ai;
  }
}
const config = new ConfigService();
const index = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  config
}, Symbol.toStringTag, { value: "Module" }));
function fastHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = hash * 33 ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}
class StorageCache {
  namespace;
  constructor(namespace) {
    this.namespace = `cache_${namespace}_`;
  }
  async get(key) {
    const fullKey = this.namespace + key;
    const result = await chrome.storage.local.get(fullKey);
    const data = result[fullKey];
    if (!data) return null;
    if (data.expiry && Date.now() > data.expiry) {
      await this.delete(key);
      return null;
    }
    return data.value;
  }
  async set(key, value, ttlMs) {
    const fullKey = this.namespace + key;
    const data = {
      value,
      expiry: Date.now() + ttlMs
    };
    await chrome.storage.local.set({ [fullKey]: data });
  }
  async delete(key) {
    const fullKey = this.namespace + key;
    await chrome.storage.local.remove(fullKey);
  }
  /**
   * Cleans up all expired entries in this namespace.
   * Can be called periodically.
   */
  async purge() {
    const all = await chrome.storage.local.get(null);
    const keysToDelete = Object.keys(all).filter(
      (k) => k.startsWith(this.namespace) && all[k].expiry && Date.now() > all[k].expiry
    );
    if (keysToDelete.length > 0) {
      await chrome.storage.local.remove(keysToDelete);
    }
  }
}
class CircuitBreaker {
  state = "CLOSED";
  failures = 0;
  lastFailureTime = 0;
  successCount = 0;
  config;
  constructor(config2) {
    this.config = config2;
  }
  async execute(fn) {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = "HALF_OPEN";
        console.log("[CircuitBreaker] Attempting recovery (HALF_OPEN)");
      } else {
        throw new Error("Service temporarily unavailable - please try again");
      }
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  onSuccess() {
    this.failures = 0;
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = "CLOSED";
        this.successCount = 0;
        console.log("[CircuitBreaker] Service recovered (CLOSED)");
      }
    }
  }
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;
    if (this.failures >= this.config.failureThreshold) {
      this.state = "OPEN";
      console.error(
        `[CircuitBreaker] Circuit OPEN after ${this.failures} failures`
      );
    }
  }
  isHealthy() {
    return this.state === "CLOSED";
  }
}
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1e3,
  maxDelay: 1e4,
  backoffMultiplier: 2
};
const DEFAULT_CIRCUIT_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 6e4
};
const backendCircuit = new CircuitBreaker(DEFAULT_CIRCUIT_CONFIG);
function isRetryable(error) {
  if (error.name === "AbortError") return true;
  if (!error.status) return true;
  if (error.status >= 500) return true;
  return false;
}
async function retryWithBackoff(fn, config2 = DEFAULT_RETRY_CONFIG, attempt = 1) {
  try {
    return await fn();
  } catch (error) {
    if (!isRetryable(error)) {
      console.error(`[Retry] Fatal error encountered (status: ${error.status}). No retry.`);
      throw error;
    }
    if (attempt >= config2.maxRetries) {
      console.error(`[Retry] All ${config2.maxRetries} attempts failed. Giving up.`);
      throw error;
    }
    const delay = Math.min(
      config2.initialDelay * Math.pow(config2.backoffMultiplier, attempt - 1),
      config2.maxDelay
    );
    console.warn(
      `[Retry] Attempt ${attempt}/${config2.maxRetries} failed with ${error.message || "Error"}. Retrying in ${delay}ms...`
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithBackoff(fn, config2, attempt + 1);
  }
}
async function fetchWithTimeout(url, options = {}, timeout = 3e4) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeout / 1e3}s`);
    }
    throw error;
  }
}
async function resilientFetch(url, options = {}) {
  console.log(`[resilientFetch] Starting request to ${url}`);
  return backendCircuit.execute(async () => {
    console.log(
      `[resilientFetch] Circuit breaker healthy, proceeding with request`
    );
    return retryWithBackoff(async () => {
      console.log(`[resilientFetch] Making fetch request with timeout 30s`);
      const response = await fetchWithTimeout(url, options);
      console.log(`[resilientFetch] Response received: ${response.status}`);
      if (!response.ok && response.status >= 500) {
        const error = new Error(`Server error: ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return response;
    });
  });
}
class LocalSummarizer {
  /**
   * Smart deduplication: removes similar prompts
   */
  deduplicatePrompts(prompts) {
    if (prompts.length <= 1) return prompts;
    const result = [];
    const normalized = /* @__PURE__ */ new Set();
    for (const prompt of prompts) {
      const norm = this.normalizeText(prompt.content);
      if (normalized.has(norm)) continue;
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
  normalizeText(text) {
    return text.toLowerCase().trim().replace(/\s+/g, " ").replace(/[^\w\s]/g, "");
  }
  /**
   * Calculate similarity between two strings (0-1)
   */
  calculateSimilarity(a, b) {
    if (a === b) return 1;
    if (!a.length || !b.length) return 0;
    if (a.includes(b) || b.includes(a)) {
      const shorter = Math.min(a.length, b.length);
      const longer = Math.max(a.length, b.length);
      return shorter / longer;
    }
    const wordsA = new Set(a.split(" ").filter((w) => w.length > 2));
    const wordsB = new Set(b.split(" ").filter((w) => w.length > 2));
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
  formatSummary(prompts) {
    const deduped = this.deduplicatePrompts(prompts);
    const sentences = deduped.map((p) => {
      let text = p.content.trim();
      if (!text.endsWith(".") && !text.endsWith("?") && !text.endsWith("!")) {
        text += ".";
      }
      return text;
    });
    const paragraph = sentences.join(" ");
    return paragraph + "\n\n⚡ Compiled by 1-prompt Local Logic (Fallback)";
  }
  /**
   * Main compilation method
   */
  async summarize(prompts) {
    if (prompts.length === 0) {
      throw new Error("No prompts to summarize");
    }
    try {
      const globalObj = typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};
      const ai = globalObj.ai;
      if (ai && ai.languageModel) {
        const capabilities = await ai.languageModel.capabilities();
        if (capabilities.available !== "no") {
          const session = await ai.languageModel.create();
          const content = prompts.map((p) => p.content).join("\n\n");
          const CONSOLIDATION_RULES_LOCAL = `CORE DIRECTIVE: Compile user intent into a single, cohesive paragraph. Output a single paragraph with no headers or meta-commentary. Apply latest-wins conflict resolution and preserve explicit negations. Flag ambiguity with [?].`;
          const promptText = `${CONSOLIDATION_RULES_LOCAL}

Summarize these prompts into a single, consolidated paragraph (paste-ready):

${content}`;
          const result = await session.prompt(promptText);
          return {
            original: prompts,
            summary: result + "\n\n⚡ Compiled by 1-prompt Local AI (Gemini Nano)",
            promptCount: { before: prompts.length, after: prompts.length }
          };
        }
      }
    } catch (e) {
      console.warn(
        "[LocalSummarizer] Gemini Nano failed or not available, falling back to compilation logic:",
        e
      );
    }
    try {
      const summary = this.formatSummary(prompts);
      const deduped = this.deduplicatePrompts(prompts);
      return {
        original: prompts,
        summary,
        // Already includes signature
        promptCount: {
          before: prompts.length,
          after: deduped.length
        }
      };
    } catch (error) {
      console.error("[LocalSummarizer] Error:", error);
      throw error;
    }
  }
}
const localSummarizer = new LocalSummarizer();
const DEFAULT_AI_CONFIG = {
  primary: {
    provider: "gemini",
    model: "gemini-2.0-flash",
    timeout: 3e4,
    maxTokens: 4e3,
    temperature: 0.3
  },
  fallbacks: [
    {
      provider: "gemini",
      model: "gemini-2.0-flash",
      timeout: 3e4,
      maxTokens: 4e3,
      temperature: 0.3,
      isFallback: true
    }
  ],
  settings: {
    autoFallback: true,
    retryAttempts: 2,
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1e3
    }
  },
  environments: {
    development: {
      primary: {
        provider: "gemini",
        model: "gemini-2.0-flash",
        temperature: 0.5
      }
    },
    production: {
      settings: {
        autoFallback: true,
        retryAttempts: 3
      }
    }
  }
};
const PROVIDER_MODELS = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
  anthropic: [
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307"
  ],
  gemini: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
  cohere: ["command-r-plus", "command-r", "command-r", "command", "command-nightly"],
  cloudflare: ["@cf/meta/llama-3.2-3b-instruct", "@cf/meta/llama-3.1-8b-instruct"],
  auto: []
};
function getEnvVar(key, fallback) {
  if (typeof globalThis !== "undefined" && globalThis.process?.env) {
    return globalThis.process.env[key] || fallback;
  }
  if (typeof window !== "undefined" && window.process?.env) {
    return window.process.env[key] || fallback;
  }
  return fallback;
}
function loadAIConfiguration() {
  let config2 = { ...DEFAULT_AI_CONFIG };
  const envProvider = getEnvVar("AI_PROVIDER");
  const envModel = getEnvVar("AI_MODEL");
  if (envProvider && PROVIDER_MODELS[envProvider]) {
    config2.primary.provider = envProvider;
  }
  if (envModel) {
    config2.primary.model = envModel;
  }
  return config2;
}
function validateAIConfig(config2) {
  const errors = [];
  if (!config2.primary.provider || !PROVIDER_MODELS[config2.primary.provider]) {
    errors.push(`Invalid primary provider: ${config2.primary.provider}`);
  }
  if (config2.primary.model && config2.primary.provider !== "auto") {
    const validModels = PROVIDER_MODELS[config2.primary.provider];
    if (validModels && !validModels.includes(config2.primary.model)) {
      errors.push(
        `Model ${config2.primary.model} is not valid for provider ${config2.primary.provider}`
      );
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
const DEFAULT_CONFIG = {
  version: 1,
  platforms: {
    chatgpt: {
      userSelectors: ['[data-message-author-role="user"]', ".user-message"],
      buttonSelectors: ['button[data-testid="send-button"]'],
      inputSelectors: ["#prompt-textarea"]
    },
    claude: {
      userSelectors: [".font-user-message", '[data-test-id="user-message"]'],
      buttonSelectors: ['button[aria-label="Send Message"]'],
      inputSelectors: ['div[contenteditable="true"]']
    }
    // Add other platforms as needed
  },
  aiConfig: {
    defaultProvider: "auto"
  }
};
const STORAGE_KEY = "remote_selector_config";
const CACHE_TTL = 24 * 60 * 60 * 1e3;
const LAST_FETCH_KEY = "remote_config_last_fetch";
class RemoteConfigService {
  static instance;
  config = DEFAULT_CONFIG;
  constructor() {
  }
  static getInstance() {
    if (!RemoteConfigService.instance) {
      RemoteConfigService.instance = new RemoteConfigService();
    }
    return RemoteConfigService.instance;
  }
  async initialize() {
    const stored = await chrome.storage.local.get([
      STORAGE_KEY,
      LAST_FETCH_KEY
    ]);
    if (stored[STORAGE_KEY]) {
      this.config = { ...DEFAULT_CONFIG, ...stored[STORAGE_KEY] };
    }
  }
  // Removed fetchUpdates to prevent bundling Firebase in content scripts
  // Updates are now handled by the background script via remote-config-fetcher.ts
  getSelectors(platform) {
    return this.config.platforms[platform] || null;
  }
  getAIConfig() {
    return this.config.aiConfig || DEFAULT_CONFIG.aiConfig;
  }
}
class DynamicConfigLoader {
  static instance;
  config = DEFAULT_AI_CONFIG;
  sources = [];
  lastUpdate = 0;
  updateInterval = 5 * 60 * 1e3;
  // 5 minutes
  isLoading = false;
  constructor() {
    this.initializeSources();
  }
  static getInstance() {
    if (!DynamicConfigLoader.instance) {
      DynamicConfigLoader.instance = new DynamicConfigLoader();
    }
    return DynamicConfigLoader.instance;
  }
  /**
   * Initialize configuration sources in priority order
   */
  initializeSources() {
    this.sources = [
      {
        name: "environment",
        priority: 1,
        load: this.loadFromEnvironment.bind(this)
      },
      {
        name: "remote-admin",
        priority: 2,
        load: this.loadFromRemoteAdmin.bind(this)
      },
      {
        name: "remote-config",
        priority: 3,
        load: this.loadFromRemoteConfig.bind(this)
      },
      {
        name: "runtime-config",
        priority: 2.5,
        // Higher than remote-config, lower than admin
        load: this.loadFromRuntimeConfig.bind(this)
      },
      {
        name: "local-storage",
        priority: 4,
        load: this.loadFromLocalStorage.bind(this)
      }
    ];
    this.sources.sort((a, b) => a.priority - b.priority);
  }
  /**
   * Get current AI configuration
   */
  async getConfig() {
    const now = Date.now();
    if (now - this.lastUpdate > this.updateInterval) {
      await this.refreshConfig();
    }
    return this.config;
  }
  /**
   * Force refresh configuration from all sources
   */
  async refreshConfig() {
    if (this.isLoading) {
      return;
    }
    this.isLoading = true;
    console.log("[DynamicConfigLoader] 🔄 Refreshing AI configuration...");
    try {
      let finalConfig = { ...DEFAULT_AI_CONFIG };
      for (const source of [...this.sources].reverse()) {
        try {
          const sourceConfig = await source.load();
          if (sourceConfig) {
            finalConfig = this.mergeConfigs(finalConfig, sourceConfig);
            console.log(
              `[DynamicConfigLoader] ✅ Loaded config from ${source.name}`
            );
          }
        } catch (error) {
          console.warn(
            `[DynamicConfigLoader] ⚠️ Failed to load from ${source.name}:`,
            error
          );
        }
      }
      if (finalConfig.primary.provider === "auto") {
        console.log("[DynamicConfigLoader] 🔄 Discarding 'auto' config, force-resetting to Gemini");
        finalConfig.primary.provider = "gemini";
        finalConfig.primary.model = "gemini-2.0-flash";
      }
      if (!finalConfig.primary.provider || finalConfig.primary.provider === "auto") {
        console.warn("[DynamicConfigLoader] ⚠️ Invalid provider detected, forcing Gemini");
        finalConfig.primary.provider = "gemini";
        finalConfig.primary.model = "gemini-2.0-flash";
      }
      const validation = validateAIConfig(finalConfig);
      if (!validation.valid) {
        console.error(
          "[DynamicConfigLoader] ❌ Invalid configuration:",
          validation.errors
        );
        console.log(
          "[DynamicConfigLoader] 🔧 Using default configuration as fallback"
        );
        finalConfig = { ...DEFAULT_AI_CONFIG };
      }
      this.config = finalConfig;
      this.lastUpdate = Date.now();
      console.log(
        `[DynamicConfigLoader] 🎯 Using provider: ${this.config.primary.provider} (${this.config.primary.model})`
      );
      await this.saveToLocalStorage(this.config);
    } catch (error) {
      console.error(
        "[DynamicConfigLoader] ❌ Failed to refresh config:",
        error
      );
    } finally {
      this.isLoading = false;
    }
  }
  /**
   * Load configuration from environment variables
   */
  async loadFromEnvironment() {
    try {
      const envConfig = loadAIConfiguration();
      if (envConfig.primary.provider !== DEFAULT_AI_CONFIG.primary.provider || envConfig.primary.apiKey || envConfig.primary.model !== DEFAULT_AI_CONFIG.primary.model) {
        return envConfig;
      }
      return null;
    } catch (error) {
      console.warn(
        "[DynamicConfigLoader] Environment config load failed:",
        error
      );
      return null;
    }
  }
  /**
   * Load configuration from remote admin endpoint
   * This allows real-time changes via admin panel
   */
  async loadFromRemoteAdmin() {
    try {
      const adminUrl = this.getAdminConfigUrl();
      if (!adminUrl) {
        return null;
      }
      const response = await resilientFetch(adminUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
        // Note: timeout handled by resilientFetch internally
      });
      if (!response.ok) {
        return null;
      }
      const remoteConfig = await response.json();
      console.log("[DynamicConfigLoader] 📡 Remote admin config loaded");
      return remoteConfig;
    } catch (error) {
      return null;
    }
  }
  /**
   * Load configuration from runtime config service (Backend Runtime Config)
   */
  async loadFromRuntimeConfig() {
    try {
      const { config: config2 } = await Promise.resolve().then(() => index);
      await config2.load();
      const runtimeAi = config2.ai;
      if (runtimeAi && runtimeAi.defaultProvider !== "auto") {
        return {
          primary: {
            provider: runtimeAi.defaultProvider,
            model: runtimeAi.model
          }
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
  async loadFromRemoteConfig() {
    try {
      const aiConfig = RemoteConfigService.getInstance().getAIConfig();
      if (aiConfig && aiConfig.defaultProvider !== "auto") {
        return {
          primary: {
            provider: aiConfig.defaultProvider,
            model: aiConfig.model
          }
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
  async loadFromLocalStorage() {
    try {
      const result = await chrome.storage.local.get(["ai_configuration_cache"]);
      if (result.ai_configuration_cache) {
        const cached = JSON.parse(result.ai_configuration_cache);
        const maxAge = 24 * 60 * 60 * 1e3;
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
  async saveToLocalStorage(config2) {
    try {
      const cacheData = {
        config: config2,
        timestamp: Date.now()
      };
      await chrome.storage.local.set({
        ai_configuration_cache: JSON.stringify(cacheData)
      });
    } catch (error) {
      console.warn(
        "[DynamicConfigLoader] Failed to save to local storage:",
        error
      );
    }
  }
  /**
   * Get admin config URL from environment or hardcoded
   */
  getAdminConfigUrl() {
    try {
      chrome.storage.sync.get(["ai_admin_config_url"], (result) => {
        return result.ai_admin_config_url || null;
      });
    } catch {
    }
    return "https://1prompt-backend.amaravadhibharath.workers.dev/admin/ai-config";
  }
  /**
   * Deep merge configurations
   */
  mergeConfigs(base, override) {
    return {
      primary: { ...base.primary, ...override.primary },
      fallbacks: override.fallbacks || base.fallbacks,
      settings: { ...base.settings, ...override.settings },
      environments: base.environments
      // Don't merge environments from remote
    };
  }
  /**
   * Update AI provider configuration remotely (for admin use)
   */
  async updateProvider(provider, model, apiKey) {
    try {
      const newConfig = {
        primary: {
          ...this.config.primary,
          provider,
          model: model || this.config.primary.model,
          apiKey: apiKey || this.config.primary.apiKey
        }
      };
      const testConfig = this.mergeConfigs(this.config, newConfig);
      const validation = validateAIConfig(testConfig);
      if (!validation.valid) {
        console.error(
          "[DynamicConfigLoader] ❌ Invalid provider update:",
          validation.errors
        );
        return false;
      }
      this.config = testConfig;
      await this.saveToLocalStorage(this.config);
      console.log(
        `[DynamicConfigLoader] ✅ Provider updated to ${provider} (${model || "default model"})`
      );
      return true;
    } catch (error) {
      console.error(
        "[DynamicConfigLoader] ❌ Failed to update provider:",
        error
      );
      return false;
    }
  }
  /**
   * Get current provider info for debugging
   */
  getCurrentProviderInfo() {
    return {
      provider: this.config.primary.provider,
      model: this.config.primary.model,
      source: "dynamic"
      // Could track which source provided the config
    };
  }
}
const dynamicConfigLoader = DynamicConfigLoader.getInstance();
const USER_ID_KEY = "prompt_extractor_user_id";
async function getAuthToken() {
  if (typeof chrome !== "undefined" && chrome.identity) {
    const token = await new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, (t) => {
        if (chrome.runtime.lastError || !t) {
          resolve(null);
          return;
        }
        resolve(t);
      });
    });
    if (token) return token;
    const storageRes = await chrome.storage.local.get(["firebase_id_token"]);
    if (storageRes.firebase_id_token) return storageRes.firebase_id_token;
    return null;
  }
  try {
    const t = localStorage.getItem("firebase_id_token");
    return t || null;
  } catch (e) {
    return null;
  }
}
async function getCurrentUserId() {
  const sessionResult = await chrome.storage.session.get([USER_ID_KEY]);
  if (sessionResult[USER_ID_KEY]) return sessionResult[USER_ID_KEY];
  const localResult = await chrome.storage.local.get([USER_ID_KEY]);
  return localResult[USER_ID_KEY] || null;
}
async function getUserTier() {
  try {
    const userData = await chrome.storage.local.get(["oneprompt_user"]);
    const user = userData.oneprompt_user;
    if (!user) {
      return "guest";
    }
    const cacheKey = "tierCache";
    const cache = await chrome.storage.local.get([cacheKey]);
    const cached = cache[cacheKey];
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1e3;
    if (cached && cached.userId === user.id && now - cached.timestamp < CACHE_DURATION) {
      return cached.tier;
    }
    const token = await getAuthToken();
    const headers = {
      "Content-Type": "application/json"
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${config.backend.url}/user/tier`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: user.id,
        email: user.email
      })
    });
    if (!response.ok) throw new Error("Tier check failed");
    const data = await response.json();
    const tier = data.tier;
    await chrome.storage.local.set({
      [cacheKey]: { tier, timestamp: now, userId: user.id },
      userTier: tier
    });
    return tier;
  } catch (error) {
    console.error("[Pricing] Tier check error:", error);
    const fallback = await chrome.storage.local.get(["userTier"]);
    return fallback.userTier || "guest";
  }
}
const USAGE_KEY = "daily_usage_stats";
async function getDailyUsage() {
  return new Promise((resolve) => {
    chrome.storage.local.get([USAGE_KEY], (data) => {
      const today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA");
      const stats = data[USAGE_KEY];
      if (!stats || stats.date !== today) {
        const newStats = { date: today, captures: 0, compiles: 0 };
        chrome.storage.local.set({ [USAGE_KEY]: newStats });
        resolve(newStats);
      } else {
        resolve(stats);
      }
    });
  });
}
const CONSOLIDATION_RULES$1 = `[INTENT COMPILATION PROTOCOL v5.1 - ENTERPRISE]

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
class EnhancedAISummarizer {
  static instance;
  get backendUrl() {
    return `${config.backend.url}/summarize/v5`;
  }
  constructor() {
  }
  static getInstance() {
    if (!EnhancedAISummarizer.instance) {
      EnhancedAISummarizer.instance = new EnhancedAISummarizer();
    }
    return EnhancedAISummarizer.instance;
  }
  /**
   * Summarize prompts using the configured AI provider via secure backend
   */
  async summarize(prompts, options = {}) {
    if (!prompts.length) {
      throw new Error("No prompts provided for summarization");
    }
    console.log(
      `[EnhancedAISummarizer] 📝 Starting summarization of ${prompts.length} prompts`
    );
    try {
      const config2 = await dynamicConfigLoader.getConfig();
      console.log(
        `[EnhancedAISummarizer] 🎯 Using provider via backend: ${config2.primary.provider} (${config2.primary.model})`
      );
      return await this.summarizeWithBackend(prompts, options, config2);
    } catch (error) {
      console.error("[EnhancedAISummarizer] ❌ Primary method failed:", error);
      console.error("[EnhancedAISummarizer] ❌ Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : void 0
      });
      return await this.fallbackSummarize(prompts, options);
    }
  }
  /**
   * Summarize using backend (secure method where API keys are server-side)
   */
  async summarizeWithBackend(prompts, options, config2) {
    console.log(`[EnhancedAISummarizer] 🌐 Requesting summary from backend: ${this.backendUrl}`);
    console.log(`[EnhancedAISummarizer] 📋 Provider: ${config2.primary.provider}, Model: ${config2.primary.model}`);
    try {
      const content = this.prepareContent(prompts);
      const tier = await getUserTier();
      const usage = await getDailyUsage();
      let provider = config2.primary.provider === "auto" ? "gemini" : config2.primary.provider;
      let model = config2.primary.model || "gemini-1.5-flash";
      if ((tier === "go" || tier === "free") && usage.compiles >= 10) {
        console.log(`[EnhancedAISummarizer] 🔄 Go tier limit reached (${usage.compiles}/10), switching to Llama fallback...`);
        provider = "groq";
        model = "llama-3.3-70b-versatile";
      }
      console.log(`[EnhancedAISummarizer] 📦 Request payload:`, {
        url: this.backendUrl,
        contentLength: content.length,
        platform: prompts[0]?.platform || "unknown",
        provider,
        model
      });
      const response = await resilientFetch(this.backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}
        },
        body: JSON.stringify({
          content,
          platform: prompts[0]?.platform || "unknown",
          additionalInfo: CONSOLIDATION_RULES$1,
          provider,
          model,
          apiKey: config2.primary.apiKey,
          // Extension may pass a user key if needed
          userId: options.userId,
          userEmail: options.userEmail,
          options: {
            format: options.format || "paragraph",
            tone: options.tone || "normal",
            includeAI: options.includeAI || false,
            mode: "consolidate"
          }
        })
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
          after: prompts.length
        },
        provider: data.provider || config2.primary.provider,
        model: data.model || config2.primary.model
      };
    } catch (error) {
      console.error("[EnhancedAISummarizer] ❌ Backend method failed:", error);
      throw error;
    }
  }
  /**
   * Fallback summarization using local processing (last resort)
   */
  async fallbackSummarize(prompts, _options) {
    console.log(
      "[EnhancedAISummarizer] 🔄 Falling back to local client-side summarization"
    );
    try {
      return await localSummarizer.summarize(prompts);
    } catch (error) {
      console.error(
        "[EnhancedAISummarizer] ❌ All fallback methods failed:",
        error
      );
      const content = this.prepareContent(prompts);
      return {
        original: prompts,
        summary: content.length > 4e3 ? content.substring(0, 4e3) + "..." : content,
        promptCount: {
          before: prompts.length,
          after: 1
        },
        provider: "local",
        model: "fallback"
      };
    }
  }
  /**
   * Prepare content from prompts for summarization
   */
  prepareContent(prompts) {
    return prompts.map((p, i) => `${i + 1}. ${p.content.trim()}`).join("\n\n");
  }
  /**
   * Get current configuration info for debugging
   */
  async getConfigInfo() {
    try {
      const config2 = await dynamicConfigLoader.getConfig();
      return {
        primary: config2.primary,
        fallbacks: config2.fallbacks.map((f) => ({
          provider: f.provider,
          model: f.model
        })),
        settings: config2.settings
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }
  /**
   * Force refresh configuration
   */
  async refreshConfiguration() {
    await dynamicConfigLoader.refreshConfig();
  }
}
const enhancedAISummarizer = EnhancedAISummarizer.getInstance();
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
class AISummarizer {
  storage = new StorageCache("ai_summary");
  CACHE_TTL = 30 * 60 * 1e3;
  // 30 minutes (more aggressive caching since it's persistent)
  /**
   * Summarize extracted prompts using the configured AI provider
   * Now uses the enhanced configuration system for provider flexibility
   */
  async summarize(prompts, options = {}) {
    if (!prompts || prompts.length === 0) {
      console.log("[AISummarizer] 📝 No prompts to summarize");
      return {
        original: [],
        summary: "",
        promptCount: { before: 0, after: 0 }
      };
    }
    const cacheKey = this.generateCacheKey(prompts, options);
    const cached = await this.storage.get(cacheKey);
    if (cached) {
      console.log("[AISummarizer] 🎯 Cache hit for compilation");
      return cached;
    }
    console.log(
      `[AISummarizer] 📝 Starting AI compilation for ${prompts.length} prompts`
    );
    try {
      const result = await this.retryWithBackoff(
        async () => enhancedAISummarizer.summarize(prompts, {
          format: options.format,
          tone: options.tone,
          includeAI: options.includeAI,
          userId: options.userId,
          userEmail: options.userEmail,
          authToken: options.authToken
        })
      );
      console.log(
        `[AISummarizer] ✅ Enhanced AI summary completed via ${result.provider || "backend"}`
      );
      if (result.provider !== "local" && result.model !== "fallback" && result.model !== "Local (Reliable)") {
        await this.storage.set(cacheKey, result, this.CACHE_TTL);
        console.log("[AISummarizer] 💾 Cached AI result");
      } else {
        console.log("[AISummarizer] ⚠️ Skipping cache for local fallback result");
      }
      return result;
    } catch (enhancedError) {
      console.warn(
        "[AISummarizer] ⚠️ Enhanced summarizer failed, trying legacy backend...",
        enhancedError
      );
      const result = await this.retryWithBackoff(
        async () => this.legacySummarize(prompts, options)
      );
      if (result.provider !== "local" && result.model !== "fallback" && result.model !== "Local (Reliable)") {
        await this.storage.set(cacheKey, result, this.CACHE_TTL);
        console.log("[AISummarizer] 💾 Cached AI result from legacy backend");
      } else {
        console.log("[AISummarizer] ⚠️ Skipping cache for local fallback result");
      }
      return result;
    }
  }
  /**
   * Legacy backend compilation method (kept for compatibility)
   */
  async legacySummarize(prompts, options = {}) {
    try {
      const content = prompts.map((p, i) => `${i + 1}. ${p.content}`).join("\n\n");
      const c = await config.load();
      const url = `${c.backend.url}/summarize/v5`;
      const aiConfig = await dynamicConfigLoader.getConfig();
      const provider = aiConfig.primary.provider;
      const model = aiConfig.primary.model || "standard";
      console.log(
        `[AISummarizer] ⏱️ Attempting legacy backend at ${url} using ${provider} (${model})`
      );
      console.log(
        `[AISummarizer] 📝 Sending ${prompts.length} raw prompts (${content.length} chars)`
      );
      const promptTemplate = CONSOLIDATION_RULES.replace("[END PROTOCOL v5.1]", "") + "\n\nConversation:\n{prompts}\n\nOutput a single, consolidated prompt:";
      const finalPrompt = promptTemplate.replace("{prompts}", content);
      const response = await resilientFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}
        },
        body: JSON.stringify({
          content: finalPrompt,
          platform: prompts[0]?.platform || "unknown",
          additionalInfo: "",
          provider: provider === "auto" ? "gemini" : provider,
          model,
          userId: options.userId,
          userEmail: options.userEmail,
          options: {
            format: options.format || "paragraph",
            tone: options.tone || "normal",
            includeAI: options.includeAI || false,
            mode: "consolidate"
          }
        })
      });
      console.log(
        `[AISummarizer] 📡 Backend response: ${response.status} ${response.statusText}`
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
        `[AISummarizer] ✅ AI Summary received (${data.summary?.length || 0} chars): ${data.summary?.slice(0, 100)}...`
      );
      if (!data.summary || data.summary.trim().length === 0) {
        console.error("[AISummarizer] ❌ AI returned empty summary");
        throw new Error("AI returned an empty summary.");
      }
      return {
        original: prompts,
        // Keep original for user display
        summary: data.summary,
        promptCount: {
          before: prompts.length,
          after: prompts.length
        },
        model: data.model,
        provider: data.provider
      };
    } catch (error) {
      console.error(
        "[AISummarizer] ❌ Cloud AI failed:",
        error?.message || error
      );
      console.error(
        "[AISummarizer] ⚠️ Falling back to local client-side compilation..."
      );
      try {
        const localResult = await localSummarizer.summarize(prompts);
        console.log(
          "[AISummarizer] ⚙️ Using local summary as fallback (Client-Side)"
        );
        return localResult;
      } catch (localError) {
        console.error(
          "[AISummarizer] ❌ Local compilation also failed:",
          localError
        );
        throw error;
      }
    }
  }
  /**
   * Generate a cache key from prompts and options
   */
  generateCacheKey(prompts, options) {
    const input = JSON.stringify({
      prompts: prompts.map((p) => p.content).sort(),
      options: {
        format: options.format,
        tone: options.tone,
        includeAI: options.includeAI
      }
    });
    return fastHash(input);
  }
  /**
   * Retry Helper (Internal version for backoff complexity)
   */
  async retryWithBackoff(operation, maxRetries = 3, baseDelay = 1e3) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1e3;
          console.log(`[AISummarizer] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }
}
const aiSummarizer = new AISummarizer();
async function initializeAISummarizer() {
  console.log(
    "[AISummarizer] Using Cloudflare Worker backend with smart filtering"
  );
}
async function fetchRemoteConfigUpdates(currentVersion) {
  try {
    const response = await resilientFetch(
      `${config.backend.url}/config/selectors`,
      {
        method: "GET"
      }
    );
    if (response.ok) {
      const data = await response.json();
      const remoteData = data.config;
      if (remoteData && remoteData.version && remoteData.version > currentVersion) {
        console.log("[RemoteConfig] New version found:", remoteData.version);
        await chrome.storage.local.set({ [STORAGE_KEY]: remoteData });
      }
    }
    await chrome.storage.local.set({ [LAST_FETCH_KEY]: Date.now() });
  } catch (error) {
    console.warn("[RemoteConfig] Update failed, using cached config:", error);
  }
}
if (typeof self !== "undefined" && typeof window === "undefined") {
  self.window = self;
}
console.log("[1-prompt] Service worker started");
initializeAISummarizer();
try {
  RemoteConfigService.getInstance().initialize().then(async () => {
    try {
      const stored = await chrome.storage.local.get([LAST_FETCH_KEY]);
      const lastFetch = stored[LAST_FETCH_KEY] || 0;
      if (Date.now() - lastFetch > CACHE_TTL) {
        const config2 = RemoteConfigService.getInstance().config;
        fetchRemoteConfigUpdates(config2?.version || 0).catch((err) => {
          console.error("[1-prompt] Remote config update failed:", err);
        });
      }
    } catch (innerErr) {
      console.error(
        "[1-prompt] Error checking remote config cache:",
        innerErr
      );
    }
  }).catch((err) => {
    console.error("[1-prompt] Remote config initialization failed:", err);
  });
} catch (err) {
  console.error("[1-prompt] Critical error initializing remote config:", err);
}
if (chrome.sidePanel && chrome.sidePanel.setOptions) {
  chrome.sidePanel.setOptions({
    enabled: true,
    path: "sidepanel/index.html"
  }).catch((err) => console.error("[1-prompt SW] Failed to set sidepanel options:", err));
}
self.addEventListener("unhandledrejection", (event) => {
  console.error(
    "[1-prompt] Unhandled rejection in service worker:",
    event.reason
  );
  event.preventDefault();
});
chrome.alarms.create("keepAlive", { periodInMinutes: 0.5 });
chrome.alarms.create("syncPrompts", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "keepAlive") {
    console.log("[1-prompt] Keep-alive ping at", (/* @__PURE__ */ new Date()).toISOString());
  } else if (alarm.name === "syncPrompts") {
    console.log("[1-prompt] Triggering prompt sync...");
    try {
      const tabs = await chrome.tabs.query({
        url: [
          "*://*.openai.com/*",
          "*://*.anthropic.com/*",
          "*://*.google.com/*",
          "*://*.perplexity.ai/*",
          "*://*.deepseek.com/*",
          "*://*.lovable.dev/*",
          "*://*.bolt.new/*",
          "*://*.cursor.sh/*",
          "*://*.meta.ai/*"
        ]
      });
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { action: "TRIGGER_CLOUD_SYNC" }).catch(() => {
          });
        }
      }
    } catch (err) {
      console.error("[1-prompt] Sync alarm error:", err);
    }
  }
});
let lastExtractionResult = null;
let pendingTrigger = null;
if (chrome.sidePanel) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => console.warn("[1-prompt] SidePanel setup failed:", err));
} else {
  console.warn("[1-prompt] SidePanel API not available, falling back to popup");
  chrome.action.setPopup({ popup: "sidepanel/index.html" });
}
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidepanel") {
    console.log("[1-prompt SW] 🟢 Side panel connected");
    checkActiveTabStatus();
    if (lastExtractionResult) {
      chrome.runtime.sendMessage({
        action: "EXTRACTION_RESULT",
        result: lastExtractionResult
      }).catch(() => {
      });
    }
    if (pendingTrigger && Date.now() - pendingTrigger.timestamp < 3e3) {
      console.log("[1-prompt] Replaying pending trigger to new sidepanel");
      chrome.runtime.sendMessage({ action: "EXTRACT_TRIGERED_FROM_PAGE" }).catch(() => {
      });
    }
    port.onMessage.addListener((message) => {
      handleSidePanelMessage(message);
    });
    port.onDisconnect.addListener(() => {
      console.log("[1-prompt SW] 🔴 Side panel disconnected");
    });
  }
});
async function trackDailyMetrics(_promptCount) {
  try {
    console.log(
      "[1-prompt] Metrics tracking temporarily disabled during migration"
    );
  } catch (e) {
  }
}
chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    console.log("[1-prompt] Received message:", message.action);
    switch (message.action) {
      case "EXTRACT_PROMPTS":
      case "SUMMARIZE_PROMPTS":
      case "GET_STATUS": {
        handleSidePanelMessage(message);
        sendResponse({ success: true });
        return true;
      }
      case "SET_USER_ID": {
        const { userId } = message;
        if (userId) {
          chrome.storage.local.set({ firebase_current_user_id: userId }, () => {
            console.log("[1-prompt SW] User ID set in local storage:", userId);
            sendResponse({ success: true });
          });
        } else {
          chrome.storage.local.remove("firebase_current_user_id", () => {
            console.log("[1-prompt SW] User ID removed from local storage");
            sendResponse({ success: true });
          });
        }
        return true;
      }
      case "SYNC_PROMPT_TO_CLOUD": {
        const { prompt, platform } = message;
        handleSyncToCloud([prompt], platform, sendResponse);
        return true;
      }
      case "SYNC_PROMPTS_TO_CLOUD": {
        const { prompts, platform } = message;
        handleSyncToCloud(prompts, platform, sendResponse);
        return true;
      }
      case "COPY_TEXT": {
        const { text } = message;
        (async () => {
          try {
            const [tab] = await chrome.tabs.query({
              active: true,
              currentWindow: true
            });
            if (tab?.id) {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (t) => {
                  navigator.clipboard.writeText(t).catch(() => {
                    const textArea = document.createElement("textarea");
                    textArea.value = t;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-9999px";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    try {
                      document.execCommand("copy");
                    } catch (err) {
                      console.error("Fallback copy failed", err);
                    }
                    document.body.removeChild(textArea);
                  });
                },
                args: [text]
              });
              sendResponse({ success: true });
            } else {
              throw new Error("No active tab found to execute copy");
            }
          } catch (e) {
            console.error("Background copy failed", e);
            sendResponse({ success: false, error: String(e) });
          }
        })();
        return true;
      }
      case "OPEN_SIDE_PANEL": {
        (async () => {
          try {
            console.log(
              "[1-prompt SW] OPEN_SIDE_PANEL received from tab:",
              sender.tab?.id
            );
            let windowId = sender.tab?.windowId;
            if (!windowId) {
              console.log("[1-prompt SW] No windowId from sender, querying active tab...");
              const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
              });
              windowId = tab?.windowId;
              console.log("[1-prompt SW] Got windowId from query:", windowId);
            }
            if (windowId) {
              console.log("[1-prompt SW] Opening side panel for window:", windowId);
              if (chrome.sidePanel && chrome.sidePanel.open) {
                await chrome.sidePanel.open({ windowId });
                console.log("[1-prompt SW] Side panel open command sent");
              } else {
                console.error("[1-prompt SW] chrome.sidePanel.open is not available");
              }
            } else {
              console.error(
                "[1-prompt SW] Could not find windowId to open side panel"
              );
            }
          } catch (err) {
            console.error("[1-prompt SW] Failed to open side panel:", err);
          }
        })();
        sendResponse({ success: true });
        break;
      }
      case "EXTRACTION_FROM_PAGE": {
        const { result, mode } = message;
        lastExtractionResult = result;
        console.log(
          `[1-prompt SW] Received EXTRACTION_FROM_PAGE with ${result.prompts.length} prompts, mode: ${mode}`
        );
        const windowId = sender.tab?.windowId;
        if (windowId) {
          chrome.sidePanel.open({ windowId }).catch(() => {
          });
        }
        if (mode === "compile" && result.prompts.length > 0) {
          console.log(
            "[1-prompt SW] Mode is COMPILE - using reliable summarization..."
          );
          chrome.runtime.sendMessage({
            action: "EXTRACTION_STARTED",
            mode
          }).catch(() => {
          });
          (async () => {
            let localResult = null;
            try {
              console.log("[1-prompt SW] Running local summarization...");
              localResult = await localSummarizer.summarize(result.prompts);
              chrome.runtime.sendMessage({
                action: "EXTRACTION_FROM_PAGE_RESULT",
                result: {
                  ...result,
                  summary: localResult.summary,
                  promptCount: localResult.promptCount,
                  model: "Local (Reliable)",
                  provider: "client-side"
                },
                mode
              }).catch(() => {
              });
              console.log("[1-prompt SW] Local compilation complete and broadcasted");
              console.log("[1-prompt SW] Attempting AI enhancement...");
              const userId = await getCurrentUserId();
              const aiTimeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("AI enhancement timed out after 10 seconds")), 1e4);
              });
              const aiSummaryResult = await Promise.race([
                aiSummarizer.summarize(result.prompts, { userId: userId || void 0 }),
                aiTimeoutPromise
              ]);
              console.log("[1-prompt SW] AI enhancement successful, broadcasting upgrade");
              chrome.runtime.sendMessage({
                action: "EXTRACTION_FROM_PAGE_RESULT",
                result: {
                  ...result,
                  summary: aiSummaryResult.summary,
                  promptCount: aiSummaryResult.promptCount,
                  model: aiSummaryResult.model,
                  provider: aiSummaryResult.provider
                },
                mode
              }).catch(() => {
              });
            } catch (error) {
              console.log("[1-prompt SW] AI enhancement failed, sending local result as final:", error.message);
              chrome.runtime.sendMessage({
                action: "EXTRACTION_FROM_PAGE_RESULT",
                result: {
                  ...result,
                  summary: localResult.summary,
                  promptCount: localResult.promptCount,
                  model: "Local (AI Failed)",
                  provider: "client-side-fallback"
                },
                mode
              }).catch(() => {
              });
            }
          })();
        } else {
          console.log(
            "[1-prompt SW] Broadcasting EXTRACTION_FROM_PAGE_RESULT via sendMessage..."
          );
          chrome.runtime.sendMessage({
            action: "EXTRACTION_FROM_PAGE_RESULT",
            result,
            mode
          }).catch(() => {
          });
        }
        console.log("[1-prompt SW] ✅ Result broadcast complete");
        sendResponse({ success: true });
        break;
      }
      case "EXTRACTION_RESULT": {
        const { result, mode } = message;
        lastExtractionResult = result;
        if (sender.tab && mode === "compile" && result.prompts.length > 0 && !result.summary) {
          console.log(
            "[1-prompt SW] Mode is COMPILE - using reliable summarization..."
          );
          (async () => {
            try {
              console.log("[1-prompt SW] Running local summarization...");
              const localResult = await localSummarizer.summarize(result.prompts);
              const updatedResult = {
                ...result,
                summary: localResult.summary,
                promptCount: localResult.promptCount,
                model: "Local (Reliable)",
                provider: "client-side"
              };
              lastExtractionResult = updatedResult;
              broadcastToSidePanels({
                action: "EXTRACTION_RESULT",
                result: updatedResult,
                mode
              });
              console.log("[1-prompt SW] Local compilation complete and broadcasted");
              console.log("[1-prompt SW] Attempting AI enhancement...");
              const userId = await getCurrentUserId();
              const aiTimeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("AI enhancement timed out after 10 seconds")), 1e4);
              });
              const aiSummaryResult = await Promise.race([
                aiSummarizer.summarize(result.prompts, { userId: userId || void 0 }),
                aiTimeoutPromise
              ]);
              console.log("[1-prompt SW] AI enhancement successful, broadcasting upgrade");
              const aiUpdatedResult = {
                ...result,
                summary: aiSummaryResult.summary,
                promptCount: aiSummaryResult.promptCount,
                model: aiSummaryResult.model,
                provider: aiSummaryResult.provider
              };
              lastExtractionResult = aiUpdatedResult;
              broadcastToSidePanels({
                action: "EXTRACTION_RESULT",
                result: aiUpdatedResult,
                mode
              });
            } catch (error) {
              console.log("[1-prompt SW] AI enhancement failed, keeping local result:", error.message);
            }
          })();
        } else {
          broadcastToSidePanels({
            action: "EXTRACTION_RESULT",
            result,
            mode
          });
        }
        sendResponse({ success: true });
        break;
      }
      case "RE_SUMMARIZE": {
        if (!lastExtractionResult || !lastExtractionResult.prompts.length) {
          sendResponse({
            success: false,
            error: "No prompts available to refine"
          });
          break;
        }
        console.log("[1-prompt SW] RE_SUMMARIZE requested");
        (async () => {
          try {
            console.log("[1-prompt SW] Running local re-summarization...");
            const localResult = await localSummarizer.summarize(lastExtractionResult.prompts);
            const updatedResult = {
              ...lastExtractionResult,
              summary: localResult.summary,
              promptCount: localResult.promptCount,
              model: "Local (Reliable)",
              provider: "client-side"
            };
            lastExtractionResult = updatedResult;
            broadcastToSidePanels({
              action: "EXTRACTION_RESULT",
              result: updatedResult,
              mode: "compile"
            });
            console.log("[1-prompt SW] Local re-summarization complete and broadcasted");
            console.log("[1-prompt SW] Attempting AI re-enhancement...");
            const userId = await getCurrentUserId();
            const aiTimeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error("AI re-enhancement timed out after 10 seconds")), 1e4);
            });
            const aiSummaryResult = await Promise.race([
              aiSummarizer.summarize(lastExtractionResult.prompts, { userId: userId || void 0 }),
              aiTimeoutPromise
            ]);
            console.log("[1-prompt SW] AI re-enhancement successful, broadcasting upgrade");
            const aiUpdatedResult = {
              ...lastExtractionResult,
              summary: aiSummaryResult.summary,
              promptCount: aiSummaryResult.promptCount,
              model: aiSummaryResult.model,
              provider: aiSummaryResult.provider
            };
            lastExtractionResult = aiUpdatedResult;
            broadcastToSidePanels({
              action: "EXTRACTION_RESULT",
              result: aiUpdatedResult,
              mode: "compile"
            });
          } catch (error) {
            console.log("[1-prompt SW] AI re-enhancement failed, keeping local result:", error.message);
          }
        })();
        sendResponse({ success: true });
        break;
      }
      case "STATUS_RESULT": {
        broadcastToSidePanels(message);
        sendResponse({ success: true });
        break;
      }
      case "EXTRACT_TRIGERED_FROM_PAGE": {
        console.log(
          "[1-prompt] Broadcasting page extraction trigger to sidepanel"
        );
        pendingTrigger = { timestamp: Date.now() };
        broadcastToSidePanels(message);
        sendResponse({ success: true });
        break;
      }
      case "SAVE_SESSION_PROMPTS": {
        const { prompts, platform, conversationId } = message;
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const key = conversationId ? `keylog_${platform}_${conversationId}` : `keylog_${platform}_${today}`;
        chrome.storage.local.get([key], (result) => {
          const existing = result[key] || [];
          const merged = [...existing];
          const existingContent = new Set(
            existing.map((p) => normalizeContent(p.content))
          );
          for (const prompt of prompts) {
            const normalized = normalizeContent(prompt.content);
            if (!existingContent.has(normalized)) {
              merged.push({
                ...prompt,
                conversationId: conversationId || prompt.conversationId,
                savedAt: Date.now()
              });
              existingContent.add(normalized);
            }
          }
          chrome.storage.local.set({ [key]: merged });
          getCurrentUserId().then((_userId) => {
            trackDailyMetrics(prompts.length);
          });
        });
        sendResponse({ success: true });
        break;
      }
      case "GET_CONVERSATION_LOGS":
        {
          const { platform, conversationId } = message;
          const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          const specificKey = `keylog_${platform}_${conversationId}`;
          const generalKey = `keylog_${platform}_${today}`;
          chrome.storage.local.get(
            [specificKey, generalKey],
            async (result) => {
              let conversationLogs = result[specificKey] || [];
              if (conversationLogs.length === 0 && result[generalKey]) {
                conversationLogs = result[generalKey].filter(
                  (log) => log.conversationId === conversationId
                );
              }
              const userId = await getCurrentUserId();
              if (userId && conversationLogs.length < 5) {
                console.log(
                  "[1-prompt] Local logs sparse, fetching from cloud..."
                );
                const cloudLogs = [];
                if (cloudLogs.length > 0) {
                  const localContent = new Set(
                    conversationLogs.map((p) => p.content)
                  );
                  const merged = [...conversationLogs];
                  for (const cloudPrompt of cloudLogs) {
                    if (!localContent.has(cloudPrompt.content)) {
                      merged.push(cloudPrompt);
                    }
                  }
                  conversationLogs = merged.sort(
                    (a, b) => a.timestamp - b.timestamp
                  );
                  chrome.storage.local.set({ [specificKey]: conversationLogs });
                }
              }
              sendResponse({
                success: true,
                prompts: conversationLogs
              });
            }
          );
          return true;
        }
        async function handleSyncToCloud(prompts, platform, sendResponse2) {
          try {
            const userId = await getCurrentUserId();
            if (!userId) {
              sendResponse2({ success: false, error: "Not logged in" });
              return;
            }
            const byConversation = /* @__PURE__ */ new Map();
            for (const prompt of prompts) {
              const convId = prompt.conversationId || "default";
              if (!byConversation.has(convId)) {
                byConversation.set(convId, []);
              }
              byConversation.get(convId).push({
                content: prompt.content,
                timestamp: prompt.timestamp,
                conversationId: convId,
                platform,
                captureMethod: prompt.captureMethod
              });
            }
            console.log(
              `[1-prompt] Processing ${prompts.length} prompts for sync (local only)`
            );
            console.log(
              `[1-prompt] Queued ${prompts.length} prompts for cloud sync`
            );
            sendResponse2({ success: true, synced: prompts.length });
          } catch (err) {
            console.error("[1-prompt] Sync error:", err);
            sendResponse2({ success: false, error: String(err) });
          }
        }
      case "CHECK_SIDEPANEL_OPEN": {
        sendResponse({ isOpen: true });
        break;
      }
      case "GET_SYNC_STATUS": {
        sendResponse({
          success: true,
          queueSize: 0,
          isWriting: false
        });
        break;
      }
      default:
        sendResponse({ success: false, error: "Unknown action" });
    }
    return true;
  }
);
async function withKeepAlive(operation) {
  let port = chrome.runtime.connect({
    name: "keep-alive"
  });
  const keepAlive = setInterval(() => {
    if (port) {
      port.postMessage({ action: "ping" });
    } else {
      port = chrome.runtime.connect({ name: "keep-alive" });
    }
  }, 25e3);
  port.onDisconnect.addListener(() => {
    port = null;
  });
  try {
    return await operation();
  } finally {
    clearInterval(keepAlive);
    if (port) port.disconnect();
  }
}
const injectedTabs = /* @__PURE__ */ new Set();
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});
chrome.webNavigation?.onHistoryStateUpdated.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const platform = detectPlatformFromUrl(details.url);
  if (!platform) return;
  if (injectedTabs.has(details.tabId)) {
    try {
      chrome.tabs.sendMessage(details.tabId, {
        action: "URL_CHANGED",
        url: details.url
      });
      console.log(
        `[1-prompt] Notified content script of URL change for ${platform}`
      );
    } catch (err) {
      injectedTabs.delete(details.tabId);
    }
    return;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ["content.js"]
    });
    injectedTabs.add(details.tabId);
    console.log(`[1-prompt] Injected content script for ${platform}`);
  } catch (err) {
    console.warn(`[1-prompt] Could not inject content script:`, err);
  }
});
async function handleSidePanelMessage(message) {
  console.log("[1-prompt] Side panel message:", message.action);
  switch (message.action) {
    case "EXTRACT_PROMPTS": {
      const mode = message.mode;
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });
      if (tab?.id) {
        console.log("[1-prompt] Sending EXTRACT_PROMPTS to tab:", tab.id);
        let retryCount = 0;
        const maxRetries = 3;
        let messageTimeout = null;
        const sendMessage = () => {
          messageTimeout = setTimeout(() => {
            if (retryCount < maxRetries) {
              console.warn(
                `[1-prompt] No response from tab ${tab.id}, retrying... (attempt ${retryCount + 1}/${maxRetries})`
              );
              retryCount++;
              sendMessage();
            } else {
              broadcastToSidePanels({
                action: "ERROR",
                error: "Content script not responding. Please refresh the page and try again."
              });
            }
          }, 1e4);
          chrome.tabs.sendMessage(
            tab.id,
            { action: "EXTRACT_PROMPTS", mode },
            (response) => {
              if (messageTimeout !== null) {
                clearTimeout(messageTimeout);
                messageTimeout = null;
              }
              if (chrome.runtime.lastError) {
                console.error(
                  "[1-prompt] Error sending to tab:",
                  chrome.runtime.lastError
                );
                if (retryCount < maxRetries) {
                  console.warn(
                    `[1-prompt] Retrying message send... (attempt ${retryCount + 1}/${maxRetries})`
                  );
                  retryCount++;
                  sendMessage();
                } else {
                  broadcastToSidePanels({
                    action: "ERROR",
                    error: "Could not connect to the page. Please refresh and try again."
                  });
                }
              } else {
                console.log(
                  "[1-prompt] Content script acknowledged extraction:",
                  response
                );
              }
            }
          );
        };
        sendMessage();
      } else {
        broadcastToSidePanels({
          action: "ERROR",
          error: "No active tab found. Please make sure a chat page is open."
        });
      }
      break;
    }
    case "GET_STATUS": {
      checkActiveTabStatus();
      break;
    }
    case "SUMMARIZE_PROMPTS": {
      const { prompts, userId, userEmail, authToken } = message;
      (async () => {
        try {
          console.log(`[1-prompt] Summarizing ${prompts.length} prompts reliably...`);
          console.log("[1-prompt] Running local summarization...");
          const localResult = await localSummarizer.summarize(prompts);
          broadcastToSidePanels({
            action: "SUMMARY_RESULT",
            result: localResult,
            success: true
          });
          console.log("[1-prompt] Local compilation complete and broadcasted");
          console.log("[1-prompt] Attempting AI enhancement...");
          const aiTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("AI enhancement timed out after 10 seconds")), 1e4);
          });
          const aiResult = await Promise.race([
            withKeepAlive(async () => {
              return await aiSummarizer.summarize(prompts, {
                userId,
                userEmail,
                authToken
              });
            }),
            aiTimeoutPromise
          ]);
          console.log("[1-prompt] AI enhancement successful, broadcasting upgrade");
          broadcastToSidePanels({
            action: "SUMMARY_RESULT",
            result: aiResult,
            success: true
          });
        } catch (error) {
          console.log("[1-prompt] AI enhancement failed, keeping local result:", error instanceof Error ? error.message : String(error));
        }
      })();
      break;
    }
  }
}
function broadcastToSidePanels(message) {
  chrome.runtime.sendMessage(message).catch(() => {
  });
}
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[1-prompt] Extension installed:", details.reason);
  if (details.reason === "install") {
    const { hasSeenWelcome } = await chrome.storage.local.get("hasSeenWelcome");
    if (!hasSeenWelcome) {
      chrome.tabs.create({ url: "https://1-prompt.in/install" });
      chrome.storage.local.set({ hasSeenWelcome: true });
    }
    if (chrome.sidePanel && chrome.sidePanel.setOptions) {
      chrome.sidePanel.setOptions({
        enabled: true,
        path: "sidepanel/index.html"
      });
    }
  }
});
if (chrome.runtime.setUninstallURL) {
  const isDevelopment = !("update_url" in chrome.runtime.getManifest());
  if (!isDevelopment) {
    chrome.runtime.setUninstallURL("https://1-prompt.in/can't-say-goodbye");
  } else {
    console.log("[1-prompt] Development mode detected: skipping setUninstallURL");
  }
}
chrome.tabs.onActivated.addListener(() => {
  checkActiveTabStatus();
});
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    checkActiveTabStatus();
  }
});
async function checkActiveTabStatus() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    console.log("[1-prompt] Checking tab status:", tab?.url?.substring(0, 50));
    if (!tab?.id) {
      console.log("[1-prompt] No active tab found");
      return;
    }
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:")) {
      console.log("[1-prompt] Restricted URL, sending unsupported");
      broadcastToSidePanels({
        action: "STATUS_RESULT",
        supported: false,
        platform: null
      });
      return;
    }
    const platform = detectPlatformFromUrl(tab.url);
    console.log("[1-prompt] URL-based platform detection:", platform);
    chrome.tabs.sendMessage(
      tab.id,
      { action: "GET_STATUS" },
      async (response) => {
        if (chrome.runtime.lastError) {
          console.log(
            "[1-prompt] Content script not ready:",
            chrome.runtime.lastError.message
          );
          if (platform) {
            console.log(
              "[1-prompt] Auto-injecting content script for",
              platform
            );
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content.js"]
              });
              console.log(
                "[1-prompt] ✅ Content script auto-injected successfully"
              );
              setTimeout(() => {
                chrome.tabs.sendMessage(
                  tab.id,
                  { action: "GET_STATUS" },
                  (retryResponse) => {
                    if (retryResponse) {
                      console.log(
                        "[1-prompt] Content script now responding after auto-inject"
                      );
                      broadcastToSidePanels(retryResponse);
                    } else {
                      broadcastToSidePanels({
                        action: "STATUS_RESULT",
                        supported: false,
                        platform
                      });
                    }
                  }
                );
              }, 500);
            } catch (injectErr) {
              console.warn("[1-prompt] Auto-inject failed:", injectErr);
              broadcastToSidePanels({
                action: "STATUS_RESULT",
                supported: false,
                platform
              });
            }
          } else {
            broadcastToSidePanels({
              action: "STATUS_RESULT",
              supported: false,
              platform: null
            });
          }
        } else if (response) {
          console.log("[1-prompt] Content script responded:", response);
          broadcastToSidePanels(response);
        }
      }
    );
  } catch (e) {
    console.error("[1-prompt] Error checking tab status:", e);
  }
}
function detectPlatformFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    if (hostname.includes("chatgpt.com") || hostname.includes("chat.openai.com") || hostname.includes("openai.com") && pathname.includes("chat")) {
      return "ChatGPT";
    }
    if (hostname.includes("claude.ai") || hostname.includes("anthropic.com")) {
      return "Claude";
    }
    if (hostname.includes("gemini.google.com") || hostname.includes("bard.google.com") || hostname.includes("google.com") && (pathname.includes("gemini") || pathname.includes("bard"))) {
      return "Gemini";
    }
    if (hostname.includes("perplexity.ai") || hostname.includes("perplexity.com")) {
      return "Perplexity";
    }
    if (hostname.includes("deepseek.com") || hostname.includes("chat.deepseek.com")) {
      return "DeepSeek";
    }
    if (hostname.includes("lovable.dev") || hostname.includes("lovable.ai") || hostname.includes("gptengineer.app") || hostname.includes("run.gptengineer.app")) {
      return "Lovable";
    }
    if (hostname.includes("bolt.new") || hostname.includes("bolt.dev") || hostname.includes("stackblitz.com")) {
      return "Bolt.new";
    }
    if (hostname.includes("cursor.sh") || hostname.includes("cursor.com") || hostname.includes("cursor.ai")) {
      return "Cursor";
    }
    if (hostname.includes("meta.ai") || hostname.includes("ai.meta.com") || hostname.includes("facebook.com") && pathname.includes("ai")) {
      return "Meta AI";
    }
    if (hostname.includes("meta.ai")) return "Meta AI";
    return null;
  } catch (e) {
    return null;
  }
}
chrome.commands.onCommand.addListener(async (command) => {
  console.log("[1-prompt] Command received:", command);
  if (command === "extract-prompts") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    if (tab?.id) {
      try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } catch (e) {
        console.warn("[1-prompt] Could not open side panel via command:", e);
      }
      chrome.tabs.sendMessage(tab.id, {
        action: "EXTRACT_PROMPTS",
        mode: "raw"
      });
    }
  }
});
function normalizeContent(text) {
  return text.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 200);
}
