/**
 * Network Interception Module for 1-prompt
 *
 * Intercepts fetch/XHR requests to AI platforms to capture prompts
 * with 100% accuracy - no DOM dependency, no timing issues.
 *
 * This is injected into the page context (not content script)
 * to access the actual network layer.
 */

// Platform API endpoint patterns
const API_PATTERNS: Record<string, RegExp[]> = {
  chatgpt: [
    /api\.openai\.com\/v1\/chat\/completions/,
    /chatgpt\.com\/backend-api\/conversation/,
    /chat\.openai\.com\/backend-api\/conversation/,
  ],
  claude: [
    /claude\.ai\/api\/.*\/chat/,
    /claude\.ai\/api\/organizations\/.*\/chat_conversations/,
    /api\.anthropic\.com\/v1\/messages/,
  ],
  gemini: [
    /gemini\.google\.com\/.*\/generate/,
    /generativelanguage\.googleapis\.com/,
  ],
  perplexity: [/api\.perplexity\.ai\/chat/, /perplexity\.ai\/api\/query/],
  deepseek: [/chat\.deepseek\.com\/api\/chat/, /api\.deepseek\.com\/v1\/chat/],
  lovable: [/lovable\.dev\/api\/chat/, /api\.lovable\.dev\/.*\/messages/],
  bolt: [/bolt\.new\/api\/chat/, /api\.bolt\.new\/.*\/messages/],
  cursor: [/cursor\.sh\/api\/chat/, /api\.cursor\.com\/.*\/messages/],
  "meta-ai": [/meta\.ai\/api\/chat/, /graph\.meta\.com\/.*\/messages/],
};

// Platform-specific payload extractors
interface PayloadExtractor {
  (body: any): string | null;
}

const PAYLOAD_EXTRACTORS: Record<string, PayloadExtractor> = {
  chatgpt: (body) => {
    // ChatGPT format: { messages: [{ role: 'user', content: '...' }] }
    if (body?.messages) {
      const userMessages = body.messages.filter((m: any) => m.role === "user");
      const lastUser = userMessages[userMessages.length - 1];
      return lastUser?.content || null;
    }
    // Alternative format
    if (body?.prompt) return body.prompt;
    if (body?.action === "next" && body?.messages) {
      const msg = body.messages[0];
      if (msg?.content?.parts) return msg.content.parts.join("\n");
    }
    return null;
  },

  claude: (body) => {
    // Claude format: { prompt: '...' } or { messages: [...] }
    if (body?.prompt) return body.prompt;
    if (body?.messages) {
      const userMessages = body.messages.filter(
        (m: any) => m.role === "user" || m.role === "human",
      );
      const lastUser = userMessages[userMessages.length - 1];
      return lastUser?.content || null;
    }
    return null;
  },

  gemini: (body) => {
    // Gemini format: { contents: [{ parts: [{ text: '...' }] }] }
    if (body?.contents) {
      const lastContent = body.contents[body.contents.length - 1];
      if (lastContent?.parts) {
        return lastContent.parts.map((p: any) => p.text).join("\n");
      }
    }
    if (body?.prompt) return body.prompt;
    return null;
  },

  perplexity: (body) => {
    if (body?.query) return body.query;
    if (body?.messages) {
      const userMessages = body.messages.filter((m: any) => m.role === "user");
      const lastUser = userMessages[userMessages.length - 1];
      return lastUser?.content || null;
    }
    return null;
  },

  deepseek: (body) => {
    if (body?.messages) {
      const userMessages = body.messages.filter((m: any) => m.role === "user");
      const lastUser = userMessages[userMessages.length - 1];
      return lastUser?.content || null;
    }
    return null;
  },

  lovable: (body) => {
    if (body?.message) return body.message;
    if (body?.prompt) return body.prompt;
    if (body?.content) return body.content;
    return null;
  },

  bolt: (body) => {
    if (body?.message) return body.message;
    if (body?.prompt) return body.prompt;
    return null;
  },

  cursor: (body) => {
    if (body?.message) return body.message;
    if (body?.prompt) return body.prompt;
    return null;
  },

  "meta-ai": (body) => {
    if (body?.message) return body.message;
    if (body?.prompt) return body.prompt;
    return null;
  },
};

// The injection script that runs in page context
export function getNetworkInterceptorScript(): string {
  return `
(function() {
  if (window.__onepromptNetworkInterceptor) return;
  window.__onepromptNetworkInterceptor = true;

  const API_PATTERNS = ${JSON.stringify(API_PATTERNS, (_key, value) => {
    if (value instanceof RegExp) return value.source;
    return value;
  })};

  // Convert string patterns back to RegExp
  for (const platform of Object.keys(API_PATTERNS)) {
    API_PATTERNS[platform] = API_PATTERNS[platform].map(p => new RegExp(p));
  }

  const PAYLOAD_EXTRACTORS = {
    chatgpt: ${PAYLOAD_EXTRACTORS.chatgpt.toString()},
    claude: ${PAYLOAD_EXTRACTORS.claude.toString()},
    gemini: ${PAYLOAD_EXTRACTORS.gemini.toString()},
    perplexity: ${PAYLOAD_EXTRACTORS.perplexity.toString()},
    deepseek: ${PAYLOAD_EXTRACTORS.deepseek.toString()},
    lovable: ${PAYLOAD_EXTRACTORS.lovable.toString()},
    bolt: ${PAYLOAD_EXTRACTORS.bolt.toString()},
    cursor: ${PAYLOAD_EXTRACTORS.cursor.toString()},
    'meta-ai': ${PAYLOAD_EXTRACTORS["meta-ai"].toString()},
  };

  function detectPlatform(url) {
    for (const [platform, patterns] of Object.entries(API_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(url))) {
        return platform;
      }
    }
    return null;
  }

  function extractPrompt(platform, body) {
    const extractor = PAYLOAD_EXTRACTORS[platform];
    if (!extractor) return null;
    try {
      return extractor(body);
    } catch (e) {
      console.error('[1-prompt Network] Extract error:', e);
      return null;
    }
  }

  function sendToContentScript(prompt, platform, url) {
    window.postMessage({
      type: 'ONEPROMPT_NETWORK_CAPTURE',
      prompt: prompt,
      platform: platform,
      url: url,
      timestamp: Date.now(),
    }, '*');
    console.log('[1-prompt Network] Captured prompt:', prompt.substring(0, 50) + '...');
  }

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    
    if (init?.method?.toUpperCase() === 'POST') {
      const platform = detectPlatform(url);
      
      if (platform && init.body) {
        try {
          let body;
          if (typeof init.body === 'string') {
            body = JSON.parse(init.body);
          } else if (init.body instanceof FormData) {
            body = Object.fromEntries(init.body.entries());
          }
          
          if (body) {
            const prompt = extractPrompt(platform, body);
            if (prompt && prompt.trim().length > 0) {
              sendToContentScript(prompt, platform, url);
            }
          }
        } catch (e) {
          // Silently fail - don't break the actual request
        }
      }
    }
    
    return originalFetch.apply(this, arguments);
  };

  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._onepromptMethod = method;
    this._onepromptUrl = url;
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (this._onepromptMethod?.toUpperCase() === 'POST' && this._onepromptUrl) {
      const platform = detectPlatform(this._onepromptUrl);
      
      if (platform && body) {
        try {
          let parsedBody;
          if (typeof body === 'string') {
            parsedBody = JSON.parse(body);
          }
          
          if (parsedBody) {
            const prompt = extractPrompt(platform, parsedBody);
            if (prompt && prompt.trim().length > 0) {
              sendToContentScript(prompt, platform, this._onepromptUrl);
            }
          }
        } catch (e) {
          // Silently fail
        }
      }
    }
    
    return originalXHRSend.apply(this, arguments);
  };

  console.log('[1-prompt Network] Interceptor installed');
})();
`;
}

// Initialize network capture listener in content script
export function initNetworkCaptureListener(
  onCapture: (prompt: string, platform: string) => void,
) {
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.type !== "ONEPROMPT_NETWORK_CAPTURE") return;

    const { prompt, platform } = event.data;
    if (prompt && platform) {
      console.log(
        `[1-prompt] Network captured prompt from ${platform}:`,
        prompt.substring(0, 50) + "...",
      );
      onCapture(prompt, platform);
    }
  });
}

// Inject the interceptor script into the page
export function injectNetworkInterceptor() {
  const script = document.createElement("script");
  script.textContent = getNetworkInterceptorScript();
  (document.head || document.documentElement).appendChild(script);
  script.remove(); // Clean up - script already executed
  console.log("[1-prompt] Network interceptor injected");
}
