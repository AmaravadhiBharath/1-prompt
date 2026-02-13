(function() {
  "use strict";
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
  const CACHE_KEY = "prompt_extractor_selectors";
  const CACHE_TTL = 3600 * 1e3;
  class SelectorRegistryService {
    registry = null;
    /**
     * Get selectors for a specific platform hostname
     */
    async getSelectors(hostname) {
      const registry = await this.getRegistry();
      if (registry.platforms[hostname]) {
        return registry.platforms[hostname];
      }
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
    async getRegistry() {
      if (this.registry && Date.now() - this.registry.lastUpdated < CACHE_TTL) {
        return this.registry;
      }
      const cached = await this.loadFromStorage();
      if (cached && Date.now() - cached.lastUpdated < CACHE_TTL) {
        this.registry = cached;
        if (Date.now() - cached.lastUpdated > CACHE_TTL * 0.5) {
          this.fetchFromBackend().catch(
            (err) => console.warn("[SelectorRegistry] Background refresh failed", err)
          );
        }
        return cached;
      }
      try {
        const fresh = await this.fetchFromBackend();
        this.registry = fresh;
        return fresh;
      } catch (e) {
        console.warn("[SelectorRegistry] Fetch failed, using cache/fallback", e);
        return cached || this.formattedBundledDefaults();
      }
    }
    async fetchFromBackend() {
      const backendUrl = config.backend.url || "https://1prompt-backend.amaravadhibharath.workers.dev";
      const response = await fetch(`${backendUrl}/config/selectors`);
      if (!response.ok) {
        throw new Error(`Failed to fetch selectors: ${response.status}`);
      }
      const data = await response.json();
      const registry = {
        platforms: data.config.platforms,
        lastUpdated: Date.now()
      };
      await this.saveToStorage(registry);
      return registry;
    }
    async loadFromStorage() {
      return new Promise((resolve) => {
        chrome.storage.local.get(CACHE_KEY, (result) => {
          resolve(result[CACHE_KEY] || null);
        });
      });
    }
    async saveToStorage(registry) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [CACHE_KEY]: registry }, resolve);
      });
    }
    /**
     * Client-side hardcoded defaults (Fallback)
     * Matching the backend's default structure
     */
    formattedBundledDefaults() {
      return {
        lastUpdated: Date.now(),
        platforms: {
          "chatgpt.com": {
            promptSelectors: [
              ".whitespace-pre-wrap",
              "div[data-message-author-role='user']",
              "article div.flex-col.gap-1"
            ],
            excludeSelectors: [".sr-only", "button", "svg"]
          },
          "claude.ai": {
            promptSelectors: [
              ".font-user-message",
              "div[data-test-id='user-message']"
            ],
            excludeSelectors: []
          },
          "deepseek.com": {
            promptSelectors: [".ds-user-message", ".message-user"],
            excludeSelectors: []
          }
        }
      };
    }
  }
  const selectorRegistry = new SelectorRegistryService();
  class BaseAdapter {
    /**
     * Main scraping method (Async)
     * Remote config disabled - returning wrong results
     * TODO: Fix remote config to filter AI responses properly
     */
    async scrape() {
      return this.scrapePrompts();
    }
    /**
     * Attempt to scrape using remote configuration
     * Returns empty array if no config found or extraction fails
     */
    async scrapePromptsWithConfig() {
      try {
        const hostname = window.location.hostname;
        const config2 = await selectorRegistry.getSelectors(hostname);
        if (!config2 || !config2.promptSelectors) {
          return [];
        }
        console.log(`[BaseAdapter] Using remote config for ${hostname}`);
        return this.executeStrategy(config2);
      } catch (e) {
        console.warn("[BaseAdapter] Remote scrape error:", e);
        return [];
      }
    }
    executeStrategy(strategy) {
      const prompts = [];
      const seen = /* @__PURE__ */ new Set();
      if (strategy.promptSelectors) {
        for (const selector of strategy.promptSelectors) {
          const elements = this.deepQuerySelectorAll(selector);
          for (const el of elements) {
            if (strategy.excludeSelectors?.some((s) => el.matches(s))) continue;
            if (this.isInputElement(el)) continue;
            const content = this.cleanText(this.getVisibleText(el));
            const minLength = strategy.minContentLength || 1;
            if (content && content.length >= minLength && !seen.has(content) && !this.isUIElement(content)) {
              seen.add(content);
              prompts.push({ content, index: prompts.length });
            }
          }
        }
      }
      return prompts;
    }
    // Utility: Deep query selector that pierces shadow DOM
    deepQuerySelectorAll(selector, root = document) {
      let nodes = [];
      try {
        nodes = Array.from(root.querySelectorAll(selector));
      } catch (e) {
        console.warn("[1-prompt] Invalid selector:", selector);
      }
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let node;
      while (node = walker.nextNode()) {
        const el = node;
        if (el.shadowRoot) {
          nodes = [
            ...nodes,
            ...this.deepQuerySelectorAll(selector, el.shadowRoot)
          ];
        }
      }
      return nodes;
    }
    // Utility: Clean text content
    cleanText(text) {
      return text.replace(/\s+/g, " ").trim();
    }
    // Utility: Check if text is UI noise
    isUIElement(text) {
      const uiPatterns = /^(copy|regenerate|share|edit|delete|save|retry|cancel|submit|send|stop|continue|new chat|clear)$/i;
      return uiPatterns.test(text.trim()) || text.trim().length < 1;
    }
    // Utility: Extract visible text from element
    getVisibleText(element) {
      return element.innerText || element.textContent || "";
    }
    // Utility: Check if element is an input box or inside one
    isInputElement(el) {
      const htmlEl = el;
      if (htmlEl.isContentEditable || htmlEl.tagName === "TEXTAREA" || htmlEl.tagName === "INPUT") {
        return true;
      }
      const isInput = el.closest('[contenteditable="true"]') || el.closest("textarea") || el.closest("input") || el.closest('[role="textbox"]') || el.closest('[role="composer"]') || // Only reject form if it's likely a composer form
      el.closest("form") && (el.closest("footer") || el.closest('[class*="composer"]')) || el.closest("footer") || // Common composer location
      el.closest("#prompt-textarea") || el.closest(".composer-parent") || el.closest('[data-testid="composer-background"]') || el.closest('[class*="composer"]') || el.closest('[class*="prompt-box"]');
      return !!isInput;
    }
    // Utility: Find the main scroll container for the chat
    getScrollContainer() {
      const selectors = [
        "main",
        '[class*="scroll-area"]',
        '[class*="messages-container"]',
        '[class*="chat-scroll"]',
        'div[style*="overflow-y: auto"]',
        'div[style*="overflow-y: scroll"]'
      ];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.scrollHeight > el.clientHeight) return el;
      }
      const allDivs = Array.from(document.querySelectorAll("div"));
      let largest = null;
      let maxScroll = 0;
      for (const div of allDivs) {
        const scroll = div.scrollHeight;
        if (scroll > maxScroll && window.getComputedStyle(div).overflowY !== "hidden") {
          maxScroll = scroll;
          largest = div;
        }
      }
      return largest || document.documentElement;
    }
  }
  class ChatGPTAdapter extends BaseAdapter {
    name = "ChatGPT";
    detect() {
      return location.hostname.includes("chatgpt.com") || location.hostname.includes("chat.openai.com");
    }
    scrapePrompts() {
      const prompts = [];
      const seen = /* @__PURE__ */ new Set();
      const allArticles = this.deepQuerySelectorAll("article");
      const allUserArticles = this.deepQuerySelectorAll(
        'article[data-testid*="conversation-turn"]:has([data-message-author-role="user"])'
      );
      const legacyRoleElements = this.deepQuerySelectorAll(
        '[data-message-author-role="user"]'
      );
      console.log("[1-prompt] ChatGPT DOM Debug:", {
        articles: allArticles.length,
        userArticles: allUserArticles.length,
        legacyRole: legacyRoleElements.length,
        withTestId: this.deepQuerySelectorAll('[data-testid*="conversation-turn"]').length
      });
      const candidates = this.deepQuerySelectorAll(
        [
          ".whitespace-pre-wrap",
          ".user-message-bubble-color",
          '[data-message-author-role="user"]',
          'article:has([data-message-author-role="user"]) div[class*="markdown"]'
        ].join(", ")
      ).filter((el) => {
        const htmlEl = el;
        if (htmlEl.offsetParent === null) return false;
        if (this.isInputElement(el) || el.closest("form") || el.closest("footer"))
          return false;
        const isUser = el.closest('[data-message-author-role="user"]') || el.closest(".user-message-bubble-color") || el.closest('article[data-testid*="conversation-turn"]:has([data-message-author-role="user"])');
        return !!isUser;
      });
      const leafContainers = candidates.filter((el) => {
        return !Array.from(el.querySelectorAll("*")).some(
          (child) => candidates.includes(child)
        );
      });
      console.log(
        `[1-prompt] ChatGPT candidates: ${candidates.length}, leaf containers: ${leafContainers.length}`
      );
      leafContainers.forEach((el, index) => {
        let content = this.getVisibleText(el).trim();
        content = content.replace(/\d\s*\/\s*\d/g, "");
        content = content.replace(/(copy|read aloud|good response|bad response)$/i, "").trim();
        if (content && content.length >= 1 && !this.isUIElement(content) && !seen.has(content)) {
          seen.add(content);
          prompts.push({
            content,
            index,
            platform: "ChatGPT",
            timestamp: Date.now() - (leafContainers.length - index) * 1e3
          });
        }
      });
      if (prompts.length === 0 && allArticles.length > 0) {
        console.log("[1-prompt] NO VISIBLE PROMPTS - Running deep article fallback...");
        allUserArticles.forEach((article, index) => {
          const textNodes = Array.from(article.querySelectorAll('div[class*="markdown"], .whitespace-pre-wrap'));
          textNodes.forEach((node) => {
            const content = node.textContent?.trim();
            if (content && content.length > 1 && !seen.has(content)) {
              seen.add(content);
              prompts.push({
                content,
                index,
                platform: "ChatGPT",
                source: "dom"
              });
            }
          });
        });
      }
      console.log(`[1-prompt] ChatGPT user prompts final: ${prompts.length}`);
      return prompts;
    }
  }
  class ClaudeAdapter extends BaseAdapter {
    name = "Claude";
    detect() {
      return location.hostname.includes("claude.ai");
    }
    scrapePrompts() {
      const prompts = [];
      const seen = /* @__PURE__ */ new Set();
      const candidates = this.deepQuerySelectorAll(
        [
          '[data-testid="human-message"]',
          ".human-message",
          '[class*="human"]',
          'article:has([data-testid="human-message"]) div[class*="markdown"]',
          'article:has(.human-message) div[class*="markdown"]'
        ].join(", ")
      ).filter((el) => {
        const htmlEl = el;
        if (htmlEl.offsetParent === null && !el.closest("article")) return false;
        if (this.isInputElement(el)) return false;
        const isUser = el.closest('[data-testid="human-message"]') || el.closest(".human-message") || el.closest('article[class*="turn"]:has([data-testid="human-message"])') || el.closest("article:has(.human-message)");
        return !!isUser;
      });
      const leafContainers = candidates.filter((el) => {
        return !Array.from(el.querySelectorAll("*")).some(
          (child) => candidates.includes(child)
        );
      });
      leafContainers.forEach((el, index) => {
        const content = this.cleanText(this.getVisibleText(el));
        if (content && !this.isUIElement(content) && !seen.has(content)) {
          seen.add(content);
          prompts.push({ content, index, platform: "Claude" });
        }
      });
      return prompts;
    }
  }
  class GeminiAdapter extends BaseAdapter {
    name = "Gemini";
    detect() {
      return location.hostname.includes("gemini.google.com");
    }
    scrapePrompts() {
      const prompts = [];
      const seen = /* @__PURE__ */ new Set();
      const candidates = this.deepQuerySelectorAll(
        [
          "user-query",
          '[class*="user-query"]',
          '[class*="query-text"]',
          ".query-content",
          ".user-message",
          'article:has(user-query) div[class*="content"]',
          'article:has(.user-query) div[class*="content"]'
        ].join(", ")
      ).filter((el) => {
        const htmlEl = el;
        if (htmlEl.offsetParent === null && !el.closest("article")) return false;
        if (this.isInputElement(el)) return false;
        const isUser = el.closest("user-query") || el.closest('[class*="user-query"]') || el.closest(".user-message") || el.closest("article:has(user-query)");
        return !!isUser;
      });
      const leafContainers = candidates.filter((el) => {
        return !Array.from(el.querySelectorAll("*")).some(
          (child) => candidates.includes(child)
        );
      });
      leafContainers.forEach((el, index) => {
        const content = this.cleanText(this.getVisibleText(el));
        if (content && !this.isUIElement(content) && !seen.has(content)) {
          seen.add(content);
          prompts.push({ content, index, platform: "Gemini" });
        }
      });
      return prompts;
    }
  }
  class PerplexityAdapter extends BaseAdapter {
    name = "Perplexity";
    detect() {
      return location.hostname.includes("perplexity.ai");
    }
    scrapePrompts() {
      const prompts = [];
      const seen = /* @__PURE__ */ new Set();
      const queries = document.querySelectorAll(
        '[class*="query"], [class*="question"], [class*="user"]'
      );
      queries.forEach((el, index) => {
        const classList = el.className.toLowerCase();
        if (classList.includes("answer") || classList.includes("response") || classList.includes("source")) {
          return;
        }
        const content = this.cleanText(this.getVisibleText(el));
        if (content && content.length > 5 && !this.isUIElement(content) && !seen.has(content)) {
          seen.add(content);
          prompts.push({ content, index });
        }
      });
      if (prompts.length === 0) {
        const threadItems = document.querySelectorAll(
          '[class*="thread"] > div, [class*="Thread"] > div'
        );
        let promptIndex = 0;
        threadItems.forEach((item, idx) => {
          if (idx % 2 === 0) {
            const content = this.cleanText(this.getVisibleText(item));
            if (content && content.length > 5 && !seen.has(content)) {
              seen.add(content);
              prompts.push({ content, index: promptIndex++ });
            }
          }
        });
      }
      if (prompts.length === 0) {
        const searchHistory = document.querySelectorAll(
          'h1, h2, [class*="title"]'
        );
        searchHistory.forEach((el, index) => {
          const content = this.cleanText(this.getVisibleText(el));
          if (content && content.length > 10 && content.length < 500 && !seen.has(content)) {
            seen.add(content);
            prompts.push({ content, index });
          }
        });
      }
      return prompts;
    }
  }
  class DeepSeekAdapter extends BaseAdapter {
    name = "DeepSeek";
    detect() {
      return location.hostname.includes("deepseek.com");
    }
    scrapePrompts() {
      const prompts = [];
      const seen = /* @__PURE__ */ new Set();
      const candidates = this.deepQuerySelectorAll(
        [
          '[class*="user"], [class*="User"], [data-role="user"]',
          'div[class*="message-container"]:has([class*="user"])',
          'article:has([class*="user"]) div[class*="content"]'
        ].join(", ")
      ).filter((el) => {
        const htmlEl = el;
        if (htmlEl.offsetParent === null && !el.closest("article")) return false;
        if (this.isInputElement(el)) return false;
        const isUser = el.closest('[class*="user"]') || el.closest('[class*="User"]') || el.closest('[data-role="user"]') || el.closest('article:has([class*="user"])');
        return !!isUser;
      });
      const leafContainers = candidates.filter((el) => {
        return !Array.from(el.querySelectorAll("*")).some(
          (child) => candidates.includes(child)
        );
      });
      leafContainers.forEach((el, index) => {
        const content = this.cleanText(this.getVisibleText(el));
        if (content && !this.isUIElement(content) && !seen.has(content)) {
          seen.add(content);
          prompts.push({ content, index, platform: "DeepSeek" });
        }
      });
      return prompts;
    }
  }
  class LovableAdapter extends BaseAdapter {
    name = "Lovable";
    detect() {
      return location.hostname.includes("lovable.dev");
    }
    /**
     * Clean text by removing UI elements only (buttons, SVG, nav, etc.)
     * Does NOT remove text content - preserves user prompts completely.
     */
    cleanContent(node) {
      const clone = node.cloneNode(true);
      const uiSelectors = [
        "button",
        "svg",
        "path",
        '[role="button"]',
        '[aria-hidden="true"]',
        ".lucide",
        '[class*="chevron"]',
        '[class*="tooltip"]',
        '[class*="badge"]',
        "nav",
        "header",
        "footer",
        "aside"
      ];
      clone.querySelectorAll(uiSelectors.join(", ")).forEach((el) => el.remove());
      return this.cleanText(this.getVisibleText(clone));
    }
    /**
     * Determine if a prose element is a user prompt based on DOM structure
     * User prompts have 'whitespace-normal' class
     * AI responses have 'prose-h1:mb-2' class
     */
    isUserPrompt(element) {
      const classes = element.className;
      if (classes.includes("whitespace-normal")) {
        return true;
      }
      if (classes.includes("prose-h1:mb-2")) {
        return false;
      }
      let curr = element.parentElement;
      let depth = 0;
      while (curr && depth < 5) {
        const parentClasses = curr.className;
        if (parentClasses.includes("justify-end") || parentClasses.includes("ml-auto")) {
          return true;
        }
        if (parentClasses.includes("assistant") || parentClasses.includes("bot")) {
          return false;
        }
        curr = curr.parentElement;
        depth++;
      }
      return false;
    }
    scrapePrompts() {
      console.log(
        "[1-prompt] Lovable Extraction Engine starting (v1.1.0 - ba96d2c multi-position)..."
      );
      const prompts = [];
      const seen = /* @__PURE__ */ new Set();
      const proseElements = this.deepQuerySelectorAll('[class*="prose"]');
      console.log(`[1-prompt] Found ${proseElements.length} total prose elements`);
      proseElements.forEach((el) => {
        const element = el;
        if (!this.isUserPrompt(element)) {
          return;
        }
        const text = element.textContent?.trim() || "";
        if (text.length < 2 || text.length > 5e3) {
          return;
        }
        if (seen.has(text)) {
          return;
        }
        const content = this.cleanContent(element);
        if (content && content.length > 2 && !seen.has(content)) {
          seen.add(content);
          prompts.push({ content, index: prompts.length });
        }
      });
      console.log(`[1-prompt] Total user prompts extracted: ${prompts.length}`);
      return prompts;
    }
    getScrollContainer() {
      let container = document.querySelector("main");
      if (container && container.scrollHeight > container.clientHeight) {
        return container;
      }
      const selectors = [
        ".flex.flex-col.overflow-y-auto",
        '[class*="overflow-y-auto"]',
        '[class*="chat-container"]',
        '[class*="messages-container"]',
        ".flex-1.overflow-y-auto",
        '[role="region"]'
      ];
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.scrollHeight > element.clientHeight * 1.2) {
          return element;
        }
      }
      return null;
    }
  }
  class BoltAdapter extends BaseAdapter {
    name = "Bolt";
    detect() {
      return location.hostname.includes("bolt.new");
    }
    scrapePrompts() {
      const prompts = [];
      const seen = /* @__PURE__ */ new Set();
      const userInputs = document.querySelectorAll(
        '[class*="user"], [class*="prompt"], [class*="input-message"]'
      );
      userInputs.forEach((el, index) => {
        const classList = el.className.toLowerCase();
        if (classList.includes("assistant") || classList.includes("response") || classList.includes("output")) {
          return;
        }
        const content = this.cleanText(this.getVisibleText(el));
        if (content && !this.isUIElement(content) && !seen.has(content)) {
          seen.add(content);
          prompts.push({ content, index });
        }
      });
      if (prompts.length > 0) return prompts;
      const messages = document.querySelectorAll(
        '[class*="message"], [class*="Message"]'
      );
      let promptIndex = 0;
      messages.forEach((msg) => {
        const classList = msg.className.toLowerCase();
        if (classList.includes("user") || classList.includes("human") || classList.includes("you")) {
          const content = this.cleanText(this.getVisibleText(msg));
          if (content && content.length > 3 && !seen.has(content)) {
            seen.add(content);
            prompts.push({ content, index: promptIndex++ });
          }
        }
      });
      if (prompts.length === 0) {
        const workspacePrompts = document.querySelectorAll(
          '[class*="workspace"] [class*="prompt"], [class*="project"] [class*="request"]'
        );
        workspacePrompts.forEach((el, index) => {
          const content = this.cleanText(this.getVisibleText(el));
          if (content && content.length > 5 && !seen.has(content)) {
            seen.add(content);
            prompts.push({ content, index });
          }
        });
      }
      return prompts;
    }
  }
  class CursorAdapter extends BaseAdapter {
    name = "Cursor";
    detect() {
      return location.hostname.includes("cursor.sh") || location.hostname.includes("cursor.com");
    }
    scrapePrompts() {
      const prompts = [];
      const seen = /* @__PURE__ */ new Set();
      const userMessages = document.querySelectorAll(
        '[class*="user-message"], [class*="UserMessage"], [data-role="user"]'
      );
      userMessages.forEach((el, index) => {
        const content = this.cleanText(this.getVisibleText(el));
        if (content && !this.isUIElement(content) && !seen.has(content)) {
          seen.add(content);
          prompts.push({ content, index });
        }
      });
      if (prompts.length > 0) return prompts;
      const chatMessages = document.querySelectorAll(
        '[class*="chat"] [class*="message"], [class*="conversation"] [class*="turn"]'
      );
      let promptIndex = 0;
      chatMessages.forEach((msg) => {
        const classList = msg.className.toLowerCase();
        if (classList.includes("assistant") || classList.includes("bot") || classList.includes("ai") || classList.includes("response")) {
          return;
        }
        const content = this.cleanText(this.getVisibleText(msg));
        if (content && content.length > 3 && !seen.has(content)) {
          seen.add(content);
          prompts.push({ content, index: promptIndex++ });
        }
      });
      if (prompts.length === 0) {
        const commands = document.querySelectorAll(
          '[class*="command"], [class*="prompt-history"], [class*="input-history"]'
        );
        commands.forEach((el, index) => {
          const content = this.cleanText(this.getVisibleText(el));
          if (content && content.length > 5 && !seen.has(content)) {
            seen.add(content);
            prompts.push({ content, index });
          }
        });
      }
      return prompts;
    }
  }
  class MetaAIAdapter extends BaseAdapter {
    name = "Meta AI";
    detect() {
      return location.hostname.includes("meta.ai");
    }
    scrapePrompts() {
      const prompts = [];
      const seen = /* @__PURE__ */ new Set();
      const userMessages = document.querySelectorAll(
        '[class*="user"], [class*="User"], [data-type="user"]'
      );
      userMessages.forEach((el, index) => {
        const classList = el.className.toLowerCase();
        if (classList.includes("assistant") || classList.includes("response") || classList.includes("meta")) {
          return;
        }
        const content = this.cleanText(this.getVisibleText(el));
        if (content && !this.isUIElement(content) && !seen.has(content)) {
          seen.add(content);
          prompts.push({ content, index });
        }
      });
      if (prompts.length > 0) return prompts;
      const bubbles = document.querySelectorAll(
        '[class*="bubble"], [class*="Bubble"]'
      );
      let promptIndex = 0;
      bubbles.forEach((bubble) => {
        const classList = bubble.className.toLowerCase();
        if (classList.includes("right") || classList.includes("user") || classList.includes("outgoing")) {
          const content = this.cleanText(this.getVisibleText(bubble));
          if (content && content.length > 3 && !seen.has(content)) {
            seen.add(content);
            prompts.push({ content, index: promptIndex++ });
          }
        }
      });
      if (prompts.length === 0) {
        const thread = document.querySelector(
          '[class*="thread"], [class*="conversation"], [role="log"]'
        );
        if (thread) {
          const entries = thread.querySelectorAll(":scope > div, :scope > li");
          entries.forEach((entry, idx) => {
            if (entry.querySelector('.markdown, pre, code, [class*="response"]')) {
              return;
            }
            const content = this.cleanText(this.getVisibleText(entry));
            if (content && content.length > 5 && content.length < 2e3 && !seen.has(content)) {
              seen.add(content);
              prompts.push({ content, index: idx });
            }
          });
        }
      }
      return prompts;
    }
  }
  class GenericAdapter extends BaseAdapter {
    name = "generic";
    detect() {
      if (window.location.hostname.includes("1-prompt.in")) {
        return false;
      }
      return true;
    }
    scrapePrompts() {
      const currentUrl = window.location.href;
      let messages = [];
      if (currentUrl.includes("gemini.google.com")) {
        const getShadowElements = (selector, root = document) => {
          let elements = [];
          root.querySelectorAll(selector).forEach((el) => elements.push(el));
          const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_ELEMENT,
            null
          );
          let node;
          while (node = walker.nextNode()) {
            if (node.shadowRoot) {
              elements = elements.concat(
                getShadowElements(selector, node.shadowRoot)
              );
            }
          }
          return elements;
        };
        const userQueries = getShadowElements("user-query");
        if (userQueries.length > 0) {
          return userQueries.map((el, idx) => {
            const content = el.innerText?.trim();
            return content && content.length > 0 ? { content, index: idx } : null;
          }).filter((p) => p !== null);
        }
      }
      const container = this.findChatContainer();
      if (container) {
        messages = this.extractMessages(container);
      }
      if (messages.length > 1e3) {
        console.warn(
          "[1-prompt] Truncating extraction at 1000 prompts safety limit"
        );
        messages = messages.slice(0, 1e3);
      }
      return messages.map((m, i) => ({ content: m.content, index: i }));
    }
    findChatContainer() {
      const selectors = [
        "infinite-scroller",
        '[role="log"]',
        '[role="main"]',
        ".chat-history",
        ".conversation",
        "main"
      ];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText.length > 200) return el;
      }
      return document.body;
    }
    extractMessages(root) {
      const fragments = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent?.trim() || "";
        const parent = node.parentElement;
        if (text.length < 2 || this.isSystemNoise(text) || parent?.tagName.toLowerCase() === "model-response" || parent?.classList.contains("model-response-text") || parent?.getAttribute("data-message-author-role") === "assistant")
          continue;
        const lowerText = text.toLowerCase();
        if ([
          /should be written (about|on|for)/i,
          /the story should/i,
          /story for class \d+/i,
          /resulting in a positive resolution/i,
          /clear moral about/i,
          /focus on (friendship|teamwork|cooperation)/i,
          /\bmet near\b/i,
          /help solve through/i,
          /spend time together/i
        ].some((regex) => regex.test(text)))
          continue;
        if ([
          /^(one|a) (bright|sunny|dark|cold|warm|beautiful|clear) (day|morning|evening|night)/i,
          /once upon a time/i,
          /the end/i,
          /chapter \d+/i,
          /lived (his|her|their) life/i,
          /was a (golden retriever|cow|dog|cat|yellow frog|rabbit)/i,
          /near a (clear|beautiful|sparkling|calm) (pond|river|lake|stream)/i,
          /who met near/i,
          /faces a small problem/i
        ].some((regex) => regex.test(text)))
          continue;
        if (lowerText.startsWith("here is") || lowerText.startsWith("sure, i can") || lowerText.startsWith("i have") || lowerText.startsWith("certainly") || lowerText.startsWith("of course") || lowerText.startsWith("here's a"))
          continue;
        if (text.length > 200) {
          const commandWords = [
            "create",
            "write",
            "make",
            "fix",
            "generate",
            "build",
            "explain",
            "how",
            "what",
            "why",
            "list",
            "show",
            "tell",
            "give",
            "help",
            "find",
            "debug"
          ];
          const firstWord = text.split(" ")[0].toLowerCase();
          if (!commandWords.includes(firstWord)) continue;
        }
        if (lowerText.includes("the cow, dog, and") || lowerText.includes("yellow frog") || lowerText.includes("calm problem-solving") || lowerText.includes("1-prompt turns") || lowerText.includes("scattered ai conversations") || lowerText.includes("actionable workflow") || lowerText.includes("work with ai with an edge") || lowerText.includes("compiles all prompts into actionable") || lowerText.includes("no duplicates") || lowerText.includes("cancel out the conflict") || /^(\d+\.|-|\*|•)?\s*(the image shows|image of|this image depicts)/i.test(
          text
        ))
          continue;
        fragments.push({ role: "user", content: text });
      }
      return this.mergeFragments(fragments);
    }
    isSystemNoise(text) {
      return [
        "Regenerate",
        "Modify",
        "Share",
        "Google",
        "Copy",
        "Bad response",
        "Good response"
      ].includes(text);
    }
    mergeFragments(fragments) {
      if (fragments.length === 0) return [];
      const merged = [];
      let current = { ...fragments[0] };
      for (let i = 1; i < fragments.length; i++) {
        const next = fragments[i];
        if (next.role === current.role) {
          current.content += "\n" + next.content;
        } else {
          merged.push(current);
          current = { ...next };
        }
      }
      merged.push(current);
      return merged;
    }
  }
  const adapters = [
    new ChatGPTAdapter(),
    new ClaudeAdapter(),
    new GeminiAdapter(),
    new PerplexityAdapter(),
    new DeepSeekAdapter(),
    new LovableAdapter(),
    new BoltAdapter(),
    new CursorAdapter(),
    new MetaAIAdapter(),
    new GenericAdapter()
    // Fallback - must be last
  ];
  function getAdapter() {
    return adapters.find((adapter2) => adapter2.detect()) || null;
  }
  function getPlatformName() {
    const adapter2 = getAdapter();
    return adapter2 ? adapter2.name : null;
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
  const SLOW_CONFIG = {
    lovable: {
      name: "Lovable",
      topAttempts: 70,
      bottomAttempts: 70,
      waitPerScroll: 600,
      stabilityChecks: 6,
      parallelWait: 1200
    },
    chatgpt: {
      name: "ChatGPT",
      topAttempts: 40,
      bottomAttempts: 40,
      waitPerScroll: 400,
      stabilityChecks: 4,
      parallelWait: 800
    },
    claude: {
      name: "Claude",
      topAttempts: 40,
      bottomAttempts: 40,
      waitPerScroll: 400,
      stabilityChecks: 4,
      parallelWait: 800
    },
    gemini: {
      name: "Gemini",
      topAttempts: 35,
      bottomAttempts: 35,
      waitPerScroll: 350,
      stabilityChecks: 4,
      parallelWait: 750
    },
    perplexity: {
      name: "Perplexity",
      topAttempts: 35,
      bottomAttempts: 35,
      waitPerScroll: 350,
      stabilityChecks: 4,
      parallelWait: 750
    },
    deepseek: {
      name: "DeepSeek",
      topAttempts: 30,
      bottomAttempts: 30,
      waitPerScroll: 300,
      stabilityChecks: 3,
      parallelWait: 600
    },
    bolt: {
      name: "Bolt.new",
      topAttempts: 30,
      bottomAttempts: 30,
      waitPerScroll: 300,
      stabilityChecks: 3,
      parallelWait: 600
    },
    cursor: {
      name: "Cursor",
      topAttempts: 30,
      bottomAttempts: 30,
      waitPerScroll: 300,
      stabilityChecks: 3,
      parallelWait: 600
    },
    "meta-ai": {
      name: "Meta AI",
      topAttempts: 25,
      bottomAttempts: 25,
      waitPerScroll: 250,
      stabilityChecks: 3,
      parallelWait: 500
    }
  };
  const FAST_CONFIG = {
    lovable: {
      name: "Lovable",
      topAttempts: 50,
      bottomAttempts: 50,
      waitPerScroll: 200,
      stabilityChecks: 2,
      parallelWait: 300
    },
    chatgpt: {
      name: "ChatGPT",
      topAttempts: 30,
      bottomAttempts: 30,
      waitPerScroll: 150,
      stabilityChecks: 2,
      parallelWait: 250
    },
    claude: {
      name: "Claude",
      topAttempts: 30,
      bottomAttempts: 30,
      waitPerScroll: 150,
      stabilityChecks: 2,
      parallelWait: 250
    },
    gemini: {
      name: "Gemini",
      topAttempts: 25,
      bottomAttempts: 25,
      waitPerScroll: 120,
      stabilityChecks: 2,
      parallelWait: 200
    },
    perplexity: {
      name: "Perplexity",
      topAttempts: 25,
      bottomAttempts: 25,
      waitPerScroll: 120,
      stabilityChecks: 2,
      parallelWait: 200
    },
    deepseek: {
      name: "DeepSeek",
      topAttempts: 20,
      bottomAttempts: 20,
      waitPerScroll: 100,
      stabilityChecks: 2,
      parallelWait: 150
    },
    bolt: {
      name: "Bolt.new",
      topAttempts: 20,
      bottomAttempts: 20,
      waitPerScroll: 100,
      stabilityChecks: 2,
      parallelWait: 150
    },
    cursor: {
      name: "Cursor",
      topAttempts: 20,
      bottomAttempts: 20,
      waitPerScroll: 100,
      stabilityChecks: 2,
      parallelWait: 150
    },
    "meta-ai": {
      name: "Meta AI",
      topAttempts: 15,
      bottomAttempts: 15,
      waitPerScroll: 80,
      stabilityChecks: 2,
      parallelWait: 150
    }
  };
  const PLATFORM_MODE = {
    lovable: "slow",
    // Tested: SLOW works, FAST misses prompts
    chatgpt: "fast",
    // TODO: Test and update
    claude: "fast",
    // TODO: Test and update
    gemini: "fast",
    // TODO: Test and update
    perplexity: "fast",
    // TODO: Test and update
    deepseek: "fast",
    // TODO: Test and update
    bolt: "fast",
    // TODO: Test and update
    cursor: "fast",
    // TODO: Test and update
    "meta-ai": "fast"
    // TODO: Test and update
  };
  function getScrollConfig(platformName2) {
    const name = platformName2 || "generic";
    const normalizedName = name.toLowerCase().replace(/\s+/g, "-");
    const mode = PLATFORM_MODE[normalizedName] || "fast";
    const configSet = mode === "slow" ? SLOW_CONFIG : FAST_CONFIG;
    const config2 = configSet[normalizedName] || configSet[platformName2 || ""];
    if (config2) {
      console.log(
        `[1-prompt] Platform: ${config2.name} (${mode.toUpperCase()} mode)`
      );
      return config2;
    }
    console.log(`[1-prompt] Platform: ${name} (FAST mode - default)`);
    return {
      name,
      topAttempts: 15,
      bottomAttempts: 15,
      waitPerScroll: 100,
      stabilityChecks: 2,
      parallelWait: 150
    };
  }
  function getConfigTier(platformName2) {
    const config2 = getScrollConfig(platformName2);
    if (config2.topAttempts >= 40) {
      return "TIER 1 (Slow/Thorough)";
    } else if (config2.topAttempts >= 25) {
      return "TIER 2 (Moderate)";
    } else {
      return "TIER 3 (Fast)";
    }
  }
  const syncToExtension = () => {
    const userJson = localStorage.getItem("oneprompt_user");
    const firebaseToken = localStorage.getItem("firebase_id_token");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        chrome.storage.local.set({
          "oneprompt_user": user,
          "firebase_id_token": firebaseToken
        }, () => {
          console.log("[1-prompt] Synced TO Extension Storage", user.email);
          if (user.id) {
            chrome.runtime.sendMessage({ action: "SET_USER_ID", userId: user.id }).catch(() => {
            });
          }
        });
      } catch (e) {
        console.error("[1-prompt] Failed to parse user for extension sync", e);
      }
    } else {
      chrome.storage.local.remove(["oneprompt_user", "firebase_id_token", "firebase_current_user_id"], () => {
        chrome.runtime.sendMessage({ action: "SET_USER_ID", userId: null }).catch(() => {
        });
      });
    }
  };
  const syncToWebsite = (user, token) => {
    try {
      if (!user) {
        if (localStorage.getItem("oneprompt_user")) {
          localStorage.removeItem("oneprompt_user");
          localStorage.removeItem("firebase_id_token");
          window.dispatchEvent(new StorageEvent("storage", { key: "oneprompt_user", newValue: null }));
          console.log("[1-prompt] Synced LOGOUT to Website");
        }
        return;
      }
      const userJson = JSON.stringify(user);
      if (localStorage.getItem("oneprompt_user") !== userJson) {
        localStorage.setItem("oneprompt_user", userJson);
        if (token) localStorage.setItem("firebase_id_token", token);
        window.dispatchEvent(new StorageEvent("storage", { key: "oneprompt_user", newValue: userJson }));
        console.log("[1-prompt] Synced LOGIN to Website", user.email);
      }
    } catch (e) {
    }
  };
  syncToExtension();
  chrome.storage.local.get(["oneprompt_user", "firebase_id_token"], (res) => {
    syncToWebsite(res.oneprompt_user, res.firebase_id_token);
  });
  window.addEventListener("storage", (e) => {
    if (e.key === "oneprompt_user" || e.key === "firebase_id_token") syncToExtension();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.oneprompt_user || changes.firebase_id_token)) {
      chrome.storage.local.get(["oneprompt_user", "firebase_id_token"], (res) => {
        syncToWebsite(res.oneprompt_user, res.firebase_id_token);
      });
    }
  });
  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.type !== "ONE_PROMPT_MSG") return;
    if (event.data.action === "SYNC_AUTH") {
      syncToExtension();
    } else if (event.data.action === "OPEN_SIDE_PANEL") {
      console.log("[1-prompt] OPEN_SIDE_PANEL triggered via postMessage");
      chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" }).catch(() => {
      });
    }
  });
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "SYNC_AUTH") {
      syncToExtension();
      sendResponse({ success: true });
    }
  });
  let isExtracting = false;
  let adapter = getAdapter();
  let platformName = getPlatformName();
  function updateAdapter() {
    adapter = getAdapter();
    platformName = getPlatformName();
    broadcastStatus();
  }
  function broadcastStatus() {
    chrome.runtime.sendMessage({
      action: "STATUS_RESULT",
      supported: !!adapter,
      platform: platformName,
      hasPrompts: adapter ? adapter.scrapePrompts().length > 0 : false
    }).catch(() => {
    });
  }
  RemoteConfigService.getInstance().initialize();
  let sessionPrompts = [];
  if (!adapter) {
    console.warn(
      "[1-prompt] No adapter found for this page. Buttons will not be shown."
    );
  }
  let copiedContent = null;
  const SEND_BUTTON_SELECTORS = {
    chatgpt: [
      'button[data-testid="send-button"]',
      'button[data-testid="composer-send-button"]',
      'form button[type="submit"]',
      'button[aria-label*="Send"]'
    ],
    claude: [
      'button[aria-label="Send Message"]',
      'button[type="submit"]',
      "fieldset button:last-child"
    ],
    gemini: [
      'button[aria-label*="Send"]',
      ".send-button",
      'button[data-test-id="send-button"]'
    ],
    perplexity: ['button[aria-label="Submit"]', 'button[type="submit"]'],
    deepseek: ['button[data-testid="send-button"]', ".send-btn"],
    lovable: ['button[type="submit"]', 'button[aria-label*="Send"]'],
    bolt: ['button[type="submit"]', ".send-button"],
    cursor: ['button[type="submit"]'],
    "meta-ai": ['button[aria-label*="Send"]', 'button[type="submit"]']
  };
  const TEXTAREA_SELECTORS = {
    chatgpt: [
      "#prompt-textarea",
      'textarea[data-id="root"]',
      'div[contenteditable="true"][data-placeholder]'
    ],
    claude: ['div[contenteditable="true"]', "fieldset div[contenteditable]"],
    gemini: [".ql-editor", "rich-textarea div[contenteditable]", "textarea"],
    perplexity: ["textarea", 'div[contenteditable="true"]'],
    deepseek: ["textarea", "#chat-input textarea"],
    lovable: ["textarea"],
    bolt: ["textarea"],
    cursor: ["textarea"],
    "meta-ai": ['div[contenteditable="true"]', "textarea"]
  };
  function findChatInput() {
    const selectors = TEXTAREA_SELECTORS[platformName || ""] || [
      "textarea",
      '[contenteditable="true"]'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.offsetParent !== null) {
        return el;
      }
    }
    const textarea = document.querySelector("textarea");
    if (textarea && textarea.offsetParent !== null) return textarea;
    const ce = document.querySelector('[contenteditable="true"]');
    if (ce && ce.offsetParent !== null) return ce;
    return null;
  }
  function getInputText(element) {
    if (!element) return "";
    if (element instanceof HTMLTextAreaElement) {
      return element.value.trim();
    }
    if (element.getAttribute("contenteditable") === "true") {
      return element.innerText?.trim() || element.textContent?.trim() || "";
    }
    return "";
  }
  function findActiveInput() {
    const selectors = TEXTAREA_SELECTORS[platformName || ""] || [];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) {
        return element;
      }
    }
    const textarea = document.querySelector(
      'textarea:not([type="hidden"])'
    );
    if (textarea && textarea.offsetParent !== null) return textarea;
    const contentEditable = document.querySelector(
      '[contenteditable="true"]'
    );
    if (contentEditable && contentEditable.offsetParent !== null)
      return contentEditable;
    return null;
  }
  function capturePrompt() {
    const input = findActiveInput();
    const text = getInputText(input);
    if (text && text.length > 0) {
      console.log("[1-prompt] Captured prompt:", text.slice(0, 50) + "...");
      return text;
    }
    return null;
  }
  function getConversationId() {
    const url = window.location.href;
    const patterns = {
      chatgpt: /\/c\/([a-zA-Z0-9-]+)/,
      claude: /\/chat\/([a-zA-Z0-9-]+)/,
      gemini: /\/app\/([a-zA-Z0-9-]+)/,
      perplexity: /\/search\/([a-zA-Z0-9-]+)/,
      deepseek: /\/chat\/([a-zA-Z0-9-]+)/,
      lovable: /\/projects\/([a-zA-Z0-9-]+)/,
      bolt: /\/~\/([a-zA-Z0-9-]+)/,
      cursor: /\/chat\/([a-zA-Z0-9-]+)/,
      "meta-ai": /\/c\/([a-zA-Z0-9-]+)/
    };
    const pattern = patterns[platformName || ""];
    if (pattern) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    const pathname = new URL(url).pathname;
    return `fallback_${hashString(pathname)}`;
  }
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  function getStorageKey() {
    const conversationId = getConversationId();
    return `sessionPrompts_${platformName}_${conversationId}`;
  }
  function containsSensitiveData(text) {
    const patterns = [
      // Email addresses
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      // Credit card numbers (basic pattern)
      /\b(?:\d{4}[-\s]?){3}\d{4}\b/,
      // SSN (US)
      /\b\d{3}-\d{2}-\d{4}\b/,
      // Phone numbers (US)
      /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
      // API keys (common patterns)
      /\b(sk|pk|api)[-_]?[a-zA-Z0-9]{20,}\b/i,
      // AWS keys
      /AKIA[0-9A-Z]{16}/,
      // Passwords (common indicators)
      /password\s*[:=]\s*\S+/i,
      // JWT tokens
      /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/
    ];
    return patterns.some((p) => p.test(text));
  }
  function addToSession(text) {
    if (!text || text.trim().length === 0) return;
    const conversationId = getConversationId();
    const content = text.trim();
    const lowerContent = content.toLowerCase();
    if (containsSensitiveData(content)) {
      console.log("[1-prompt] Skipping prompt with sensitive data (PII detected)");
      return;
    }
    if (lowerContent.includes("branding approach:") || lowerContent.includes("selected option:") || lowerContent.includes("choice:")) {
      console.log("[1-prompt] Skipping system choice capture");
      return;
    }
    const isDuplicate = sessionPrompts.some(
      (p) => normalizeForComparison(p.content) === normalizeForComparison(content)
    );
    if (isDuplicate) {
      console.log("[1-prompt] Skipping duplicate prompt");
      return;
    }
    const prompt = {
      content,
      index: sessionPrompts.length,
      timestamp: Date.now(),
      conversationId,
      source: "keylog"
    };
    sessionPrompts.push(prompt);
    const storageKey = getStorageKey();
    chrome.storage.session?.set({
      [storageKey]: sessionPrompts
    }).catch(() => {
      chrome.storage.local.set({
        [storageKey]: sessionPrompts
      });
    });
    console.log(
      `[1-prompt] Session prompts for ${conversationId}: ${sessionPrompts.length}`
    );
    const sendToBackground = (retries = 2) => {
      chrome.runtime.sendMessage(
        {
          action: "SAVE_SESSION_PROMPTS",
          prompts: [prompt],
          platform: platformName || "unknown",
          conversationId
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "[1-prompt] Failed to save prompt:",
              chrome.runtime.lastError.message
            );
            if (retries > 0) {
              setTimeout(() => sendToBackground(retries - 1), 500);
            } else {
              console.error(
                "[1-prompt] Could not save prompt after retries. Data saved locally only."
              );
            }
          } else if (response?.success) {
            console.log("[1-prompt] Prompt saved to background");
          }
        }
      );
    };
    sendToBackground();
  }
  async function loadSessionPrompts() {
    try {
      const storageKey = getStorageKey();
      const data = await chrome.storage.session?.get(storageKey) || await chrome.storage.local.get(storageKey);
      if (data[storageKey]) {
        sessionPrompts = data[storageKey];
        console.log(
          `[1-prompt] Loaded ${sessionPrompts.length} session prompts for conversation`
        );
      }
    } catch (e) {
      console.log("[1-prompt] Could not load session prompts");
    }
  }
  function hookSendButton() {
    const selectors = SEND_BUTTON_SELECTORS[platformName || ""] || [];
    for (const selector of selectors) {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach((button) => {
        if (button.getAttribute("data-pe-hooked")) return;
        button.setAttribute("data-pe-hooked", "true");
        button.addEventListener(
          "mousedown",
          () => {
            const text = capturePrompt();
            if (text) {
              button.__peText = text;
            }
          },
          true
        );
        button.addEventListener(
          "click",
          () => {
            const text = button.__peText;
            if (text) {
              addToSession(text);
              button.__peText = null;
            }
          },
          true
        );
        console.log("[1-prompt] Hooked send button:", selector);
      });
    }
  }
  function hookKeyboardSubmit() {
    const input = findActiveInput();
    if (!input || input.getAttribute("data-pe-key-hooked")) return;
    input.setAttribute("data-pe-key-hooked", "true");
    let pendingCapture = null;
    input.addEventListener(
      "keydown",
      (e) => {
        const isEnter = e.key === "Enter";
        const isCtrlEnter = e.key === "Enter" && (e.ctrlKey || e.metaKey);
        const isShiftEnter = e.key === "Enter" && e.shiftKey;
        if (isEnter && !isShiftEnter || isCtrlEnter) {
          const text = capturePrompt();
          if (text && text.length > 0) {
            pendingCapture = { text, timestamp: Date.now() };
          }
        }
      },
      true
    );
    const observer = new MutationObserver(() => {
      if (!pendingCapture) return;
      if (Date.now() - pendingCapture.timestamp > 2e3) {
        pendingCapture = null;
        return;
      }
      const currentText = getInputText(input);
      if (!currentText || currentText.length < 10) {
        addToSession(pendingCapture.text);
        pendingCapture = null;
      }
    });
    try {
      if (input && input instanceof Node) {
        observer.observe(input, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ["value"]
        });
      }
      if (input && input.parentElement && input.parentElement instanceof Node) {
        observer.observe(input.parentElement, {
          childList: true
        });
      }
    } catch (e) {
      console.warn("[1-prompt] Failed to observe input:", e);
    }
    console.log("[1-prompt] Hooked keyboard submit with MutationObserver");
  }
  function initRealTimeCapture() {
    if (!adapter || !platformName) {
      return;
    }
    loadSessionPrompts();
    hookSendButton();
    hookKeyboardSubmit();
    let hookDebounceTimer = null;
    const observer = new MutationObserver(() => {
      if (hookDebounceTimer) clearTimeout(hookDebounceTimer);
      hookDebounceTimer = setTimeout(() => {
        hookSendButton();
        hookKeyboardSubmit();
      }, 500);
    });
    try {
      if (document.body && document.body instanceof Node) {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    } catch (e) {
    }
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log("[1-prompt] URL changed, reloading session");
        sessionPrompts = [];
        loadSessionPrompts();
        setTimeout(() => {
          hookSendButton();
          hookKeyboardSubmit();
        }, 1e3);
      }
    });
    try {
      if (document.body && document.body instanceof Node) {
        urlObserver.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    } catch (e) {
    }
    console.log("[1-prompt] Real-time capture initialized (optimized)");
  }
  async function scrollConversation() {
    if (!adapter) return;
    const container = adapter.getScrollContainer();
    if (!container) {
      console.warn("[1-prompt] No scroll container found, skipping history load");
      return;
    }
    const config2 = getScrollConfig(platformName);
    const tier = getConfigTier(platformName);
    console.log(
      `[1-prompt] Starting conversation scroll on container: ${container.tagName}`
    );
    console.log(`[1-prompt] Platform: ${platformName} (${tier})`);
    console.log(
      `[1-prompt] Config: top=${config2.topAttempts}, bottom=${config2.bottomAttempts}, wait=${config2.waitPerScroll}ms, stability=${config2.stabilityChecks}`
    );
    let maxHeight = 0;
    chrome.runtime.sendMessage({
      action: "PROGRESS",
      message: "1-prompt is scrolling to capture your lengthy conversation"
    });
    chrome.runtime.sendMessage({
      action: "PROGRESS",
      message: "Discovering all messages..."
    });
    console.log(
      `[1-prompt] Phase 1: Scrolling to bottom (${config2.bottomAttempts} attempts)...`
    );
    for (let i = 0; i < config2.bottomAttempts; i++) {
      container.scrollTop = container.scrollHeight;
      container.scrollTo({ top: container.scrollHeight, behavior: "auto" });
      await new Promise((resolve) => setTimeout(resolve, config2.waitPerScroll));
      const currentHeight = container.scrollHeight;
      console.log(
        `[1-prompt] Bottom scroll ${i + 1}/${config2.bottomAttempts}: height ${currentHeight}px (max: ${maxHeight}px)`
      );
      if (currentHeight === maxHeight) {
        console.log("[1-prompt] Height stable - all content discovered");
        break;
      }
      maxHeight = currentHeight;
    }
    console.log(
      `[1-prompt] Phase 2: Scrolling to top (${config2.topAttempts} attempts)...`
    );
    chrome.runtime.sendMessage({
      action: "PROGRESS",
      message: "Navigating to oldest messages..."
    });
    let topMaxHeight = 0;
    let topSameHeightCount = 0;
    for (let i = 0; i < config2.topAttempts; i++) {
      container.scrollTop = 0;
      container.scrollTo({ top: 0, behavior: "auto" });
      await new Promise((resolve) => setTimeout(resolve, config2.waitPerScroll));
      const currentHeight = container.scrollHeight;
      console.log(
        `[1-prompt] Top scroll ${i + 1}/${config2.topAttempts}: height ${currentHeight}px (max: ${topMaxHeight}px)`
      );
      if (currentHeight === topMaxHeight) {
        topSameHeightCount++;
        if (topSameHeightCount >= config2.stabilityChecks) {
          console.log(
            `[1-prompt] Top height stable for ${config2.stabilityChecks} checks - all oldest messages loaded`
          );
          break;
        }
      } else {
        topSameHeightCount = 0;
      }
      topMaxHeight = currentHeight;
    }
    console.log("[1-prompt] Phase 3: Final scroll to bottom for latest prompts...");
    container.scrollTop = container.scrollHeight;
    container.scrollTo({ top: container.scrollHeight, behavior: "auto" });
    await new Promise((resolve) => setTimeout(resolve, config2.waitPerScroll * 2));
    console.log(
      `[1-prompt] Scroll complete. Total height: ${container.scrollHeight}px. Ready for extraction.`
    );
  }
  async function extractFromMultiplePositions(adapter2) {
    const allPrompts = [];
    const globalSeen = /* @__PURE__ */ new Set();
    let nextIndex = 0;
    const container = adapter2.getScrollContainer();
    if (!container) {
      console.warn("[1-prompt] No scroll container for parallel extraction");
      return adapter2.scrapePrompts();
    }
    const config2 = getScrollConfig(platformName);
    const totalHeight = container.scrollHeight;
    console.log(
      `[1-prompt] Starting parallel extraction from height: ${totalHeight}px`
    );
    const extractionPoints = [
      { name: "TOP", position: 0 },
      { name: "25%", position: totalHeight * 0.25 },
      { name: "MIDDLE", position: totalHeight * 0.5 },
      { name: "75%", position: totalHeight * 0.75 },
      { name: "BOTTOM", position: totalHeight }
    ];
    for (const point of extractionPoints) {
      container.scrollTop = point.position;
      container.scrollTo({ top: point.position, behavior: "auto" });
      await new Promise((resolve) => setTimeout(resolve, config2.parallelWait));
      const pointPrompts = await adapter2.scrapePrompts();
      for (const prompt of pointPrompts) {
        const normalized = normalizeForComparison(prompt.content);
        if (!globalSeen.has(normalized)) {
          globalSeen.add(normalized);
          prompt.index = nextIndex++;
          prompt.source = "dom";
          allPrompts.push(prompt);
        }
      }
    }
    return allPrompts;
  }
  async function extractPrompts(source = "auto") {
    if ((source === "auto" || source === "dom") && adapter) {
      await scrollConversation();
    }
    let allKeyloggedPrompts = [];
    if (source === "auto" || source === "keylog") {
      const currentSessionPrompts = [...sessionPrompts];
      const conversationId = getConversationId();
      let persistentPrompts = [];
      if (conversationId) {
        try {
          console.log("[1-prompt] Fetching persistent logs for:", conversationId);
          const responsePromise = chrome.runtime.sendMessage({
            action: "GET_CONVERSATION_LOGS",
            platform: platformName,
            conversationId
          });
          const timeoutPromise = new Promise(
            (resolve) => setTimeout(() => resolve({ prompts: [] }), 1500)
          );
          const response = await Promise.race([
            responsePromise,
            timeoutPromise
          ]);
          if (response && response.prompts) {
            persistentPrompts = response.prompts;
            console.log(
              `[1-prompt] Found ${persistentPrompts.length} persistent prompts`
            );
          }
        } catch (e) {
          console.error("[1-prompt] Failed to fetch persistent logs:", e);
        }
      }
      allKeyloggedPrompts = [...persistentPrompts];
      const persistentContent = new Set(
        persistentPrompts.map((p) => normalizeForComparison(p.content))
      );
      for (const p of currentSessionPrompts) {
        if (!persistentContent.has(normalizeForComparison(p.content))) {
          allKeyloggedPrompts.push(p);
        }
      }
    }
    if (source === "keylog") {
      return allKeyloggedPrompts.map((p, i) => ({ ...p, index: i })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }
    let domPrompts = [];
    if ((source === "auto" || source === "dom") && adapter) {
      console.log("[1-prompt] Augmenting with DOM scraping...");
      if (platformName?.toLowerCase() === "lovable") {
        console.log(
          "[1-prompt] Using ba96d2c slow multi-position extraction for Lovable..."
        );
        domPrompts = await extractFromMultiplePositions(adapter);
      } else {
        console.log(`[1-prompt] Using fast DOM extraction for ${platformName}...`);
        domPrompts = await adapter.scrape();
      }
      console.log(
        `[1-prompt] DOM extraction complete: ${domPrompts.length} prompts`
      );
    }
    if (source === "dom") {
      return domPrompts;
    }
    if (domPrompts.length === 0 && allKeyloggedPrompts.length > 0) {
      console.log("[1-prompt] Using captured prompts as primary source");
      return allKeyloggedPrompts.map((p, i) => ({ ...p, index: i })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }
    const capturedContentMap = /* @__PURE__ */ new Map();
    for (const p of allKeyloggedPrompts) {
      capturedContentMap.set(normalizeForComparison(p.content), p);
    }
    let finalPrompts = [];
    const addedContent = /* @__PURE__ */ new Set();
    for (let i = 0; i < domPrompts.length; i++) {
      const domPrompt = domPrompts[i];
      const normalizedContent = normalizeForComparison(domPrompt.content);
      if (addedContent.has(normalizedContent) && normalizedContent.length > 10) {
        continue;
      }
      const capturedVersion = capturedContentMap.get(normalizedContent);
      if (capturedVersion) {
        finalPrompts.push({
          ...capturedVersion,
          index: finalPrompts.length,
          source: capturedVersion.source || "keylog"
        });
      } else {
        finalPrompts.push({
          ...domPrompt,
          index: finalPrompts.length,
          source: "dom"
        });
      }
      addedContent.add(normalizedContent);
    }
    for (const captured of allKeyloggedPrompts) {
      const normalizedContent = normalizeForComparison(captured.content);
      if (!addedContent.has(normalizedContent)) {
        console.log(
          `[1-prompt] Adding captured prompt not found in DOM: ${captured.content.slice(0, 40)}...`
        );
        finalPrompts.push({
          ...captured,
          index: finalPrompts.length,
          source: captured.source || "keylog"
        });
        addedContent.add(normalizedContent);
      }
    }
    console.log(
      `[1-prompt] Extraction complete: ${finalPrompts.length} prompts (${domPrompts.length} from DOM, ${allKeyloggedPrompts.length} captured)`
    );
    return finalPrompts;
  }
  function normalizeForComparison(text) {
    return text.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 1e3);
  }
  function createExtractionResult(prompts) {
    const conversationId = getConversationId();
    return {
      platform: platformName || "unknown",
      url: window.location.href,
      title: document.title,
      prompts,
      extractedAt: Date.now(),
      conversationId
    };
  }
  const BUTTON_STYLES = `

  .pe-has-zone1-absolute {
    position: relative !important;
    padding-top: 48px !important;
    overflow: visible !important;
  }

  .pe-zone1 {
    position: absolute !important;
    top: 8px !important;
    left: 8px !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    width: calc(100% - 16px) !important;
    box-sizing: border-box !important;
    background: transparent !important;
    padding-bottom: 0 !important;
    border-bottom: none !important;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif !important;
    z-index: 2147483647 !important;
    pointer-events: auto !important;
    visibility: visible !important;
    opacity: 1 !important;
    height: 32px !important;
  }
  
  .pe-zone1-btn {
    position: relative !important;
    z-index: 10001 !important;
    box-sizing: border-box !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 32px !important;
    min-height: 32px !important;
    padding: 0 16px !important;
    border-radius: 16px !important;
    font-size: 13px !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    margin: 0 !important;
    text-transform: none !important;
    letter-spacing: -0.01em !important;
    cursor: pointer !important;
    transition: none !important;
    white-space: nowrap !important;
    pointer-events: auto !important;
    outline: none !important;
    overflow: hidden !important;
    
    /* Flat & Solid Style */
    background: #ffffff !important;
    border: 0.8px solid rgba(0, 90, 226, 0.2) !important;
    color: #002D8B !important; /* Midnight Blue */
    box-shadow: none !important;
  }

  .pe-zone1-btn:hover {
    background: #ffffff !important;
    border-color: #005AE2 !important; /* Vibrant Blue */
    color: #005AE2 !important;
    transform: none !important;
    box-shadow: none !important;
  }

  .pe-zone1-btn:active {
    transform: scale(0.96) !important;
  }

  .pe-zone1-btn.loading {
    pointer-events: none !important;
    opacity: 0.7 !important;
  }
  
  .pe-zone1-btn.extract, .pe-zone1-btn.summarize, .pe-zone1-btn.paste {
    /* Base styles handled by pe-zone1-btn */
  }
  
  .pe-zone1-btn svg {
    width: 12px !important;
    height: 12px !important;
    margin-right: 6px !important;
    display: inline-block !important;
    vertical-align: middle !important;
    flex-shrink: 0 !important;
    stroke-width: 2.5 !important;
  }

  @keyframes pe-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .pe-spinner {
    animation: pe-spin 1s linear infinite !important;
    transform-origin: center !important;
    color: #005AE2 !important; /* Logo Vibrant Blue */
  }
`;
  const INPUT_CONTAINER_SELECTORS = {
    chatgpt: [
      "#composer-background",
      '[data-testid="composer-background"]',
      "#prompt-textarea-wrapper",
      'form[class*="stretch"] > div > div',
      'form.w-full > div > div[class*="relative"]',
      "main form > div > div"
    ],
    claude: [
      'div:has(> [contenteditable="true"])',
      'div.relative:has([contenteditable="true"])',
      'fieldset:has([contenteditable="true"])',
      'form:has([contenteditable="true"])',
      '[data-testid="composer-container"]',
      ".composer-container"
    ],
    gemini: [
      "rich-textarea",
      ".input-area",
      ".input-area-container",
      'section[class*="input-area"]',
      ".text-input-field_textarea-wrapper"
    ],
    perplexity: ['[data-testid="ask-input-container"]', ".ask-input-container"],
    deepseek: [".chat-input-container", "#chat-input"],
    lovable: [
      ".prompt-input-container",
      '[data-testid="prompt-input"]',
      'div[class*="PromptBox"]',
      'div[class*="InputArea"]'
    ],
    bolt: [".chat-input", '[data-testid="chat-input"]'],
    cursor: [".input-container", '[data-testid="input"]'],
    "meta-ai": ['[data-testid="composer"]', ".composer"]
  };
  function findInputContainer() {
    const selectors = INPUT_CONTAINER_SELECTORS[platformName || ""] || [];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) {
        if (element.getAttribute("contenteditable") === "true" || element.tagName === "TEXTAREA") {
          continue;
        }
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
          continue;
        }
        const rect = element.getBoundingClientRect();
        if (rect.height > 450 || rect.height < 20) continue;
        return element;
      }
    }
    if (platformName === "claude") {
      const input = document.querySelector('[contenteditable="true"], textarea');
      if (input && input.offsetParent !== null) {
        const container = input.closest("div.relative, fieldset, form");
        if (container && container.offsetParent !== null) {
          const rect = container.getBoundingClientRect();
          if (rect.height > 30 && rect.height < 450) {
            return container;
          }
        }
        let parent = input.parentElement;
        let depth = 0;
        while (parent && depth < 6) {
          const rect = parent.getBoundingClientRect();
          const isEditable = parent.getAttribute("contenteditable") === "true";
          const style = window.getComputedStyle(parent);
          const isVisible = style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
          if (rect.height > 30 && rect.height < 400 && !isEditable && isVisible) {
            return parent;
          }
          parent = parent.parentElement;
          depth++;
        }
      }
    }
    if (platformName === "chatgpt") {
      const form = document.querySelector(
        'form[class*="stretch"], form.w-full'
      );
      if (form) {
        const innerDiv = form.querySelector(
          'div[class*="rounded"]'
        );
        if (innerDiv && innerDiv.offsetParent !== null) return innerDiv;
        const firstDiv = form.querySelector(":scope > div > div");
        if (firstDiv) return firstDiv;
      }
    }
    const textareas = document.querySelectorAll(
      'textarea, [contenteditable="true"]'
    );
    for (const textarea of textareas) {
      if (textarea.offsetParent !== null) {
        let parent = textarea.parentElement;
        let depth = 0;
        while (parent && depth < 6) {
          const style = window.getComputedStyle(parent);
          const hasRadius = style.borderRadius && style.borderRadius !== "0px";
          const hasBg = style.backgroundColor !== "transparent" && style.backgroundColor !== "rgba(0, 0, 0, 0)";
          if (hasRadius || hasBg) {
            const rect = parent.getBoundingClientRect();
            if (rect.height < 450) {
              return parent;
            }
          }
          parent = parent.parentElement;
          depth++;
        }
      }
    }
    const forms = document.querySelectorAll("form");
    for (const form of forms) {
      if (form.querySelector('textarea, [contenteditable="true"]')) {
        const rect = form.getBoundingClientRect();
        if (rect.height < 450) return form;
      }
    }
    return null;
  }
  function injectStyles() {
    if (document.getElementById("pe-styles")) return;
    const style = document.createElement("style");
    style.id = "pe-styles";
    style.textContent = BUTTON_STYLES;
    (document.head || document.documentElement).appendChild(style);
  }
  function createZone1() {
    const zone1 = document.createElement("div");
    zone1.id = "pe-zone1";
    zone1.className = "pe-zone1";
    const extractBtn = document.createElement("button");
    extractBtn.id = "pe-extract-btn";
    extractBtn.className = "pe-zone1-btn extract";
    extractBtn.textContent = "Capture";
    extractBtn.title = "Extract raw prompts to 1-prompt";
    extractBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleButtonClick("capture", extractBtn);
      },
      true
    );
    zone1.appendChild(extractBtn);
    const summarizeBtn = document.createElement("button");
    summarizeBtn.id = "pe-summarize-btn";
    summarizeBtn.className = "pe-zone1-btn summarize";
    summarizeBtn.textContent = "Compile";
    summarizeBtn.title = "Capture and compile prompts with AI";
    summarizeBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleButtonClick("compile", summarizeBtn);
      },
      true
    );
    zone1.appendChild(summarizeBtn);
    return zone1;
  }
  function updateButtonLoading(button) {
    button.classList.add("loading");
    button.innerHTML = `
    <svg class="pe-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
    </svg>
    Capturing...
  `;
  }
  function updateButtonDone(button, originalText) {
    button.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:14px; height:14px; margin-right:6px; display:inline-block; vertical-align:middle;">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    Done!
  `;
    setTimeout(() => {
      button.classList.remove("loading");
      button.textContent = originalText;
    }, 2e3);
  }
  async function handleButtonClick(mode, button) {
    console.log(`[1-prompt] Button clicked: ${mode}`);
    const isSummarize = mode === "compile";
    const originalText = isSummarize ? "Compile" : "Capture";
    try {
      await chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" });
    } catch (error) {
      if (error.message.includes("Extension context invalidated")) {
        console.warn("[1-prompt] Extension reloaded, refreshing page...");
        window.location.reload();
        return;
      }
      console.error("[1-prompt] Failed to open side panel:", error);
    }
    try {
      await chrome.runtime.sendMessage({ action: "EXTRACT_TRIGERED_FROM_PAGE", mode });
    } catch (error) {
      if (error.message.includes("Extension context invalidated")) {
        console.warn("[1-prompt] Extension reloaded during trigger, refreshing page...");
        window.location.reload();
        return;
      }
      console.error("[1-prompt] Failed to notify side panel:", error);
    }
    updateButtonLoading(button);
    if (isSummarize) {
      button.innerHTML = `
      <svg class="pe-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
      </svg>
      Compiling...
    `;
    }
    try {
      console.log("[1-prompt] Starting extraction...");
      const prompts = await extractPrompts();
      console.log(`[1-prompt] Extracted ${prompts.length} prompts`);
      const result = createExtractionResult(prompts);
      console.log("[1-prompt] Sending EXTRACTION_FROM_PAGE to background...");
      await chrome.runtime.sendMessage({
        action: "EXTRACTION_FROM_PAGE",
        result,
        mode
      });
      updateButtonDone(button, originalText);
    } catch (error) {
      if (error.message.includes("Extension context invalidated")) {
        console.warn("[1-prompt] Extension reloaded during extraction, refreshing page...");
        window.location.reload();
        return;
      }
      console.error("[1-prompt] Error:", error);
      button.textContent = "Error";
      setTimeout(() => {
        button.classList.remove("loading");
        button.textContent = originalText;
      }, 2e3);
    }
  }
  function createZonedLayout() {
    if (document.getElementById("pe-zone1")) return;
    if (!adapter) return;
    console.log("[1-prompt] Attempting to create zoned layout...");
    const url = window.location.href;
    const hasConversationId = url.includes("/c/") || url.includes("/chat/") || url.includes("/thread/") || url.includes("/projects/");
    const urlObj = new URL(url);
    const isRootPath = (urlObj.hostname.includes("chatgpt.com") || urlObj.hostname.includes("openai.com")) && (urlObj.pathname === "/" || urlObj.pathname === "");
    if (platformName === "claude") {
      if (window.location.hostname.includes("claude.ai") && !window.location.pathname.includes("/chat")) {
        return;
      }
    } else if (platformName === "chatgpt" && !hasConversationId && !isRootPath) {
      return;
    }
    const inputContainer = findInputContainer();
    injectStyles();
    if (inputContainer) {
      inputContainer.style.display = "";
      inputContainer.style.flexDirection = "";
      inputContainer.style.alignItems = "";
      inputContainer.style.gap = "";
      inputContainer.classList.add("pe-has-zone1-absolute");
      const zone1 = createZone1();
      inputContainer.prepend(zone1);
      if (document.getElementById("pe-zone1")) {
        const floating = document.getElementById("pe-floating-zone");
        if (floating) floating.remove();
        if (platformName === "claude") {
          const stickyObserver = new MutationObserver(() => {
            if (!document.getElementById("pe-zone1")) {
              console.log("[1-prompt] Claude removed buttons, re-injecting...");
              inputContainer.prepend(createZone1());
            }
            if (!inputContainer.classList.contains("pe-has-zone1-absolute")) {
              console.log("[1-prompt] Claude removed layout class, re-applying...");
              inputContainer.classList.add("pe-has-zone1-absolute");
              inputContainer.style.paddingTop = "48px";
            }
          });
          try {
            if (inputContainer && inputContainer instanceof Node) {
              stickyObserver.observe(inputContainer, {
                childList: true,
                attributes: true,
                attributeFilter: ["class", "style"]
              });
            }
          } catch (e) {
          }
        }
      }
      console.log("[1-prompt] Zoned layout initialized (Input Container Mode)");
    }
  }
  function showPasteButton() {
    const zone1 = document.getElementById("pe-zone1");
    if (!zone1 || document.getElementById("pe-paste-btn")) return;
    const pasteBtn = document.createElement("button");
    pasteBtn.id = "pe-paste-btn";
    pasteBtn.className = "pe-zone1-btn paste";
    pasteBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
       <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
       <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
    Paste
  `;
    pasteBtn.title = "Paste copied prompts into Chat";
    pasteBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handlePaste();
    };
    zone1.appendChild(pasteBtn);
  }
  function hidePasteButton() {
    const pasteBtn = document.getElementById("pe-paste-btn");
    if (pasteBtn) pasteBtn.remove();
  }
  async function handlePaste() {
    let textToPaste = copiedContent;
    if (!textToPaste) {
      try {
        textToPaste = await navigator.clipboard.readText();
      } catch (e) {
        console.error("Failed to read clipboard:", e);
      }
    }
    if (!textToPaste) return;
    const target = findChatInput();
    if (!target) {
      console.error("[1-prompt] Could not find input field to paste");
      return;
    }
    target.focus();
    if (target instanceof HTMLTextAreaElement) {
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || 0;
      const currentVal = target.value;
      target.value = currentVal.substring(0, start) + textToPaste + currentVal.substring(end);
      target.selectionStart = target.selectionEnd = start + textToPaste.length;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      try {
        document.execCommand("insertText", false, textToPaste);
      } catch (e) {
        console.error(
          "[1-prompt] Standard insertText failed, trying direct innerText update",
          e
        );
        target.innerText = textToPaste;
        target.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    console.log("[1-prompt] Successfully pasted content");
    copiedContent = null;
    hidePasteButton();
  }
  function removeZonedLayout() {
    const zone1 = document.getElementById("pe-zone1");
    if (zone1) zone1.remove();
    const inputContainer = findInputContainer();
    if (inputContainer) {
      inputContainer.style.display = "";
      inputContainer.style.flexDirection = "";
      inputContainer.style.alignItems = "";
      inputContainer.style.gap = "";
    }
    const styles = document.getElementById("pe-styles");
    if (styles) styles.remove();
  }
  let scheduleCheckGlobal = () => {
  };
  function initZonedLayout() {
    if (!adapter || !platformName) {
      return;
    }
    let attempts = 0;
    const maxAttempts = 10;
    const tryCreate = () => {
      if (document.getElementById("pe-zone1")) return;
      if (!adapter) return;
      createZonedLayout();
      if (!document.getElementById("pe-zone1") && attempts < maxAttempts) {
        attempts++;
        setTimeout(tryCreate, 500);
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", tryCreate);
    } else {
      tryCreate();
    }
    let lastUrl = location.href;
    let checkScheduled = false;
    let lastHasPrompts = false;
    const scheduleCheck = () => {
      if (checkScheduled) return;
      checkScheduled = true;
      const scheduleIdleCheck = window.requestIdleCallback || ((cb) => setTimeout(cb, 100));
      scheduleIdleCheck(
        () => {
          checkScheduled = false;
          if (location.href !== lastUrl) {
            lastUrl = location.href;
            console.log("[1-prompt] URL change detected");
          }
          const url = window.location.href;
          const hasConversationId = url.includes("/c/") || url.includes("/chat/") || url.includes("/thread/");
          const urlObj = new URL(url);
          const isRootPath = (urlObj.hostname.includes("chatgpt.com") || urlObj.hostname.includes("openai.com")) && (urlObj.pathname === "/" || urlObj.pathname === "");
          const isOnSupportedPlatform = !!platformName && platformName !== "generic";
          let shouldShow = isOnSupportedPlatform;
          let shouldShowZone1 = false;
          if (platformName === "claude") {
            shouldShowZone1 = window.location.pathname.includes("/chat");
          } else if (platformName === "chatgpt") {
            shouldShowZone1 = hasConversationId || isRootPath;
          } else {
            shouldShowZone1 = true;
          }
          if (shouldShow) {
            const hasZone1 = !!document.getElementById("pe-zone1");
            const hasFigmaPill = !!document.getElementById(
              "pe-figma-pill-container"
            );
            if (hasFigmaPill) {
              document.getElementById("pe-figma-pill-container")?.remove();
            }
            if (!hasZone1 && shouldShowZone1 && adapter) {
              createZonedLayout();
            }
          } else {
            if (document.getElementById("pe-zone1") || document.getElementById("pe-figma-pill-container")) {
              console.log(
                "[1-prompt] Removing buttons: No longer on supported platform"
              );
              removeZonedLayout();
              document.getElementById("pe-figma-pill-container")?.remove();
            }
          }
          const currentHasPrompts = adapter ? adapter.scrapePrompts().length > 0 : false;
          if (currentHasPrompts !== lastHasPrompts) {
            lastHasPrompts = currentHasPrompts;
            chrome.runtime.sendMessage({
              action: "STATUS_RESULT",
              supported: !!adapter,
              platform: platformName,
              hasPrompts: currentHasPrompts
            });
          }
        },
        { timeout: 2e3 }
      );
    };
    scheduleCheckGlobal = scheduleCheck;
    const layoutObserver = new MutationObserver((mutations) => {
      const hasRelevantChange = mutations.some(
        (m) => m.type === "childList" && m.addedNodes.length > 0
      );
      if (hasRelevantChange) {
        scheduleCheck();
      }
    });
    try {
      if (document.documentElement && document.documentElement instanceof Node) {
        layoutObserver.observe(document.documentElement, {
          childList: true,
          subtree: true
        });
      }
    } catch (e) {
    }
    scheduleCheck();
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("[1-prompt] Received message:", message.action);
    switch (message.action) {
      case "URL_CHANGED": {
        console.log("[1-prompt] URL changed, resetting session");
        updateAdapter();
        sessionPrompts = [];
        loadSessionPrompts();
        const zone1 = document.getElementById("pe-zone1");
        if (zone1) {
          removeZonedLayout();
        }
        setTimeout(() => {
          scheduleCheckGlobal();
          hookSendButton();
          hookKeyboardSubmit();
        }, 500);
        sendResponse({ success: true });
        break;
      }
      case "EXTRACT_PROMPTS": {
        if (isExtracting) {
          console.warn(
            "[1-prompt] Extraction already in progress, ignoring request"
          );
          sendResponse({
            success: false,
            error: "Extraction already in progress. Please wait."
          });
          return true;
        }
        const mode = message.mode;
        const extractionSource = message.extractionSource || "auto";
        isExtracting = true;
        const extractBtn = document.getElementById(
          "pe-extract-btn"
        );
        const originalText = extractBtn ? extractBtn.textContent || "Capture" : "Capture";
        if (extractBtn) updateButtonLoading(extractBtn);
        extractPrompts(extractionSource).then((prompts) => {
          const result = createExtractionResult(prompts);
          chrome.runtime.sendMessage({
            action: "EXTRACTION_RESULT",
            result,
            mode
          });
          if (extractBtn) updateButtonDone(extractBtn, originalText);
          sendResponse({ success: true, promptCount: prompts.length });
        }).catch((err) => {
          console.error("[1-prompt] Extraction failed:", err);
          if (extractBtn) {
            extractBtn.textContent = "Error";
            setTimeout(() => {
              extractBtn.classList.remove("loading");
              extractBtn.textContent = originalText;
            }, 2e3);
          }
          sendResponse({ success: false, error: err.message });
        }).finally(() => {
          isExtracting = false;
        });
        setTimeout(() => {
          if (isExtracting) {
            console.warn("[1-prompt] Extraction lock safety timeout reached");
            isExtracting = false;
          }
        }, 45e3);
        return true;
      }
      case "GET_STATUS": {
        sendResponse({
          action: "STATUS_RESULT",
          supported: !!adapter,
          platform: platformName,
          hasPrompts: adapter ? adapter.scrapePrompts().length > 0 : false
        });
        break;
      }
      case "TOGGLE_BUTTONS": {
        if (message.visible) {
          createZonedLayout();
        } else {
          removeZonedLayout();
        }
        sendResponse({ success: true });
        break;
      }
      case "CONTENT_COPIED": {
        copiedContent = message.content;
        showPasteButton();
        sendResponse({ success: true });
        break;
      }
      default:
        sendResponse({ success: false, error: "Unknown action" });
    }
    return true;
  });
  broadcastStatus();
  initZonedLayout();
  initRealTimeCapture();
})();
