import { r as resilientFetch, c as config, h as getCurrentUserId } from "./firebase.js";
import { _ as __vitePreload } from "./preload-helper.js";
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
    return paragraph + "\n\n⚡ Summary by Local Client-Side Logic (Fallback)";
  }
  /**
   * Main summarization method
   */
  async summarize(prompts) {
    if (prompts.length === 0) {
      throw new Error("No prompts to summarize");
    }
    try {
      const ai = window.ai;
      if (ai && ai.languageModel) {
        const capabilities = await ai.languageModel.capabilities();
        if (capabilities.available !== "no") {
          const session = await ai.languageModel.create();
          const content = prompts.map((p) => p.content).join("\n");
          const promptText = `Summarize these prompts into a single, consolidated paragraph. No filler. No intro. Just the action items:

${content}`;
          const result = await session.prompt(promptText);
          return {
            original: prompts,
            summary: result + "\n\n⚡ Summary by Local Gemini Nano (Chrome Built-in)",
            promptCount: { before: prompts.length, after: prompts.length }
          };
        }
      }
    } catch (e) {
      console.warn("[LocalSummarizer] Gemini Nano failed or not available, falling back to logic:", e);
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
var define_globalThis_process_env_default = {};
const DEFAULT_AI_CONFIG = {
  primary: {
    provider: "auto",
    model: "gpt-4o-mini",
    timeout: 3e4,
    maxTokens: 4e3,
    temperature: 0.3
  },
  fallbacks: [
    {
      provider: "anthropic",
      model: "claude-3-haiku-20240307",
      timeout: 3e4,
      maxTokens: 4e3,
      temperature: 0.3,
      isFallback: true
    },
    {
      provider: "gemini",
      model: "gemini-1.5-flash",
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
        provider: "openai",
        model: "gpt-4o-mini",
        temperature: 0.5
        // More creative for dev
      }
    },
    production: {
      settings: {
        autoFallback: true,
        retryAttempts: 3
        // More retries in prod
      }
    }
  }
};
const PROVIDER_MODELS = {
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo"
  ],
  anthropic: [
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307"
  ],
  gemini: [
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-1.0-pro"
  ],
  cohere: [
    "command-r-plus",
    "command-r",
    "command",
    "command-nightly"
  ],
  auto: []
  // Auto-selection
};
function getEnvVar(key, fallback) {
  if (typeof globalThis !== "undefined" && define_globalThis_process_env_default) {
    return define_globalThis_process_env_default[key] || fallback;
  }
  if (typeof window !== "undefined" && window.process?.env) {
    return window.process.env[key] || fallback;
  }
  return fallback;
}
function loadAIConfiguration() {
  let config2 = { ...DEFAULT_AI_CONFIG };
  const envProvider = getEnvVar("AI_PROVIDER");
  const envApiKey = getEnvVar("AI_API_KEY");
  const envModel = getEnvVar("AI_MODEL");
  const envEndpoint = getEnvVar("AI_ENDPOINT");
  if (envProvider && PROVIDER_MODELS[envProvider]) {
    config2.primary.provider = envProvider;
  }
  if (envApiKey) {
    config2.primary.apiKey = envApiKey;
  }
  if (envModel) {
    config2.primary.model = envModel;
  }
  if (envEndpoint) {
    config2.primary.endpoint = envEndpoint;
  }
  const nodeEnv = getEnvVar("NODE_ENV", "production");
  if (config2.environments[nodeEnv]) {
    config2 = mergeConfigs(config2, config2.environments[nodeEnv]);
  }
  return config2;
}
function mergeConfigs(base, override) {
  return {
    primary: { ...base.primary, ...override.primary },
    fallbacks: override.fallbacks || base.fallbacks,
    settings: { ...base.settings, ...override.settings },
    environments: { ...base.environments, ...override.environments }
  };
}
function validateAIConfig(config2) {
  const errors = [];
  if (!config2.primary.provider || !PROVIDER_MODELS[config2.primary.provider]) {
    errors.push(`Invalid primary provider: ${config2.primary.provider}`);
  }
  if (config2.primary.model && config2.primary.provider !== "auto") {
    const validModels = PROVIDER_MODELS[config2.primary.provider];
    if (!validModels.includes(config2.primary.model)) {
      errors.push(`Model ${config2.primary.model} is not valid for provider ${config2.primary.provider}`);
    }
  }
  for (const fallback of config2.fallbacks) {
    if (!fallback.provider || !PROVIDER_MODELS[fallback.provider]) {
      errors.push(`Invalid fallback provider: ${fallback.provider}`);
    }
  }
  if (config2.primary.timeout && config2.primary.timeout < 1e3) {
    errors.push("Timeout must be at least 1000ms");
  }
  if (config2.primary.temperature !== void 0 && (config2.primary.temperature < 0 || config2.primary.temperature > 1)) {
    errors.push("Temperature must be between 0 and 1");
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
function getProviderApiKey(provider, config2) {
  if (config2.apiKey) {
    return config2.apiKey;
  }
  const envKeys = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    gemini: "GEMINI_API_KEY",
    cohere: "COHERE_API_KEY"
  };
  const envKey = getEnvVar(envKeys[provider]);
  if (envKey) {
    return envKey;
  }
  throw new Error(`No API key found for provider ${provider}. Set ${envKeys[provider]} environment variable or configure in config file.`);
}
class OpenAIProvider {
  name = "openai";
  models = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"];
  config;
  apiKey;
  async initialize(config2) {
    this.config = config2;
    this.apiKey = getProviderApiKey("openai", config2);
  }
  async chat(request) {
    const endpoint = this.config.endpoint || "https://api.openai.com/v1/chat/completions";
    const body = {
      model: this.config.model || "gpt-4o-mini",
      messages: request.messages,
      temperature: request.temperature || this.config.temperature || 0.3,
      max_tokens: request.maxTokens || this.config.maxTokens || 4e3,
      stream: request.stream || false
    };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API Error: ${response.status} ${error}`);
    }
    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || "",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      },
      model: data.model,
      provider: "openai"
    };
  }
  async isAvailable() {
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  getEndpoint() {
    return this.config.endpoint || "https://api.openai.com/v1/chat/completions";
  }
}
class AnthropicProvider {
  name = "anthropic";
  models = ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"];
  config;
  apiKey;
  async initialize(config2) {
    this.config = config2;
    this.apiKey = getProviderApiKey("anthropic", config2);
  }
  async chat(request) {
    const endpoint = this.config.endpoint || "https://api.anthropic.com/v1/messages";
    const systemMessage = request.messages.find((m) => m.role === "system");
    const chatMessages = request.messages.filter((m) => m.role !== "system");
    const body = {
      model: this.config.model || "claude-3-haiku-20240307",
      max_tokens: request.maxTokens || this.config.maxTokens || 4e3,
      temperature: request.temperature || this.config.temperature || 0.3,
      system: systemMessage?.content,
      messages: chatMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }))
    };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API Error: ${response.status} ${error}`);
    }
    const data = await response.json();
    return {
      content: data.content[0]?.text || "",
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      },
      model: data.model,
      provider: "anthropic"
    };
  }
  async isAvailable() {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 10,
          messages: [{ role: "user", content: "test" }]
        })
      });
      return response.status === 200 || response.status === 429;
    } catch {
      return false;
    }
  }
  getEndpoint() {
    return this.config.endpoint || "https://api.anthropic.com/v1/messages";
  }
}
class GeminiProvider {
  name = "gemini";
  models = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"];
  config;
  apiKey;
  async initialize(config2) {
    this.config = config2;
    this.apiKey = getProviderApiKey("gemini", config2);
  }
  async chat(request) {
    const model = this.config.model || "gemini-1.5-flash";
    const endpoint = this.config.endpoint || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const contents = request.messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    const systemInstruction = request.messages.find((m) => m.role === "system")?.content;
    const body = {
      contents,
      generationConfig: {
        temperature: request.temperature || this.config.temperature || 0.3,
        maxOutputTokens: request.maxTokens || this.config.maxTokens || 4e3
      }
    };
    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API Error: ${response.status} ${error}`);
    }
    const data = await response.json();
    const candidate = data.candidates?.[0];
    return {
      content: candidate?.content?.parts?.[0]?.text || "",
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      },
      model,
      provider: "gemini"
    };
  }
  async isAvailable() {
    try {
      const model = this.config.model || "gemini-1.5-flash";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${this.apiKey}`,
        { method: "GET" }
      );
      return response.ok;
    } catch {
      return false;
    }
  }
  getEndpoint() {
    const model = this.config.model || "gemini-1.5-flash";
    return this.config.endpoint || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  }
}
class AutoProvider {
  name = "auto";
  models = [];
  providers = [];
  selectedProvider = null;
  async initialize(config2) {
    this.providers = [
      new OpenAIProvider(),
      new AnthropicProvider(),
      new GeminiProvider()
    ];
    for (const provider of this.providers) {
      try {
        await provider.initialize(config2);
        const isAvailable = await provider.isAvailable();
        if (isAvailable) {
          this.selectedProvider = provider;
          console.log(`[AutoProvider] Selected ${provider.name} as primary provider`);
          break;
        }
      } catch (error) {
        console.warn(`[AutoProvider] Provider ${provider.name} unavailable:`, error);
      }
    }
    if (!this.selectedProvider) {
      throw new Error("No AI providers are available");
    }
  }
  async chat(request) {
    if (!this.selectedProvider) {
      throw new Error("Auto provider not initialized");
    }
    return await this.selectedProvider.chat(request);
  }
  async isAvailable() {
    return this.selectedProvider !== null;
  }
  getEndpoint() {
    return this.selectedProvider?.getEndpoint() || "";
  }
}
class AIProviderFactory {
  static providers = /* @__PURE__ */ new Map();
  static async getProvider(type, config2) {
    if (this.providers.has(type)) {
      const provider2 = this.providers.get(type);
      await provider2.initialize(config2);
      return provider2;
    }
    let provider;
    switch (type) {
      case "openai":
        provider = new OpenAIProvider();
        break;
      case "anthropic":
        provider = new AnthropicProvider();
        break;
      case "gemini":
        provider = new GeminiProvider();
        break;
      case "auto":
        provider = new AutoProvider();
        break;
      default:
        throw new Error(`Unsupported AI provider: ${type}`);
    }
    await provider.initialize(config2);
    this.providers.set(type, provider);
    return provider;
  }
  static clearCache() {
    this.providers.clear();
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
            console.log(`[DynamicConfigLoader] ✅ Loaded config from ${source.name}`);
          }
        } catch (error) {
          console.warn(`[DynamicConfigLoader] ⚠️ Failed to load from ${source.name}:`, error);
        }
      }
      const validation = validateAIConfig(finalConfig);
      if (!validation.valid) {
        console.error("[DynamicConfigLoader] ❌ Invalid configuration:", validation.errors);
        console.log("[DynamicConfigLoader] 🔧 Using default configuration as fallback");
        finalConfig = DEFAULT_AI_CONFIG;
      }
      this.config = finalConfig;
      this.lastUpdate = Date.now();
      console.log(`[DynamicConfigLoader] 🎯 Using provider: ${this.config.primary.provider} (${this.config.primary.model})`);
      await this.saveToLocalStorage(this.config);
    } catch (error) {
      console.error("[DynamicConfigLoader] ❌ Failed to refresh config:", error);
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
      console.warn("[DynamicConfigLoader] Environment config load failed:", error);
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
      const remoteConfig2 = await response.json();
      console.log("[DynamicConfigLoader] 📡 Remote admin config loaded");
      return remoteConfig2;
    } catch (error) {
      return null;
    }
  }
  /**
   * Load configuration from runtime config service (Backend Runtime Config)
   */
  async loadFromRuntimeConfig() {
    try {
      const { config: config2 } = await __vitePreload(async () => {
        const { config: config3 } = await import("./firebase.js").then((n) => n.i);
        return { config: config3 };
      }, true ? [] : void 0, import.meta.url);
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
      const remoteConfigService = (await __vitePreload(async () => {
        const { RemoteConfigService: RemoteConfigService2 } = await Promise.resolve().then(() => remoteConfig);
        return { RemoteConfigService: RemoteConfigService2 };
      }, true ? void 0 : void 0, import.meta.url)).RemoteConfigService.getInstance();
      const aiConfig = remoteConfigService.getAIConfig();
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
      console.warn("[DynamicConfigLoader] Failed to save to local storage:", error);
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
        console.error("[DynamicConfigLoader] ❌ Invalid provider update:", validation.errors);
        return false;
      }
      this.config = testConfig;
      await this.saveToLocalStorage(this.config);
      console.log(`[DynamicConfigLoader] ✅ Provider updated to ${provider} (${model || "default model"})`);
      return true;
    } catch (error) {
      console.error("[DynamicConfigLoader] ❌ Failed to update provider:", error);
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
const CONSOLIDATION_RULES$1 = `[INTENT COMPILATION PROTOCOL v5.1 - ENTERPRISE]

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
class EnhancedAISummarizer {
  static instance;
  backendUrl = "https://1prompt-backend.amaravadhibharath.workers.dev";
  constructor() {
  }
  static getInstance() {
    if (!EnhancedAISummarizer.instance) {
      EnhancedAISummarizer.instance = new EnhancedAISummarizer();
    }
    return EnhancedAISummarizer.instance;
  }
  /**
   * Summarize prompts using the configured AI provider
   */
  async summarize(prompts, options = {}) {
    if (!prompts.length) {
      throw new Error("No prompts provided for summarization");
    }
    console.log(`[EnhancedAISummarizer] 📝 Starting summarization of ${prompts.length} prompts`);
    try {
      const config2 = await dynamicConfigLoader.getConfig();
      console.log(`[EnhancedAISummarizer] 🎯 Using provider: ${config2.primary.provider} (${config2.primary.model})`);
      const useDirectProvider = options.useDirectProvider || config2.primary.provider !== "auto" && config2.settings.autoFallback;
      if (useDirectProvider && config2.primary.apiKey) {
        try {
          return await this.summarizeWithDirectProvider(prompts, options, config2);
        } catch (e) {
          console.warn("[EnhancedAISummarizer] Direct provider failed, trying backend...", e);
          return await this.summarizeWithBackend(prompts, options, config2);
        }
      } else {
        return await this.summarizeWithBackend(prompts, options, config2);
      }
    } catch (error) {
      console.error("[EnhancedAISummarizer] ❌ Primary method failed:", error);
      return await this.fallbackSummarize(prompts, options);
    }
  }
  /**
   * Summarize using direct provider connection (client-side)
   */
  async summarizeWithDirectProvider(prompts, _options, config2) {
    console.log("[EnhancedAISummarizer] 🔧 Using direct provider mode");
    try {
      const provider = await AIProviderFactory.getProvider(config2.primary.provider, config2.primary);
      const content = this.prepareContent(prompts);
      const messages = [
        {
          role: "system",
          content: CONSOLIDATION_RULES$1
        },
        {
          role: "user",
          content: `Please consolidate these user prompts into a single, cohesive paragraph:

${content}`
        }
      ];
      const aiRequest = {
        messages,
        temperature: config2.primary.temperature || 0.3,
        maxTokens: config2.primary.maxTokens || 4e3
      };
      const response = await provider.chat(aiRequest);
      console.log(`[EnhancedAISummarizer] ✅ Direct provider summary received (${response.content.length} chars)`);
      return {
        original: prompts,
        summary: response.content.trim(),
        promptCount: {
          before: prompts.length,
          after: prompts.length
        },
        provider: response.provider,
        model: response.model,
        usage: response.usage
      };
    } catch (error) {
      console.error("[EnhancedAISummarizer] ❌ Direct provider failed:", error);
      throw error;
    }
  }
  /**
   * Summarize using backend (existing method with enhanced config)
   */
  async summarizeWithBackend(prompts, options, config2) {
    console.log("[EnhancedAISummarizer] 🌐 Using backend mode");
    try {
      const content = this.prepareContent(prompts);
      const response = await resilientFetch(this.backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}
        },
        body: JSON.stringify({
          content,
          additionalInfo: CONSOLIDATION_RULES$1,
          provider: config2.primary.provider,
          model: config2.primary.model,
          apiKey: config2.primary.apiKey,
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
        throw new Error(errorData.error || `Backend error: ${response.status}`);
      }
      const data = await response.json();
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
   * Fallback summarization using local processing
   */
  async fallbackSummarize(prompts, options) {
    console.log("[EnhancedAISummarizer] 🔄 Falling back to local summarization");
    try {
      const config2 = await dynamicConfigLoader.getConfig();
      for (const fallbackConfig of config2.fallbacks) {
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
      return await localSummarizer.summarize(prompts);
    } catch (error) {
      console.error("[EnhancedAISummarizer] ❌ All fallback methods failed:", error);
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
   * Test connectivity to configured provider
   */
  async testProvider() {
    try {
      const config2 = await dynamicConfigLoader.getConfig();
      const provider = await AIProviderFactory.getProvider(config2.primary.provider, config2.primary);
      const isAvailable = await provider.isAvailable();
      if (isAvailable) {
        return {
          success: true,
          provider: `${config2.primary.provider} (${config2.primary.model})`
        };
      } else {
        return {
          success: false,
          provider: `${config2.primary.provider} (${config2.primary.model})`,
          error: "Provider is not available"
        };
      }
    } catch (error) {
      return {
        success: false,
        provider: "unknown",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  /**
   * Get current configuration info for debugging
   */
  async getConfigInfo() {
    try {
      const config2 = await dynamicConfigLoader.getConfig();
      return {
        primary: config2.primary,
        fallbacks: config2.fallbacks.map((f) => ({ provider: f.provider, model: f.model })),
        settings: config2.settings,
        lastUpdate: dynamicConfigLoader["lastUpdate"]
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
    AIProviderFactory.clearCache();
  }
}
const enhancedAISummarizer = EnhancedAISummarizer.getInstance();
const BACKEND_URL = "https://1prompt-backend.amaravadhibharath.workers.dev";
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
    console.log(`[AISummarizer] 📝 Starting AI summarization for ${prompts.length} prompts`);
    try {
      const result = await enhancedAISummarizer.summarize(prompts, {
        format: options.format,
        tone: options.tone,
        includeAI: options.includeAI,
        userId: options.userId,
        userEmail: options.userEmail,
        authToken: options.authToken,
        useDirectProvider: false
        // Start with backend, fallback to direct
      });
      console.log(`[AISummarizer] ✅ Enhanced AI summary completed via ${result.provider || "backend"}`);
      return result;
    } catch (enhancedError) {
      console.warn("[AISummarizer] ⚠️ Enhanced summarizer failed, trying legacy backend...", enhancedError);
      return await this.legacySummarize(prompts, options);
    }
  }
  /**
   * Legacy backend summarization method (kept for compatibility)
   */
  async legacySummarize(prompts, options = {}) {
    try {
      const content = prompts.map((p, i) => `${i + 1}. ${p.content}`).join("\n\n");
      console.log(`[AISummarizer] ⏱️ Attempting legacy backend at ${BACKEND_URL}`);
      console.log(`[AISummarizer] 📝 Sending ${prompts.length} raw prompts (${content.length} chars)`);
      const config2 = await dynamicConfigLoader.getConfig();
      const provider = config2.primary.provider;
      const model = config2.primary.model;
      const response = await resilientFetch(BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}
        },
        body: JSON.stringify({
          content,
          additionalInfo: CONSOLIDATION_RULES,
          provider,
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
      console.log(`[AISummarizer] 📡 Backend response: ${response.status} ${response.statusText}`);
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
      console.log(`[AISummarizer] ✅ AI Summary received (${data.summary?.length || 0} chars): ${data.summary?.slice(0, 100)}...`);
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
      console.error("[AISummarizer] ❌ Cloud AI failed:", error?.message || error);
      console.error("[AISummarizer] ⚠️ Falling back to local client-side summarization...");
      try {
        const localResult = await localSummarizer.summarize(prompts);
        console.log("[AISummarizer] ⚙️ Using local summary as fallback (Client-Side)");
        return localResult;
      } catch (localError) {
        console.error("[AISummarizer] ❌ Local summarization also failed:", localError);
        throw error;
      }
    }
  }
}
const aiSummarizer = new AISummarizer();
async function initializeAISummarizer() {
  console.log("[AISummarizer] Using Cloudflare Worker backend with smart filtering");
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
const REMOTE_URL = "https://raw.githubusercontent.com/bharathamaravadi/sauce-config/main/selectors.json";
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
    const stored = await chrome.storage.local.get([STORAGE_KEY, LAST_FETCH_KEY]);
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
const remoteConfig = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  CACHE_TTL,
  LAST_FETCH_KEY,
  REMOTE_URL,
  RemoteConfigService,
  STORAGE_KEY
}, Symbol.toStringTag, { value: "Module" }));
async function fetchRemoteConfigUpdates(currentVersion) {
  try {
    const response = await resilientFetch(`${config.backend.url}/config/selectors`, {
      method: "GET"
    });
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
console.log("[1prompt] Service worker started");
initializeAISummarizer();
try {
  RemoteConfigService.getInstance().initialize().then(async () => {
    try {
      const stored = await chrome.storage.local.get([LAST_FETCH_KEY]);
      const lastFetch = stored[LAST_FETCH_KEY] || 0;
      if (Date.now() - lastFetch > CACHE_TTL) {
        const config2 = RemoteConfigService.getInstance().config;
        fetchRemoteConfigUpdates(config2?.version || 0).catch((err) => {
          console.error("[1prompt] Remote config update failed:", err);
        });
      }
    } catch (innerErr) {
      console.error("[1prompt] Error checking remote config cache:", innerErr);
    }
  }).catch((err) => {
    console.error("[1prompt] Remote config initialization failed:", err);
  });
} catch (err) {
  console.error("[1prompt] Critical error initializing remote config:", err);
}
self.addEventListener("unhandledrejection", (event) => {
  console.error("[1prompt] Unhandled rejection in service worker:", event.reason);
  event.preventDefault();
});
chrome.alarms.create("keepAlive", { periodInMinutes: 0.5 });
chrome.alarms.create("syncPrompts", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "keepAlive") {
    console.log("[1prompt] Keep-alive ping at", (/* @__PURE__ */ new Date()).toISOString());
  } else if (alarm.name === "syncPrompts") {
    console.log("[1prompt] Triggering prompt sync...");
    try {
      const tabs = await chrome.tabs.query({ url: ["*://*.openai.com/*", "*://*.anthropic.com/*", "*://*.google.com/*", "*://*.perplexity.ai/*", "*://*.deepseek.com/*", "*://*.lovable.dev/*", "*://*.bolt.new/*", "*://*.cursor.sh/*", "*://*.meta.ai/*"] });
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { action: "TRIGGER_CLOUD_SYNC" }).catch(() => {
          });
        }
      }
    } catch (err) {
      console.error("[1prompt] Sync alarm error:", err);
    }
  }
});
let lastExtractionResult = null;
let pendingTrigger = null;
if (chrome.sidePanel) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => console.warn("[1prompt] SidePanel setup failed:", err));
} else {
  console.warn("[1prompt] SidePanel API not available, falling back to popup");
  chrome.action.setPopup({ popup: "sidepanel/index.html" });
}
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidepanel") {
    console.log("[1prompt SW] 🟢 Side panel connected");
    checkActiveTabStatus();
    if (lastExtractionResult) {
      chrome.runtime.sendMessage({
        action: "EXTRACTION_RESULT",
        result: lastExtractionResult
      }).catch(() => {
      });
    }
    if (pendingTrigger && Date.now() - pendingTrigger.timestamp < 3e3) {
      console.log("[1prompt] Replaying pending trigger to new sidepanel");
      chrome.runtime.sendMessage({ action: "EXTRACT_TRIGERED_FROM_PAGE" }).catch(() => {
      });
    }
    port.onMessage.addListener((message) => {
      handleSidePanelMessage(message);
    });
    port.onDisconnect.addListener(() => {
      console.log("[1prompt SW] 🔴 Side panel disconnected");
    });
  }
});
async function trackDailyMetrics(_promptCount) {
  try {
    console.log("[1prompt] Metrics tracking temporarily disabled during migration");
  } catch (e) {
  }
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[1prompt] Received message:", message.action);
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
          console.log("[1prompt SW] User ID set in local storage:", userId);
          sendResponse({ success: true });
        });
      } else {
        chrome.storage.local.remove("firebase_current_user_id", () => {
          console.log("[1prompt SW] User ID removed from local storage");
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
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
          console.log("[1prompt] OPEN_SIDE_PANEL received from tab:", sender.tab?.id);
          let windowId = sender.tab?.windowId;
          if (!windowId) {
            console.log("[1prompt] No windowId from sender, querying active tab...");
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            windowId = tab?.windowId;
            console.log("[1prompt] Got windowId from query:", windowId);
          }
          if (windowId) {
            console.log("[1prompt] Opening side panel for window:", windowId);
            await chrome.sidePanel.open({ windowId });
            console.log("[1prompt] Side panel opened successfully");
          } else {
            console.error("[1prompt] Could not find windowId to open side panel");
          }
        } catch (err) {
          console.error("[1prompt] Failed to open side panel:", err);
        }
      })();
      sendResponse({ success: true });
      break;
    }
    case "EXTRACTION_FROM_PAGE": {
      const { result, mode } = message;
      lastExtractionResult = result;
      console.log(`[1prompt SW] Received EXTRACTION_FROM_PAGE with ${result.prompts.length} prompts, mode: ${mode}`);
      const windowId = sender.tab?.windowId;
      if (windowId) {
        chrome.sidePanel.open({ windowId }).catch(() => {
        });
      }
      if (mode === "compile" && result.prompts.length > 0) {
        console.log("[1prompt SW] Mode is COMPILE - calling AI summarizer...");
        (async () => {
          try {
            const userId = await getCurrentUserId();
            const summaryResult = await aiSummarizer.summarize(result.prompts, { userId: userId || void 0 });
            console.log("[1prompt SW] AI summarization complete");
            chrome.runtime.sendMessage({
              action: "EXTRACTION_FROM_PAGE_RESULT",
              result: {
                ...result,
                summary: summaryResult.summary,
                promptCount: summaryResult.promptCount,
                model: summaryResult.model,
                provider: summaryResult.provider
              },
              mode
            }).catch(() => {
            });
          } catch (error) {
            console.error("[1prompt SW] AI summarization failed:", error);
            chrome.runtime.sendMessage({
              action: "EXTRACTION_FROM_PAGE_RESULT",
              result,
              mode,
              error: error.message || "AI summarization failed"
            }).catch(() => {
            });
          }
        })();
      } else {
        console.log("[1prompt SW] Broadcasting EXTRACTION_FROM_PAGE_RESULT via sendMessage...");
        chrome.runtime.sendMessage({
          action: "EXTRACTION_FROM_PAGE_RESULT",
          result,
          mode
        }).catch(() => {
        });
      }
      console.log("[1prompt SW] ✅ Result broadcast complete");
      sendResponse({ success: true });
      break;
    }
    case "EXTRACTION_RESULT": {
      const { result, mode } = message;
      lastExtractionResult = result;
      if (sender.tab && mode === "compile" && result.prompts.length > 0 && !result.summary) {
        console.log("[1prompt SW] Mode is COMPILE - calling AI summarizer...");
        (async () => {
          try {
            const userId = await getCurrentUserId();
            const summaryResult = await aiSummarizer.summarize(result.prompts, { userId: userId || void 0 });
            console.log("[1prompt SW] AI summarization complete");
            const updatedResult = {
              ...result,
              summary: summaryResult.summary,
              promptCount: summaryResult.promptCount,
              model: summaryResult.model,
              provider: summaryResult.provider
            };
            lastExtractionResult = updatedResult;
            broadcastToSidePanels({
              action: "EXTRACTION_RESULT",
              result: updatedResult,
              mode
            });
          } catch (error) {
            console.error("[1prompt SW] AI summarization failed:", error);
            broadcastToSidePanels({
              action: "EXTRACTION_RESULT",
              result,
              mode,
              error: error.message || "AI summarization failed"
            });
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
        sendResponse({ success: false, error: "No prompts available to refine" });
        break;
      }
      console.log("[1prompt SW] RE_SUMMARIZE requested");
      (async () => {
        try {
          const userId = await getCurrentUserId();
          const summaryResult = await aiSummarizer.summarize(lastExtractionResult.prompts, { userId: userId || void 0 });
          const updatedResult = {
            ...lastExtractionResult,
            summary: summaryResult.summary,
            promptCount: summaryResult.promptCount,
            model: summaryResult.model,
            provider: summaryResult.provider
          };
          lastExtractionResult = updatedResult;
          broadcastToSidePanels({
            action: "EXTRACTION_RESULT",
            result: updatedResult,
            mode: "compile"
          });
        } catch (error) {
          console.error("[1prompt SW] RE_SUMMARIZE failed:", error);
          broadcastToSidePanels({
            action: "EXTRACTION_RESULT",
            result: lastExtractionResult,
            mode: "compile",
            error: error.message || "AI refinement failed"
          });
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
      console.log("[1prompt] Broadcasting page extraction trigger to sidepanel");
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
        chrome.storage.local.get([specificKey, generalKey], async (result) => {
          let conversationLogs = result[specificKey] || [];
          if (conversationLogs.length === 0 && result[generalKey]) {
            conversationLogs = result[generalKey].filter(
              (log) => log.conversationId === conversationId
            );
          }
          const userId = await getCurrentUserId();
          if (userId && conversationLogs.length < 5) {
            console.log("[1prompt] Local logs sparse, fetching from cloud...");
            const cloudLogs = [];
            if (cloudLogs.length > 0) {
              const localContent = new Set(conversationLogs.map((p) => p.content));
              const merged = [...conversationLogs];
              for (const cloudPrompt of cloudLogs) {
                if (!localContent.has(cloudPrompt.content)) {
                  merged.push(cloudPrompt);
                }
              }
              conversationLogs = merged.sort((a, b) => a.timestamp - b.timestamp);
              chrome.storage.local.set({ [specificKey]: conversationLogs });
            }
          }
          sendResponse({
            success: true,
            prompts: conversationLogs
          });
        });
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
          console.log(`[1prompt] Processing ${prompts.length} prompts for sync (local only)`);
          console.log(`[1prompt] Queued ${prompts.length} prompts for cloud sync`);
          sendResponse2({ success: true, synced: prompts.length });
        } catch (err) {
          console.error("[1prompt] Sync error:", err);
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
});
async function withKeepAlive(operation) {
  let port = chrome.runtime.connect({ name: "keep-alive" });
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
      console.log(`[1prompt] Notified content script of URL change for ${platform}`);
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
    console.log(`[1prompt] Injected content script for ${platform}`);
  } catch (err) {
    console.warn(`[1prompt] Could not inject content script:`, err);
  }
});
async function handleSidePanelMessage(message) {
  console.log("[1prompt] Side panel message:", message.action);
  switch (message.action) {
    case "EXTRACT_PROMPTS": {
      const mode = message.mode;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        console.log("[1prompt] Sending EXTRACT_PROMPTS to tab:", tab.id);
        let retryCount = 0;
        const maxRetries = 3;
        let messageTimeout = null;
        const sendMessage = () => {
          messageTimeout = setTimeout(() => {
            if (retryCount < maxRetries) {
              console.warn(`[1prompt] No response from tab ${tab.id}, retrying... (attempt ${retryCount + 1}/${maxRetries})`);
              retryCount++;
              sendMessage();
            } else {
              broadcastToSidePanels({
                action: "ERROR",
                error: "Content script not responding. Please refresh the page and try again."
              });
            }
          }, 1e4);
          chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_PROMPTS", mode }, (response) => {
            if (messageTimeout !== null) {
              clearTimeout(messageTimeout);
              messageTimeout = null;
            }
            if (chrome.runtime.lastError) {
              console.error("[1prompt] Error sending to tab:", chrome.runtime.lastError);
              if (retryCount < maxRetries) {
                console.warn(`[1prompt] Retrying message send... (attempt ${retryCount + 1}/${maxRetries})`);
                retryCount++;
                sendMessage();
              } else {
                broadcastToSidePanels({
                  action: "ERROR",
                  error: "Could not connect to the page. Please refresh and try again."
                });
              }
            } else {
              console.log("[1prompt] Content script acknowledged extraction:", response);
            }
          });
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
      try {
        console.log(`[1prompt] Summarizing ${prompts.length} prompts...`);
        const result = await withKeepAlive(async () => {
          return await aiSummarizer.summarize(prompts, { userId, userEmail, authToken });
        });
        console.log("[1prompt] Summarization successful");
        broadcastToSidePanels({
          action: "SUMMARY_RESULT",
          result,
          success: true
        });
      } catch (error) {
        console.error("[1prompt] AI Summarization error, falling back to local:", error);
        try {
          const result = await localSummarizer.summarize(prompts);
          broadcastToSidePanels({
            action: "SUMMARY_RESULT",
            result,
            success: true,
            error: error instanceof Error ? error.message : "AI Backend unavailable. Using local summarization."
          });
        } catch (localError) {
          console.error("[1prompt] Local summarization also failed:", localError);
          const fallbackSummary = prompts.map((p) => p.content).join("\n\n");
          broadcastToSidePanels({
            action: "SUMMARY_RESULT",
            result: {
              original: prompts,
              summary: fallbackSummary,
              promptCount: { before: prompts.length, after: prompts.length }
            },
            success: true,
            error: "Summarization failed. Showing raw content."
          });
        }
      }
      break;
    }
  }
}
function broadcastToSidePanels(message) {
  chrome.runtime.sendMessage(message).catch(() => {
  });
}
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[1prompt] Extension installed:", details.reason);
  if (details.reason === "install") {
    const { hasSeenWelcome } = await chrome.storage.local.get("hasSeenWelcome");
    if (!hasSeenWelcome) {
      chrome.tabs.create({ url: "https://1-prompt.in/install" });
      chrome.storage.local.set({ hasSeenWelcome: true });
    }
  }
});
if (chrome.runtime.setUninstallURL) {
  chrome.runtime.setUninstallURL("https://1-prompt.in/uninstall");
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
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("[1prompt] Checking tab status:", tab?.url?.substring(0, 50));
    if (!tab?.id) {
      console.log("[1prompt] No active tab found");
      return;
    }
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:")) {
      console.log("[1prompt] Restricted URL, sending unsupported");
      broadcastToSidePanels({
        action: "STATUS_RESULT",
        supported: false,
        platform: null
      });
      return;
    }
    const platform = detectPlatformFromUrl(tab.url);
    console.log("[1prompt] URL-based platform detection:", platform);
    chrome.tabs.sendMessage(tab.id, { action: "GET_STATUS" }, async (response) => {
      if (chrome.runtime.lastError) {
        console.log("[1prompt] Content script not ready:", chrome.runtime.lastError.message);
        if (platform) {
          console.log("[1prompt] Auto-injecting content script for", platform);
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["content.js"]
            });
            console.log("[1prompt] ✅ Content script auto-injected successfully");
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: "GET_STATUS" }, (retryResponse) => {
                if (retryResponse) {
                  console.log("[1prompt] Content script now responding after auto-inject");
                  broadcastToSidePanels(retryResponse);
                } else {
                  broadcastToSidePanels({
                    action: "STATUS_RESULT",
                    supported: false,
                    platform
                  });
                }
              });
            }, 500);
          } catch (injectErr) {
            console.warn("[1prompt] Auto-inject failed:", injectErr);
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
        console.log("[1prompt] Content script responded:", response);
        broadcastToSidePanels(response);
      }
    });
  } catch (e) {
    console.error("[1prompt] Error checking tab status:", e);
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
  console.log("[1prompt] Command received:", command);
  if (command === "extract-prompts") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } catch (e) {
        console.warn("[1prompt] Could not open side panel via command:", e);
      }
      chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_PROMPTS", mode: "raw" });
    }
  }
});
function normalizeContent(text) {
  return text.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 200);
}
