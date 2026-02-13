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
const scriptRel = /* @__PURE__ */ (function detectScriptRel() {
  const relList = typeof document !== "undefined" && document.createElement("link").relList;
  return relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
})();
const assetsURL = function(dep, importerUrl) {
  return new URL(dep, importerUrl).href;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    let allSettled = function(promises$2) {
      return Promise.all(promises$2.map((p) => Promise.resolve(p).then((value$1) => ({
        status: "fulfilled",
        value: value$1
      }), (reason) => ({
        status: "rejected",
        reason
      }))));
    };
    const links = document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = allSettled(deps.map((dep) => {
      dep = assetsURL(dep, importerUrl);
      if (dep in seen) return;
      seen[dep] = true;
      const isCss = dep.endsWith(".css");
      const cssSelector = isCss ? '[rel="stylesheet"]' : "";
      if (!!importerUrl) for (let i$1 = links.length - 1; i$1 >= 0; i$1--) {
        const link$1 = links[i$1];
        if (link$1.href === dep && (!isCss || link$1.rel === "stylesheet")) return;
      }
      else if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) return;
      const link = document.createElement("link");
      link.rel = isCss ? "stylesheet" : scriptRel;
      if (!isCss) link.as = "script";
      link.crossOrigin = "";
      link.href = dep;
      if (cspNonce) link.setAttribute("nonce", cspNonce);
      document.head.appendChild(link);
      if (isCss) return new Promise((res, rej) => {
        link.addEventListener("load", res);
        link.addEventListener("error", () => rej(/* @__PURE__ */ new Error(`Unable to preload CSS for ${dep}`)));
      });
    }));
  }
  function handlePreloadError(err$2) {
    const e$1 = new Event("vite:preloadError", { cancelable: true });
    e$1.payload = err$2;
    window.dispatchEvent(e$1);
    if (!e$1.defaultPrevented) throw err$2;
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};
const __vite_import_meta_env__ = { "BASE_URL": "./", "DEV": false, "MODE": "production", "PROD": true, "SSR": false, "VITE_BACKEND_URL": "https://1prompt-backend.amaravadhibharath.workers.dev", "VITE_FIREBASE_API_KEY": "AIzaSyBdvLRC1Op841AfaSAUp51-TOy6z8qASTY", "VITE_FIREBASE_APP_ID": "1:523127017746:web:c58418b3ad5009509823cb", "VITE_FIREBASE_AUTH_DOMAIN": "tiger-superextension-09.firebaseapp.com", "VITE_FIREBASE_MESSAGING_SENDER_ID": "523127017746", "VITE_FIREBASE_PROJECT_ID": "tiger-superextension-09", "VITE_FIREBASE_STORAGE_BUCKET": "tiger-superextension-09.firebasestorage.app", "VITE_GOOGLE_CLIENT_ID": "523127017746-5orr4rqocrdt9450cvh774j1c8uca9qh.apps.googleusercontent.com", "VITE_POSTHOG_HOST": "https://us.i.posthog.com", "VITE_POSTHOG_KEY": "" };
let _firebaseApp = null;
let _firebaseAuth = null;
async function initFirebaseIfNeeded() {
  if (_firebaseApp && _firebaseAuth) return;
  try {
    const firebaseAppModule = await __vitePreload(() => import("./vendor.js").then((n) => n.i), true ? [] : void 0, import.meta.url);
    const firebaseAuthModule = await __vitePreload(() => import("./vendor.js").then((n) => n.b), true ? [] : void 0, import.meta.url);
    const env = __vite_import_meta_env__ || {};
    const firebaseConfig = {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID
    };
    if (!firebaseAppModule.getApps || !firebaseAppModule.getApps().length) {
      _firebaseApp = firebaseAppModule.initializeApp ? firebaseAppModule.initializeApp(firebaseConfig) : null;
    }
    _firebaseAuth = firebaseAuthModule.getAuth ? firebaseAuthModule.getAuth() : null;
  } catch (e) {
    console.warn("[Firebase] Initialization failed or not configured", e);
  }
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
async function signInWithGoogleWeb() {
  await initFirebaseIfNeeded();
  if (!_firebaseAuth) {
    throw new Error("Firebase not configured");
  }
  const { GoogleAuthProvider, signInWithPopup } = await __vitePreload(async () => {
    const { GoogleAuthProvider: GoogleAuthProvider2, signInWithPopup: signInWithPopup2 } = await import("./vendor.js").then((n) => n.b);
    return { GoogleAuthProvider: GoogleAuthProvider2, signInWithPopup: signInWithPopup2 };
  }, true ? [] : void 0, import.meta.url);
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(_firebaseAuth, provider);
  const firebaseUser = result.user;
  const idToken = await firebaseUser.getIdToken();
  try {
    localStorage.setItem("firebase_id_token", idToken);
    const profile = {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName,
      picture: firebaseUser.photoURL
    };
    localStorage.setItem("oneprompt_user", JSON.stringify(profile));
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: "oneprompt_user", newValue: JSON.stringify(profile) }));
    } catch (e) {
    }
    try {
      await fetch(`${config.backend.url}/user/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(profile)
      });
    } catch (e) {
      console.warn("[Firebase] Failed to post profile to backend", e);
    }
    return { idToken, user: profile };
  } catch (e) {
    console.error("[Firebase] Web sign-in storage failed", e);
    return { idToken, user: null };
  }
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
    const response = await resilientFetch(
      `${config.backend.url}/history?userId=${userId}`,
      {
        method: "GET",
        headers: await getHeaders()
      }
    );
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
const DEFAULT_QUOTAS = {
  guest: 3,
  free: 10,
  go: 25,
  pro: 100,
  infi: 999
};
async function getQuotas() {
  try {
    const response = await resilientFetch(
      `${config.backend.url}/config/quotas`,
      {
        method: "GET",
        headers: await getHeaders()
      }
    );
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
const firebase = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getAuthToken,
  getHistoryFromCloud,
  getQuotas,
  mergeHistory,
  saveHistoryToCloud,
  setCurrentUser,
  signInWithGoogleWeb,
  signOutFromBackend
}, Symbol.toStringTag, { value: "Module" }));
export {
  __vitePreload as _,
  getAuthToken as a,
  signInWithGoogleWeb as b,
  config as c,
  signOutFromBackend as d,
  setCurrentUser as e,
  getQuotas as f,
  getHistoryFromCloud as g,
  firebase as h,
  index as i,
  mergeHistory as m,
  resilientFetch as r,
  saveHistoryToCloud as s
};
