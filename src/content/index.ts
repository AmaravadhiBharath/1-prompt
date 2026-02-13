import { getAdapter, getPlatformName } from "./adapters";
import { RemoteConfigService } from "../services/remote-config";
import { getScrollConfig, getConfigTier } from "./scroll-config";
import type { ExtractionResult, ScrapedPrompt } from "../types";

// A. FROM Website TO Extension
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
          chrome.runtime.sendMessage({ action: "SET_USER_ID", userId: user.id }).catch(() => { });
        }
      });
    } catch (e) {
      console.error("[1-prompt] Failed to parse user for extension sync", e);
    }
  } else {
    chrome.storage.local.remove(["oneprompt_user", "firebase_id_token", "firebase_current_user_id"], () => {
      chrome.runtime.sendMessage({ action: "SET_USER_ID", userId: null }).catch(() => { });
    });
  }
};

// B. FROM Extension TO Website (Vice-versa)
const syncToWebsite = (user: any, token: string | null) => {
  try {
    if (!user) {
      if (localStorage.getItem("oneprompt_user")) {
        localStorage.removeItem("oneprompt_user");
        localStorage.removeItem("firebase_id_token");
        window.dispatchEvent(new StorageEvent('storage', { key: 'oneprompt_user', newValue: null }));
        console.log("[1-prompt] Synced LOGOUT to Website");
      }
      return;
    }

    const userJson = JSON.stringify(user);
    if (localStorage.getItem("oneprompt_user") !== userJson) {
      localStorage.setItem("oneprompt_user", userJson);
      if (token) localStorage.setItem("firebase_id_token", token);
      window.dispatchEvent(new StorageEvent('storage', { key: 'oneprompt_user', newValue: userJson }));
      console.log("[1-prompt] Synced LOGIN to Website", user.email);
    }
  } catch (e) { }
};

// 1. Initial burst sync on load
syncToExtension();
chrome.storage.local.get(["oneprompt_user", "firebase_id_token"], (res) => {
  syncToWebsite(res.oneprompt_user, res.firebase_id_token);
});

// 2. Continuous monitoring
window.addEventListener('storage', (e) => {
  if (e.key === 'oneprompt_user' || e.key === 'firebase_id_token') syncToExtension();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.oneprompt_user || changes.firebase_id_token)) {
    chrome.storage.local.get(["oneprompt_user", "firebase_id_token"], (res) => {
      syncToWebsite(res.oneprompt_user, res.firebase_id_token);
    });
  }
});

// 3. Message tunnel
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.type !== 'ONE_PROMPT_MSG') return;
  // Support a simple ping from the website to confirm extension presence.
  // Website can send: { type: 'ONE_PROMPT_MSG', action: 'PING' }
  // We respond with: { type: 'ONE_PROMPT_PONG', extensionId }
  if (event.data.action === 'PING') {
    try {
      const extensionId = chrome && chrome.runtime && chrome.runtime.id ? chrome.runtime.id : null;
      window.postMessage({ type: 'ONE_PROMPT_PONG', extensionId }, '*');
    } catch (e) {
      // ignore
    }
    return;
  }

  if (event.data.action === 'SYNC_AUTH') {
    syncToExtension();
  } else if (event.data.action === 'OPEN_SIDE_PANEL') {
    console.log("[1-prompt] OPEN_SIDE_PANEL triggered via postMessage");
    chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" }).catch(() => { });
  }
});

// 4. Internal Message Receiver (for Sidepanel pings)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'SYNC_AUTH') {
    syncToExtension();
    sendResponse({ success: true });
  }
});

// Global lock to prevent concurrent extractions
let isExtracting = false;

  // Get the current adapter
  // Get the current adapter
  let adapter = getAdapter();
  let platformName = getPlatformName();

  // Function to update adapter on navigation
  function updateAdapter() {
    adapter = getAdapter();
    platformName = getPlatformName();
    // console.log(`[1-prompt] Adapter updated: ${platformName || 'unknown'}`);

    // Update debug info (commented out for production)
    // (window as any).__pe_debug = {
    //   adapter,
    //   platformName,
    //   sessionPrompts,
    //   getConversationId,
    //   findInputContainer
    // };

    broadcastStatus();
  }

  function broadcastStatus() {
    chrome.runtime.sendMessage({
      action: "STATUS_RESULT",
      supported: !!adapter,
      platform: platformName,
      hasPrompts: adapter ? adapter.scrapePrompts().length > 0 : false,
    }).catch(() => {
      // Ignore errors - status broadcasts are fire-and-forget
    });
  }

  // Initialize Remote Config (fire and forget)
  RemoteConfigService.getInstance().initialize();

  // console.log('[1-prompt] Content script loaded v1.1.0');
  // console.log(`[1-prompt] URL: ${window.location.href}`);
  // console.log(`[1-prompt] Platform detected: ${platformName || 'unknown'}`);

  // Session storage for captured prompts (new prompts only)
  let sessionPrompts: ScrapedPrompt[] = [];

  // Expose for console debugging (commented out for production)
  // (window as any).__pe_debug = {
  //   adapter,
  //   platformName,
  //   sessionPrompts,
  //   getConversationId,
  //   findInputContainer
  // };

  if (!adapter) {
    console.warn(
      "[1-prompt] No adapter found for this page. Buttons will not be shown.",
    );
  }

  // Store copied content for paste functionality
  let copiedContent: string | null = null;
  const SEND_BUTTON_SELECTORS: Record<string, string[]> = {
    chatgpt: [
      'button[data-testid="send-button"]',
      'button[data-testid="composer-send-button"]',
      'form button[type="submit"]',
      'button[aria-label*="Send"]',
    ],
    claude: [
      'button[aria-label="Send Message"]',
      'button[type="submit"]',
      "fieldset button:last-child",
    ],
    gemini: [
      'button[aria-label*="Send"]',
      ".send-button",
      'button[data-test-id="send-button"]',
    ],
    perplexity: ['button[aria-label="Submit"]', 'button[type="submit"]'],
    deepseek: ['button[data-testid="send-button"]', ".send-btn"],
    lovable: ['button[type="submit"]', 'button[aria-label*="Send"]'],
    bolt: ['button[type="submit"]', ".send-button"],
    cursor: ['button[type="submit"]'],
    "meta-ai": ['button[aria-label*="Send"]', 'button[type="submit"]'],
  };

  const TEXTAREA_SELECTORS: Record<string, string[]> = {
    chatgpt: [
      "#prompt-textarea",
      'textarea[data-id="root"]',
      'div[contenteditable="true"][data-placeholder]',
    ],
    claude: ['div[contenteditable="true"]', "fieldset div[contenteditable]"],
    gemini: [".ql-editor", "rich-textarea div[contenteditable]", "textarea"],
    perplexity: ["textarea", 'div[contenteditable="true"]'],
    deepseek: ["textarea", "#chat-input textarea"],
    lovable: ["textarea"],
    bolt: ["textarea"],
    cursor: ["textarea"],
    "meta-ai": ['div[contenteditable="true"]', "textarea"],
  };

  // Find the actual input field (textarea or contenteditable)
  function findChatInput(): HTMLElement | null {
    const selectors = TEXTAREA_SELECTORS[platformName || ""] || [
      "textarea",
      '[contenteditable="true"]',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && (el as HTMLElement).offsetParent !== null) {
        return el as HTMLElement;
      }
    }

    // Fallback to any visible textarea
    const textarea = document.querySelector("textarea") as HTMLElement;
    if (textarea && textarea.offsetParent !== null) return textarea;

    // Fallback to any visible contenteditable
    const ce = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (ce && ce.offsetParent !== null) return ce;

    return null;
  }

  // Get text from input element
  function getInputText(element: HTMLElement | null): string {
    if (!element) return "";

    if (element instanceof HTMLTextAreaElement) {
      return element.value.trim();
    }

    if (element.getAttribute("contenteditable") === "true") {
      return element.innerText?.trim() || element.textContent?.trim() || "";
    }

    return "";
  }

  // Find the active textarea/input
  function findActiveInput(): HTMLElement | null {
    const selectors = TEXTAREA_SELECTORS[platformName || ""] || [];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && element.offsetParent !== null) {
        return element;
      }
    }

    // Fallback: any visible textarea or contenteditable
    const textarea = document.querySelector(
      'textarea:not([type="hidden"])',
    ) as HTMLElement;
    if (textarea && textarea.offsetParent !== null) return textarea;

    const contentEditable = document.querySelector(
      '[contenteditable="true"]',
    ) as HTMLElement;
    if (contentEditable && contentEditable.offsetParent !== null)
      return contentEditable;

    return null;
  }

  // Capture prompt before submission
  function capturePrompt(): string | null {
    const input = findActiveInput();
    const text = getInputText(input);

    if (text && text.length > 0) {
      console.log("[1-prompt] Captured prompt:", text.slice(0, 50) + "...");
      return text;
    }

    return null;
  }

  // Add captured prompt to session storage
  // ============================================
  // Improved Session Storage with Conversation Isolation
  // ============================================

  // Extract clean conversation ID from URL
  function getConversationId(): string {
    const url = window.location.href;

    // Platform-specific ID extraction
    const patterns: Record<string, RegExp> = {
      chatgpt: /\/c\/([a-zA-Z0-9-]+)/,
      claude: /\/chat\/([a-zA-Z0-9-]+)/,
      gemini: /\/app\/([a-zA-Z0-9-]+)/,
      perplexity: /\/search\/([a-zA-Z0-9-]+)/,
      deepseek: /\/chat\/([a-zA-Z0-9-]+)/,
      lovable: /\/projects\/([a-zA-Z0-9-]+)/,
      bolt: /\/~\/([a-zA-Z0-9-]+)/,
      cursor: /\/chat\/([a-zA-Z0-9-]+)/,
      "meta-ai": /\/c\/([a-zA-Z0-9-]+)/,
    };

    const pattern = patterns[platformName || ""];
    if (pattern) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    // Fallback: hash the pathname (without query params)
    const pathname = new URL(url).pathname;
    return `fallback_${hashString(pathname)}`;
  }

  // Simple hash function for fallback IDs
  function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // Storage key now includes conversation
  function getStorageKey(): string {
    const conversationId = getConversationId();
    return `sessionPrompts_${platformName}_${conversationId}`;
  }

  // PII Detection - Prevent capturing sensitive data
  function containsSensitiveData(text: string): boolean {
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
      /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/,
    ];

    return patterns.some((p) => p.test(text));
  }

  // Updated addToSession
  function addToSession(text: string) {
    if (!text || text.trim().length === 0) return;

    const conversationId = getConversationId();
    const content = text.trim();
    const lowerContent = content.toLowerCase();

    // PII FILTER - Skip sensitive data
    if (containsSensitiveData(content)) {
      console.log("[1-prompt] Skipping prompt with sensitive data (PII detected)");
      return;
    }

    // SYSTEM CHOICE FILTER
    if (
      lowerContent.includes("branding approach:") ||
      lowerContent.includes("selected option:") ||
      lowerContent.includes("choice:")
    ) {
      console.log("[1-prompt] Skipping system choice capture");
      return;
    }

    // DEDUPLICATION CHECK
    const isDuplicate = sessionPrompts.some(
      (p) =>
        normalizeForComparison(p.content) === normalizeForComparison(content),
    );

    if (isDuplicate) {
      console.log("[1-prompt] Skipping duplicate prompt");
      return;
    }

    const prompt: ScrapedPrompt = {
      content,
      index: sessionPrompts.length,
      timestamp: Date.now(),
      conversationId,
      source: "keylog",
    };

    sessionPrompts.push(prompt);

    // Save with conversation-specific key
    const storageKey = getStorageKey();

    chrome.storage.session
      ?.set({
        [storageKey]: sessionPrompts,
      })
      .catch(() => {
        chrome.storage.local.set({
          [storageKey]: sessionPrompts,
        });
      });

    console.log(
      `[1-prompt] Session prompts for ${conversationId}: ${sessionPrompts.length}`,
    );

    // Send to background for persistent storage with retry
    const sendToBackground = (retries = 2) => {
      chrome.runtime.sendMessage(
        {
          action: "SAVE_SESSION_PROMPTS",
          prompts: [prompt],
          platform: platformName || "unknown",
          conversationId,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "[1-prompt] Failed to save prompt:",
              chrome.runtime.lastError.message,
            );
            if (retries > 0) {
              // Retry after a short delay (service worker might be waking up)
              setTimeout(() => sendToBackground(retries - 1), 500);
            } else {
              console.error(
                "[1-prompt] Could not save prompt after retries. Data saved locally only.",
              );
            }
          } else if (response?.success) {
            console.log("[1-prompt] Prompt saved to background");
          }
        },
      );
    };
    sendToBackground();
  }

  // Updated loadSessionPrompts
  async function loadSessionPrompts() {
    try {
      const storageKey = getStorageKey();
      const data =
        (await chrome.storage.session?.get(storageKey)) ||
        (await chrome.storage.local.get(storageKey));

      if (data[storageKey]) {
        sessionPrompts = data[storageKey];
        console.log(
          `[1-prompt] Loaded ${sessionPrompts.length} session prompts for conversation`,
        );
      }
    } catch (e) {
      console.log("[1-prompt] Could not load session prompts");
    }
  }

  // Hook into send button clicks
  function hookSendButton() {
    const selectors = SEND_BUTTON_SELECTORS[platformName || ""] || [];

    for (const selector of selectors) {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach((button) => {
        if (button.getAttribute("data-pe-hooked")) return;

        button.setAttribute("data-pe-hooked", "true");

        // Capture on mousedown (before click clears input)
        button.addEventListener(
          "mousedown",
          () => {
            const text = capturePrompt();
            if (text) {
              // Store temporarily, add after confirmation
              (button as any).__peText = text;
            }
          },
          true,
        );

        // Confirm on click
        button.addEventListener(
          "click",
          () => {
            const text = (button as any).__peText;
            if (text) {
              addToSession(text);
              (button as any).__peText = null;
            }
          },
          true,
        );

        console.log("[1-prompt] Hooked send button:", selector);
      });
    }
  }

  // Hook into keyboard submission (Enter/Ctrl+Enter)
  // Hook into keyboard submission with proper detection
  function hookKeyboardSubmit() {
    const input = findActiveInput();
    if (!input || input.getAttribute("data-pe-key-hooked")) return;

    input.setAttribute("data-pe-key-hooked", "true");

    let pendingCapture: { text: string; timestamp: number } | null = null;

    input.addEventListener(
      "keydown",
      (e: KeyboardEvent) => {
        const isEnter = e.key === "Enter";
        const isCtrlEnter = e.key === "Enter" && (e.ctrlKey || e.metaKey);
        const isShiftEnter = e.key === "Enter" && e.shiftKey;

        // Most platforms: Enter sends (not Shift+Enter which is newline)
        if ((isEnter && !isShiftEnter) || isCtrlEnter) {
          const text = capturePrompt();
          if (text && text.length > 0) {
            pendingCapture = { text, timestamp: Date.now() };
          }
        }
      },
      true,
    );

    // Watch for input clearing (indicates successful send)
    const observer = new MutationObserver(() => {
      if (!pendingCapture) return;

      // Check if within 2 seconds of capture
      if (Date.now() - pendingCapture.timestamp > 2000) {
        pendingCapture = null;
        return;
      }

      const currentText = getInputText(input);

      // If input is now empty or significantly shorter, the send succeeded
      if (!currentText || currentText.length < 10) {
        addToSession(pendingCapture.text);
        pendingCapture = null;
      }
    });

    // Observe the input for changes
    try {
      if (input && input instanceof Node) {
        observer.observe(input, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ["value"],
        });
      }

      // Also observe parent for input replacement (some SPAs replace the element)
      if (input && input.parentElement && input.parentElement instanceof Node) {
        observer.observe(input.parentElement, {
          childList: true,
        });
      }
    } catch (e) {
      console.warn("[1-prompt] Failed to observe input:", e);
    }

    console.log("[1-prompt] Hooked keyboard submit with MutationObserver");
  }

  // Initialize real-time capture
  // Initialize real-time capture with single mechanism
  function initRealTimeCapture() {
    if (!adapter || !platformName) {
      // console.log("[1-prompt] Skipping Real-time capture: no adapter");
      return;
    }

    loadSessionPrompts();

    // Initial hook
    hookSendButton();
    hookKeyboardSubmit();

    // Single observer for DOM changes (replaces setInterval + MutationObserver)
    let hookDebounceTimer: number | null = null;

    const observer = new MutationObserver(() => {
      // Debounce: only run hooks 500ms after last DOM change
      if (hookDebounceTimer) clearTimeout(hookDebounceTimer);

      hookDebounceTimer = setTimeout(() => {
        hookSendButton();
        hookKeyboardSubmit();
      }, 500) as unknown as number;
    });

    try {
      if (document.body && document.body instanceof Node) {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    } catch (e) {
      // console.warn("[1-prompt] Failed to observe body (observer)");
    }

    // Also watch for URL changes (SPA navigation)
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log("[1-prompt] URL changed, reloading session");

        // Reset session for new conversation
        sessionPrompts = [];
        loadSessionPrompts();

        // Re-hook after URL change
        setTimeout(() => {
          hookSendButton();
          hookKeyboardSubmit();
        }, 1000);
      }
    });

    try {
      if (document.body && document.body instanceof Node) {
        urlObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    } catch (e) {
      // console.warn("[1-prompt] Failed to observe body (urlObserver)");
    }

    console.log("[1-prompt] Real-time capture initialized (optimized)");
  }

  // Scroll the conversation to the top to load all history
  // Uses platform-specific scroll configuration for optimal extraction
  async function scrollConversation(): Promise<void> {
    if (!adapter) return;

    const container = adapter.getScrollContainer();
    if (!container) {
      console.warn("[1-prompt] No scroll container found, skipping history load");
      return;
    }

    // Get platform-specific scroll configuration
    const config = getScrollConfig(platformName);
    const tier = getConfigTier(platformName);

    console.log(
      `[1-prompt] Starting conversation scroll on container: ${container.tagName}`,
    );
    console.log(`[1-prompt] Platform: ${platformName} (${tier})`);
    console.log(
      `[1-prompt] Config: top=${config.topAttempts}, bottom=${config.bottomAttempts}, wait=${config.waitPerScroll}ms, stability=${config.stabilityChecks}`,
    );

    // Phase 1: Scroll to BOTTOM to trigger lazy-load of ALL content
    let maxHeight = 0;

    chrome.runtime.sendMessage({
      action: "PROGRESS",
      message: "1-prompt is scrolling to capture your lengthy conversation",
    });

    chrome.runtime.sendMessage({
      action: "PROGRESS",
      message: "Discovering all messages...",
    });

    console.log(
      `[1-prompt] Phase 1: Scrolling to bottom (${config.bottomAttempts} attempts)...`,
    );
    for (let i = 0; i < config.bottomAttempts; i++) {
      container.scrollTop = container.scrollHeight;
      container.scrollTo({ top: container.scrollHeight, behavior: "auto" });
      await new Promise((resolve) => setTimeout(resolve, config.waitPerScroll));

      const currentHeight = container.scrollHeight;
      console.log(
        `[1-prompt] Bottom scroll ${i + 1}/${config.bottomAttempts}: height ${currentHeight}px (max: ${maxHeight}px)`,
      );

      if (currentHeight === maxHeight) {
        console.log("[1-prompt] Height stable - all content discovered");
        break;
      }
      maxHeight = currentHeight;
    }

    // Phase 2: Scroll to TOP to load oldest messages
    // Virtual scrolling keeps messages in DOM when in viewport
    console.log(
      `[1-prompt] Phase 2: Scrolling to top (${config.topAttempts} attempts)...`,
    );
    chrome.runtime.sendMessage({
      action: "PROGRESS",
      message: "Navigating to oldest messages...",
    });

    let topMaxHeight = 0;
    let topSameHeightCount = 0;

    for (let i = 0; i < config.topAttempts; i++) {
      container.scrollTop = 0;
      container.scrollTo({ top: 0, behavior: "auto" });
      await new Promise((resolve) => setTimeout(resolve, config.waitPerScroll));

      const currentHeight = container.scrollHeight;
      console.log(
        `[1-prompt] Top scroll ${i + 1}/${config.topAttempts}: height ${currentHeight}px (max: ${topMaxHeight}px)`,
      );

      // Stop if height stabilizes (no new content loading)
      if (currentHeight === topMaxHeight) {
        topSameHeightCount++;
        if (topSameHeightCount >= config.stabilityChecks) {
          console.log(
            `[1-prompt] Top height stable for ${config.stabilityChecks} checks - all oldest messages loaded`,
          );
          break;
        }
      } else {
        topSameHeightCount = 0;
      }
      topMaxHeight = currentHeight;
    }

    // Phase 3: Final Scroll to BOTTOM to ensure latest prompts are in DOM
    // (Crucial for virtual-scrolled sites like ChatGPT/Claude)
    console.log("[1-prompt] Phase 3: Final scroll to bottom for latest prompts...");
    container.scrollTop = container.scrollHeight;
    container.scrollTo({ top: container.scrollHeight, behavior: "auto" });
    await new Promise((resolve) => setTimeout(resolve, config.waitPerScroll * 2));

    console.log(
      `[1-prompt] Scroll complete. Total height: ${container.scrollHeight}px. Ready for extraction.`,
    );
  }

  async function extractFromMultiplePositions(
    adapter: any,
  ): Promise<ScrapedPrompt[]> {
    const allPrompts: ScrapedPrompt[] = [];
    const globalSeen = new Set<string>();
    let nextIndex = 0;

    const container = adapter.getScrollContainer();
    if (!container) {
      console.warn("[1-prompt] No scroll container for parallel extraction");
      return adapter.scrapePrompts();
    }

    const config = getScrollConfig(platformName);
    const totalHeight = container.scrollHeight;
    console.log(
      `[1-prompt] Starting parallel extraction from height: ${totalHeight}px`,
    );

    // Define extraction points
    const extractionPoints = [
      { name: "TOP", position: 0 },
      { name: "25%", position: totalHeight * 0.25 },
      { name: "MIDDLE", position: totalHeight * 0.5 },
      { name: "75%", position: totalHeight * 0.75 },
      { name: "BOTTOM", position: totalHeight },
    ];

    for (const point of extractionPoints) {
      container.scrollTop = point.position;
      container.scrollTo({ top: point.position, behavior: "auto" });
      await new Promise((resolve) => setTimeout(resolve, config.parallelWait));

      const pointPrompts = await adapter.scrapePrompts();
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

  // Extract prompts from the current page
  async function extractPrompts(
    source: "auto" | "dom" | "keylog" = "auto",
  ): Promise<ScrapedPrompt[]> {
    // 1. Perform scrolling to load history if needed
    // 1. Perform scrolling to load history if needed (DOM Only/Auto)
    if ((source === "auto" || source === "dom") && adapter) {
      await scrollConversation();
    }

    // ----------------------------------------------------
    // 3. KEYLOG / SESSION CAPTURE
    // ----------------------------------------------------
    let allKeyloggedPrompts: ScrapedPrompt[] = [];

    if (source === "auto" || source === "keylog") {
      // 2. Get current session prompts (what we just typed in this tab)
      const currentSessionPrompts = [...sessionPrompts];

      // 3. Get persistent keylogs for this conversation from background
      const conversationId = getConversationId();
      let persistentPrompts: ScrapedPrompt[] = [];

      if (conversationId) {
        try {
          console.log("[1-prompt] Fetching persistent logs for:", conversationId);
          // Add a timeout to the message call to prevent hanging
          const responsePromise = chrome.runtime.sendMessage({
            action: "GET_CONVERSATION_LOGS",
            platform: platformName,
            conversationId,
          });

          const timeoutPromise = new Promise((resolve) =>
            setTimeout(() => resolve({ prompts: [] }), 1500),
          );

          const response = (await Promise.race([
            responsePromise,
            timeoutPromise,
          ])) as any;

          if (response && response.prompts) {
            persistentPrompts = response.prompts;
            console.log(
              `[1-prompt] Found ${persistentPrompts.length} persistent prompts`,
            );
          }
        } catch (e) {
          console.error("[1-prompt] Failed to fetch persistent logs:", e);
        }
      }

      // 4. Merge current session + persistent logs
      allKeyloggedPrompts = [...persistentPrompts];

      // Add current session prompts if they aren't already in persistent logs
      const persistentContent = new Set(
        persistentPrompts.map((p) => normalizeForComparison(p.content)),
      );
      for (const p of currentSessionPrompts) {
        if (!persistentContent.has(normalizeForComparison(p.content))) {
          allKeyloggedPrompts.push(p);
        }
      }

    }

    // If Keylog only, return immediately
    if (source === "keylog") {
      return allKeyloggedPrompts
        .map((p, i) => ({ ...p, index: i }))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }

    // 5. Merge with DOM scraping
    let domPrompts: ScrapedPrompt[] = [];

    if ((source === "auto" || source === "dom") && adapter) {
      console.log("[1-prompt] Augmenting with DOM scraping...");

      // LOVABLE: Use ba96d2c original slow multi-position extraction
      if (platformName?.toLowerCase() === "lovable") {
        console.log(
          "[1-prompt] Using ba96d2c slow multi-position extraction for Lovable...",
        );
        domPrompts = await extractFromMultiplePositions(adapter);
      }
      // OTHER PLATFORMS: Use current fast DOM extraction
      else {
        console.log(`[1-prompt] Using fast DOM extraction for ${platformName}...`);
        domPrompts = await adapter.scrape();
      }

      console.log(
        `[1-prompt] DOM extraction complete: ${domPrompts.length} prompts`,
      );
    }

    // If DOM only, return immediately
    if (source === "dom") {
      return domPrompts;
    }

    // If DOM extraction failed or returned nothing, use captured prompts as primary source
    if (domPrompts.length === 0 && allKeyloggedPrompts.length > 0) {
      console.log("[1-prompt] Using captured prompts as primary source");
      return allKeyloggedPrompts
        .map((p, i) => ({ ...p, index: i }))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }

    // DOM prompts define the canonical order - they're in conversation chronological order
    // We'll use DOM as the base and enrich with captured prompt timestamps
    const capturedContentMap = new Map<string, ScrapedPrompt>();
    for (const p of allKeyloggedPrompts) {
      capturedContentMap.set(normalizeForComparison(p.content), p);
    }

    // Build final list: Start with DOM order, enrich with captured data
    let finalPrompts: ScrapedPrompt[] = [];
    const addedContent = new Set<string>();

    // First pass: Add all DOM prompts in their natural order (conversation chronological)
    for (let i = 0; i < domPrompts.length; i++) {
      const domPrompt = domPrompts[i];
      const normalizedContent = normalizeForComparison(domPrompt.content);

      // Skip if already added (handles any duplicate edge cases)
      // EXCEPTION: Allow duplication for short prompts (< 10 chars) like "ok" or "."
      if (addedContent.has(normalizedContent) && normalizedContent.length > 10) {
        continue;
      }

      // Check if we have a captured version (with timestamp)
      const capturedVersion = capturedContentMap.get(normalizedContent);

      if (capturedVersion) {
        // Use captured version (has timestamp) but keep DOM index for ordering
        finalPrompts.push({
          ...capturedVersion,
          index: finalPrompts.length,
          source: capturedVersion.source || "keylog",
        });
      } else {
        // Use DOM version with sequential index
        finalPrompts.push({
          ...domPrompt,
          index: finalPrompts.length,
          source: "dom",
        });
      }
      addedContent.add(normalizedContent);
    }

    // Second pass: Add any captured prompts not found in DOM (rare edge case)
    // These go at the end since we don't know their position
    for (const captured of allKeyloggedPrompts) {
      const normalizedContent = normalizeForComparison(captured.content);
      if (!addedContent.has(normalizedContent)) {
        console.log(
          `[1-prompt] Adding captured prompt not found in DOM: ${captured.content.slice(0, 40)}...`,
        );
        finalPrompts.push({
          ...captured,
          index: finalPrompts.length,
          source: captured.source || "keylog",
        });
        addedContent.add(normalizedContent);
      }
    }

    // 6. Final result - already in correct order from DOM traversal
    console.log(
      `[1-prompt] Extraction complete: ${finalPrompts.length} prompts (${domPrompts.length} from DOM, ${allKeyloggedPrompts.length} captured)`,
    );
    return finalPrompts;
  }

  // Merge session and DOM prompts, avoiding duplicates

  // Normalize text for comparison
  function normalizeForComparison(text: string): string {
    // Use a longer slice to avoid collisions on similar prompts
    return text.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 1000);
  }

  // Create extraction result
  function createExtractionResult(prompts: ScrapedPrompt[]): ExtractionResult {
    const conversationId = getConversationId();

    return {
      platform: platformName || "unknown",
      url: window.location.href,
      title: document.title,
      prompts,
      extractedAt: Date.now(),
      conversationId,
    };
  }

  // ============================================
  // Zone 1: Top Row Buttons
  // ============================================

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

  // Platform-specific input container selectors
  const INPUT_CONTAINER_SELECTORS: Record<string, string[]> = {
    chatgpt: [
      "#composer-background",
      '[data-testid="composer-background"]',
      "#prompt-textarea-wrapper",
      'form[class*="stretch"] > div > div',
      'form.w-full > div > div[class*="relative"]',
      "main form > div > div",
    ],
    claude: [
      'div:has(> [contenteditable="true"])',
      'div.relative:has([contenteditable="true"])',
      'fieldset:has([contenteditable="true"])',
      'form:has([contenteditable="true"])',
      '[data-testid="composer-container"]',
      ".composer-container",
    ],
    gemini: [
      "rich-textarea",
      ".input-area",
      ".input-area-container",
      'section[class*="input-area"]',
      ".text-input-field_textarea-wrapper",
    ],
    perplexity: ['[data-testid="ask-input-container"]', ".ask-input-container"],
    deepseek: [".chat-input-container", "#chat-input"],
    lovable: [
      ".prompt-input-container",
      '[data-testid="prompt-input"]',
      'div[class*="PromptBox"]',
      'div[class*="InputArea"]',
    ],
    bolt: [".chat-input", '[data-testid="chat-input"]'],
    cursor: [".input-container", '[data-testid="input"]'],
    "meta-ai": ['[data-testid="composer"]', ".composer"],
  };

  // Find the main input container
  function findInputContainer(): HTMLElement | null {
    const selectors = INPUT_CONTAINER_SELECTORS[platformName || ""] || [];

    // 1. Try platform-specific selectors first
    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && element.offsetParent !== null) {
        // CRITICAL: Never inject inside a contenteditable area or textarea
        if (
          element.getAttribute("contenteditable") === "true" ||
          element.tagName === "TEXTAREA"
        ) {
          // console.log('[1-prompt] Skipping selector match because it is a text input area:', selector);
          continue;
        }

        // Ensure it's not a hidden wrapper
        const style = window.getComputedStyle(element);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0"
        ) {
          continue;
        }

        const rect = element.getBoundingClientRect();
        if (rect.height > 450 || rect.height < 20) continue;
        // console.log('[1-prompt] Found input via platform selector:', selector);
        return element;
      }
    }

    // 2. Claude specific: find input and get parent container
    if (platformName === "claude") {
      const input = document.querySelector('[contenteditable="true"], textarea');
      if (input && (input as HTMLElement).offsetParent !== null) {
        // Method A: Look for the immediate relative wrapper (the "box")
        const container = input.closest("div.relative, fieldset, form");
        if (container && (container as HTMLElement).offsetParent !== null) {
          const rect = container.getBoundingClientRect();
          // The chat box is usually between 40px and 400px
          if (rect.height > 30 && rect.height < 450) {
            // console.log('[1-prompt] Found Claude input container via closest()');
            return container as HTMLElement;
          }
        }

        // Method B: Heuristic search for stable parent
        let parent = input.parentElement;
        let depth = 0;
        while (parent && depth < 6) {
          const rect = parent.getBoundingClientRect();
          const isEditable = parent.getAttribute("contenteditable") === "true";
          const style = window.getComputedStyle(parent);
          const isVisible =
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0";

          if (rect.height > 30 && rect.height < 400 && !isEditable && isVisible) {
            // console.log('[1-prompt] Found Claude input container via heuristic at depth', depth);
            return parent as HTMLElement;
          }
          parent = parent.parentElement;
          depth++;
        }
      }
    }

    // 3. ChatGPT specific: find the form and get the inner container
    if (platformName === "chatgpt") {
      const form = document.querySelector(
        'form[class*="stretch"], form.w-full',
      ) as HTMLElement;
      if (form) {
        const innerDiv = form.querySelector(
          'div[class*="rounded"]',
        ) as HTMLElement;
        if (innerDiv && innerDiv.offsetParent !== null) return innerDiv;
        const firstDiv = form.querySelector(":scope > div > div") as HTMLElement;
        if (firstDiv) return firstDiv;
      }
    }

    // 4. Generic fallback: find visible textarea's styled parent
    const textareas = document.querySelectorAll(
      'textarea, [contenteditable="true"]',
    );
    for (const textarea of textareas) {
      if ((textarea as HTMLElement).offsetParent !== null) {
        let parent = textarea.parentElement;
        let depth = 0;
        while (parent && depth < 6) {
          const style = window.getComputedStyle(parent);
          // Look for the rounded container or background
          const hasRadius = style.borderRadius && style.borderRadius !== "0px";
          const hasBg =
            style.backgroundColor !== "transparent" &&
            style.backgroundColor !== "rgba(0, 0, 0, 0)";

          if (hasRadius || hasBg) {
            const rect = parent.getBoundingClientRect();
            if (rect.height < 450) {
              // console.log('[1-prompt] Found container via textarea parent heuristic');
              return parent;
            }
          }
          parent = parent.parentElement;
          depth++;
        }
      }
    }

    // 5. Any form that contains a textarea
    const forms = document.querySelectorAll("form");
    for (const form of forms) {
      if (form.querySelector('textarea, [contenteditable="true"]')) {
        const rect = form.getBoundingClientRect();
        if (rect.height < 450) return form;
      }
    }

    return null;
  }

  // Inject styles
  function injectStyles() {
    if (document.getElementById("pe-styles")) return;

    const style = document.createElement("style");
    style.id = "pe-styles";
    style.textContent = BUTTON_STYLES;
    (document.head || document.documentElement).appendChild(style);
  }

  // Create Zone 1 button row
  function createZone1(): HTMLElement {
    // console.log('[1-prompt] Creating Zone 1 buttons...');
    const zone1 = document.createElement("div");
    zone1.id = "pe-zone1";
    zone1.className = "pe-zone1";

    // Extract button
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
      true,
    );
    zone1.appendChild(extractBtn);

    // Summarize button (Mode 2)
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
      true,
    );
    zone1.appendChild(summarizeBtn);

    return zone1;
  }

  function updateButtonLoading(button: HTMLButtonElement) {
    button.classList.add("loading");
    button.innerHTML = `
    <svg class="pe-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
    </svg>
    Capturing...
  `;
  }

  function updateButtonDone(button: HTMLButtonElement, originalText: string) {
    button.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:14px; height:14px; margin-right:6px; display:inline-block; vertical-align:middle;">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    Done!
  `;
    setTimeout(() => {
      button.classList.remove("loading");
      button.textContent = originalText;
    }, 2000);
  }

  // Inject Figma-style floating pill
  // Handle button click
  async function handleButtonClick(
    mode: "capture" | "compile",
    button: HTMLButtonElement,
  ) {
    console.log(`[1-prompt] Button clicked: ${mode}`);
    const isSummarize = mode === "compile";
    const originalText = isSummarize ? "Compile" : "Capture";

    // 1. Open sidepanel immediately
    try {
      await chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" });
    } catch (error: any) {
      if (error.message.includes("Extension context invalidated")) {
        console.warn("[1-prompt] Extension reloaded, refreshing page...");
        window.location.reload();
        return;
      }
      console.error("[1-prompt] Failed to open side panel:", error);
    }

    // 1.5. Notify sidepanel that extraction was triggered
    try {
      await chrome.runtime.sendMessage({ action: "EXTRACT_TRIGERED_FROM_PAGE", mode });
    } catch (error: any) {
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
        mode,
      });

      updateButtonDone(button, originalText);
    } catch (error: any) {
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
      }, 2000);
    }
  }

  // Create the two-zone layout
  function createZonedLayout() {
    if (document.getElementById("pe-zone1")) return;
    if (!adapter) return;
    console.log("[1-prompt] Attempting to create zoned layout...");

    const url = window.location.href;
    const hasConversationId =
      url.includes("/c/") ||
      url.includes("/chat/") ||
      url.includes("/thread/") ||
      url.includes("/projects/");

    const urlObj = new URL(url);
    const isRootPath =
      (urlObj.hostname.includes("chatgpt.com") ||
        urlObj.hostname.includes("openai.com")) &&
      (urlObj.pathname === "/" || urlObj.pathname === "");

    // Claude uses different URL patterns than ChatGPT
    if (platformName === "claude") {
      // Claude is at claude.ai/chat, not claude.ai alone
      if (
        window.location.hostname.includes("claude.ai") &&
        !window.location.pathname.includes("/chat")
      ) {
        return;
      }
    } else if (platformName === "chatgpt" && !hasConversationId && !isRootPath) {
      return;
    }

    const inputContainer = findInputContainer();

    injectStyles();

    if (inputContainer) {
      // Standard mode: inject into input container

      // Revert any previous style changes that might break alignment
      inputContainer.style.display = "";
      inputContainer.style.flexDirection = "";
      inputContainer.style.alignItems = "";
      inputContainer.style.gap = "";

      // Use absolute positioning for Zone 1
      inputContainer.classList.add("pe-has-zone1-absolute");

      // Create Zone 1
      const zone1 = createZone1();

      // Prepend inside the container
      inputContainer.prepend(zone1);

      // Only remove floating buttons if we successfully added zone1
      if (document.getElementById("pe-zone1")) {
        const floating = document.getElementById("pe-floating-zone");
        if (floating) floating.remove();

        // If we are on Claude, watch the container to re-inject if buttons are removed
        if (platformName === "claude") {
          const stickyObserver = new MutationObserver(() => {
            // 1. Re-inject buttons if removed
            if (!document.getElementById("pe-zone1")) {
              console.log("[1-prompt] Claude removed buttons, re-injecting...");
              inputContainer.prepend(createZone1());
            }

            // 2. Re-apply layout class if removed (prevents overlapping)
            if (!inputContainer.classList.contains("pe-has-zone1-absolute")) {
              console.log("[1-prompt] Claude removed layout class, re-applying...");
              inputContainer.classList.add("pe-has-zone1-absolute");
              // Force the style just in case class isn't enough
              inputContainer.style.paddingTop = "48px";
            }
          });

          try {
            if (inputContainer && inputContainer instanceof Node) {
              stickyObserver.observe(inputContainer, {
                childList: true,
                attributes: true,
                attributeFilter: ["class", "style"],
              });
            }
          } catch (e) {
            // ignore
          }
        }
      }

      console.log("[1-prompt] Zoned layout initialized (Input Container Mode)");
    }
  }

  // Show paste button
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

  // Hide paste button
  function hidePasteButton() {
    const pasteBtn = document.getElementById("pe-paste-btn");
    if (pasteBtn) pasteBtn.remove();
  }

  // Handle paste action
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
      target.value =
        currentVal.substring(0, start) + textToPaste + currentVal.substring(end);
      target.selectionStart = target.selectionEnd = start + textToPaste.length;

      // Trigger input events so the site's JS sees the changes
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      // Content editable
      try {
        // Modern way for contenteditables
        document.execCommand("insertText", false, textToPaste);
      } catch (e) {
        console.error(
          "[1-prompt] Standard insertText failed, trying direct innerText update",
          e,
        );
        // Fallback
        target.innerText = textToPaste;
        target.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }

    console.log("[1-prompt] Successfully pasted content");
    copiedContent = null;
    hidePasteButton();
  }

  // Remove Zone 1
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

  // Initialize with retry - optimized to avoid polling
  let scheduleCheckGlobal: () => void = () => { };

  function initZonedLayout() {
    if (!adapter || !platformName) {
      // console.log("[1-prompt] Skipping Zoned layout: no adapter");
      return;
    }
    let attempts = 0;
    const maxAttempts = 10;

    const tryCreate = () => {
      if (document.getElementById("pe-zone1")) return;
      if (!adapter) return; // double check

      createZonedLayout();

      if (!document.getElementById("pe-zone1") && attempts < maxAttempts) {
        attempts++;
        setTimeout(tryCreate, 500);
      }
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", tryCreate);
    } else {
      tryCreate(); // No need for timeout here if we already checked adapter
    }

    // Watch for input container appearing (instead of polling every 1.5s)
    // This uses a single MutationObserver that's much lighter than setInterval
    let lastUrl = location.href;
    let checkScheduled = false;

    let lastHasPrompts = false;

    const scheduleCheck = () => {
      if (checkScheduled) return;
      checkScheduled = true;

      // Use requestIdleCallback for non-urgent checks (or setTimeout fallback)
      const scheduleIdleCheck =
        window.requestIdleCallback || ((cb) => setTimeout(cb, 100));
      scheduleIdleCheck(
        () => {
          checkScheduled = false;

          // Check if URL changed
          if (location.href !== lastUrl) {
            lastUrl = location.href;
            console.log("[1-prompt] URL change detected");
          }

          const url = window.location.href;
          const hasConversationId =
            url.includes("/c/") ||
            url.includes("/chat/") ||
            url.includes("/thread/");
          const urlObj = new URL(url);
          const isRootPath =
            (urlObj.hostname.includes("chatgpt.com") ||
              urlObj.hostname.includes("openai.com")) &&
            (urlObj.pathname === "/" || urlObj.pathname === "");

          const isOnSupportedPlatform =
            !!platformName && platformName !== "generic";

          // Show buttons more greedily for the pill
          let shouldShow = isOnSupportedPlatform;

          // But keep Zone 1 (input-top buttons) restricted to active chats
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
              "pe-figma-pill-container",
            );

            // Always ensure pill is gone
            if (hasFigmaPill) {
              document.getElementById("pe-figma-pill-container")?.remove();
            }

            // Try to create Zone 1 if in an active chat
            if (!hasZone1 && shouldShowZone1 && adapter) {
              createZonedLayout();
            }
          } else {
            if (
              document.getElementById("pe-zone1") ||
              document.getElementById("pe-figma-pill-container")
            ) {
              console.log(
                "[1-prompt] Removing buttons: No longer on supported platform",
              );
              removeZonedLayout();
              document.getElementById("pe-figma-pill-container")?.remove();
            }
          }

          // Check if prompt presence has changed and notify sidepanel
          const currentHasPrompts = adapter
            ? adapter.scrapePrompts().length > 0
            : false;
          if (currentHasPrompts !== lastHasPrompts) {
            lastHasPrompts = currentHasPrompts;
            chrome.runtime.sendMessage({
              action: "STATUS_RESULT",
              supported: !!adapter,
              platform: platformName,
              hasPrompts: currentHasPrompts,
            });
          }
        },
        { timeout: 2000 },
      );
    };

    // Initial check setup
    scheduleCheckGlobal = scheduleCheck;

    // Observe the document element (more stable than body for SPA navigation)
    const layoutObserver = new MutationObserver((mutations) => {
      const hasRelevantChange = mutations.some(
        (m) => m.type === "childList" && m.addedNodes.length > 0,
      );
      if (hasRelevantChange) {
        scheduleCheck();
      }
    });

    try {
      if (document.documentElement && document.documentElement instanceof Node) {
        layoutObserver.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
      }
    } catch (e) {
      // skip
    }

    // Initial check
    scheduleCheck();
  }

  // ============================================
  // Message Handlers
  // ============================================

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("[1-prompt] Received message:", message.action);

    switch (message.action) {
      case "URL_CHANGED": {
        // Handle SPA navigation without re-injection
        console.log("[1-prompt] URL changed, resetting session");
        updateAdapter(); // Re-detect platform/adapter
        sessionPrompts = [];
        loadSessionPrompts();

        // Re-check if we need to show/hide buttons
        const zone1 = document.getElementById("pe-zone1");
        if (zone1) {
          removeZonedLayout();
        }
        // Re-check EVERYTHING (pill + zone1)
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
            "[1-prompt] Extraction already in progress, ignoring request",
          );
          sendResponse({
            success: false,
            error: "Extraction already in progress. Please wait.",
          });
          return true;
        }

        const mode = message.mode;
        const extractionSource = message.extractionSource || "auto";
        isExtracting = true;

        const extractBtn = document.getElementById(
          "pe-extract-btn",
        ) as HTMLButtonElement;
        const originalText = extractBtn
          ? extractBtn.textContent || "Capture"
          : "Capture";
        if (extractBtn) updateButtonLoading(extractBtn);

        extractPrompts(extractionSource)
          .then((prompts) => {
            const result = createExtractionResult(prompts);

            chrome.runtime.sendMessage({
              action: "EXTRACTION_RESULT",
              result,
              mode,
            });

            if (extractBtn) updateButtonDone(extractBtn, originalText);
            sendResponse({ success: true, promptCount: prompts.length });
          })
          .catch((err) => {
            console.error("[1-prompt] Extraction failed:", err);
            if (extractBtn) {
              extractBtn.textContent = "Error";
              setTimeout(() => {
                extractBtn.classList.remove("loading");
                extractBtn.textContent = originalText;
              }, 2000);
            }
            sendResponse({ success: false, error: err.message });
          })
          .finally(() => {
            isExtracting = false;
          });

        // Safety timeout to reset the extraction lock after 45 seconds
        setTimeout(() => {
          if (isExtracting) {
            console.warn("[1-prompt] Extraction lock safety timeout reached");
            isExtracting = false;
          }
        }, 45000);

        return true; // Keep channel open for async response
      }

      case "GET_STATUS": {
        sendResponse({
          action: "STATUS_RESULT",
          supported: !!adapter,
          platform: platformName,
          hasPrompts: adapter ? adapter.scrapePrompts().length > 0 : false,
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
        // User copied content from side panel
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

  // ============================================
  // Initialize
  // ============================================

  broadcastStatus();

  initZonedLayout();
  initRealTimeCapture();
