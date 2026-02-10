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
    defaultProvider: "auto",
    model: ""
  }
};
class ConfigService {
  config = BUNDLED_CONFIG;
  loaded = false;
  async load() {
    if (this.loaded) return this.config;
    try {
      const response = await fetch(`${BUNDLED_CONFIG.backend.url}/config/runtime`);
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
      console.error(`[CircuitBreaker] Circuit OPEN after ${this.failures} failures`);
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
async function retryWithBackoff(fn, config2 = DEFAULT_RETRY_CONFIG, attempt = 1) {
  try {
    return await fn();
  } catch (error) {
    if (error.status === 429 || error.status === 401 || error.status === 403) {
      throw error;
    }
    if (attempt >= config2.maxRetries) {
      console.error(`[Retry] All ${config2.maxRetries} attempts failed`);
      throw error;
    }
    const delay = Math.min(
      config2.initialDelay * Math.pow(config2.backoffMultiplier, attempt - 1),
      config2.maxDelay
    );
    console.warn(`[Retry] Attempt ${attempt}/${config2.maxRetries} - waiting ${delay}ms`);
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
    console.log(`[resilientFetch] Circuit breaker healthy, proceeding with request`);
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
const USER_ID_KEY = "prompt_extractor_user_id";
async function getHeaders() {
  const headers = {
    "Content-Type": "application/json"
  };
  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}
async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (chrome.runtime.lastError || !token) {
        resolve(null);
        return;
      }
      resolve(token);
    });
  });
}
async function setCurrentUser(userId) {
  if (userId) {
    await chrome.storage.session.set({ [USER_ID_KEY]: userId });
    await chrome.storage.local.set({ [USER_ID_KEY]: userId });
  } else {
    await chrome.storage.session.remove([USER_ID_KEY]);
    await chrome.storage.local.remove([USER_ID_KEY]);
  }
  console.log("[Backend] User set:", userId ? "logged in" : "logged out");
}
async function signOutFromBackend() {
  await chrome.storage.session.remove([USER_ID_KEY]);
  await chrome.storage.local.remove([USER_ID_KEY]);
  console.log("[Backend] Signed out");
}
async function getCurrentUserId() {
  const sessionResult = await chrome.storage.session.get([USER_ID_KEY]);
  if (sessionResult[USER_ID_KEY]) return sessionResult[USER_ID_KEY];
  const localResult = await chrome.storage.local.get([USER_ID_KEY]);
  return localResult[USER_ID_KEY] || null;
}
async function saveHistoryToCloud(_userId, item) {
  try {
    const response = await resilientFetch(`${config.backend.url}/history`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ item })
    });
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    console.log("[Backend] Saved history:", item.id);
  } catch (error) {
    console.error("[Backend] Save history error:", error);
  }
}
async function getHistoryFromCloud(userId) {
  try {
    const response = await resilientFetch(`${config.backend.url}/history?userId=${userId}`, {
      method: "GET",
      headers: await getHeaders()
    });
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Backend error: ${response.status}`);
    }
    const data = await response.json();
    return data.history || [];
  } catch (error) {
    console.error("[Backend] Get history error:", error);
    throw error;
  }
}
async function saveUserProfile(user) {
  try {
    const response = await resilientFetch(`${config.backend.url}/user/profile`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(user)
    });
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    console.log("[Backend] Saved user profile");
  } catch (error) {
    console.warn("[Backend] Save profile failed (non-critical):", error);
  }
}
const DEFAULT_QUOTAS = { guest: 3, free: 10, go: 25, pro: 100, infi: 999 };
async function getQuotas() {
  try {
    const response = await resilientFetch(`${config.backend.url}/config/quotas`, {
      method: "GET",
      headers: await getHeaders()
    });
    if (!response.ok) return DEFAULT_QUOTAS;
    const data = await response.json();
    return data.quotas || DEFAULT_QUOTAS;
  } catch (error) {
    console.error("[Backend] Get quotas error:", error);
    return DEFAULT_QUOTAS;
  }
}
function mergeHistory(local, cloud) {
  if (!cloud || !Array.isArray(cloud)) return local;
  const cloudIds = new Set(cloud.map((item) => item.id));
  const merged = [...cloud];
  for (const localItem of local) {
    if (!cloudIds.has(localItem.id)) {
      merged.push(localItem);
    }
  }
  merged.sort((a, b) => b.timestamp - a.timestamp);
  return merged;
}
export {
  getAuthToken as a,
  setCurrentUser as b,
  config as c,
  signOutFromBackend as d,
  saveUserProfile as e,
  getQuotas as f,
  getHistoryFromCloud as g,
  getCurrentUserId as h,
  index as i,
  mergeHistory as m,
  resilientFetch as r,
  saveHistoryToCloud as s
};
