import { a as getAuthToken, c as config } from "./firebase.js";
const PRICING_TIERS = {
  guest: {
    // Basic
    tier: "guest",
    maxCaptures: -1,
    // Unlimited
    maxCompiles: -1,
    // Unlimited
    hasHistory: false,
    canEdit: true,
    hasGenerateMode2: false,
    requiresAuth: false,
    deviceLocked: true,
    canPin: false
  },
  free: {
    tier: "free",
    maxCaptures: -1,
    maxCompiles: -1,
    // Unlimited
    hasHistory: true,
    canEdit: true,
    hasGenerateMode2: false,
    requiresAuth: true,
    deviceLocked: false,
    canPin: true
  },
  go: {
    tier: "go",
    maxCaptures: -1,
    maxCompiles: -1,
    // Unlimited
    hasHistory: true,
    canEdit: true,
    hasGenerateMode2: false,
    requiresAuth: true,
    deviceLocked: false,
    canPin: true
  },
  pro: {
    tier: "pro",
    maxCaptures: -1,
    maxCompiles: -1,
    hasHistory: true,
    canEdit: true,
    hasGenerateMode2: true,
    requiresAuth: true,
    deviceLocked: false,
    canPin: true
  },
  infi: {
    tier: "infi",
    maxCaptures: -1,
    maxCompiles: -1,
    hasHistory: true,
    canEdit: true,
    hasGenerateMode2: true,
    requiresAuth: true,
    deviceLocked: false,
    canPin: true
  },
  admin: {
    tier: "admin",
    maxCaptures: -1,
    maxCompiles: -1,
    hasHistory: true,
    canEdit: true,
    hasGenerateMode2: true,
    requiresAuth: true,
    deviceLocked: false,
    canPin: true
  }
};
const PRO_PRICING = {
  regularPrice: 9,
  offerPrice: 5,
  currency: "USD",
  billingPeriod: "month"
};
async function getUserTier() {
  try {
    const userData = await chrome.storage.local.get(["promptExtractor_user"]);
    const user = userData.promptExtractor_user;
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
async function invalidateTierCache() {
  await chrome.storage.local.remove(["tierCache"]);
}
function getDeviceId() {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
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
async function canUserCapture() {
  const tier = await getUserTier();
  const limit = PRICING_TIERS[tier].maxCaptures;
  if (limit === -1) return { allowed: true };
  const usage = await getDailyUsage();
  const remaining = limit - usage.captures;
  if (remaining <= 0) {
    return { allowed: false, reason: "Daily capture limit reached. Sign in for unlimited captures!" };
  }
  return { allowed: true, remaining };
}
async function canUserCompile() {
  const tier = await getUserTier();
  const limit = PRICING_TIERS[tier].maxCompiles;
  if (limit === -1) return { allowed: true };
  if (limit === 0) return { allowed: false, reason: "Compiling is available on Go and Pro plans. Sign in to try!" };
  const usage = await getDailyUsage();
  const remaining = limit - usage.compiles;
  if (remaining <= 0) {
    return { allowed: false, reason: "Daily compile limit reached. Upgrade to Pro for unlimited compiles!" };
  }
  return { allowed: true, remaining };
}
async function incrementCapture() {
  const usage = await getDailyUsage();
  usage.captures += 1;
  await chrome.storage.local.set({ [USAGE_KEY]: usage });
}
async function incrementCompile() {
  const usage = await getDailyUsage();
  usage.compiles += 1;
  await chrome.storage.local.set({ [USAGE_KEY]: usage });
}
function getTierFeatures(tier) {
  const config2 = PRICING_TIERS[tier];
  let displayName = "Pro";
  if (tier === "guest") displayName = "Basic";
  else if (tier === "free" || tier === "go") displayName = "Go";
  return {
    ...config2,
    displayName,
    captureText: config2.maxCaptures === -1 ? "Unlimited Captures" : `${config2.maxCaptures}/day Captures`,
    compileText: config2.maxCompiles === -1 ? "Unlimited Compiles" : config2.maxCompiles === 0 ? "No Compiles" : `${config2.maxCompiles}/day Compiles`
  };
}
export {
  PRICING_TIERS,
  PRO_PRICING,
  canUserCapture,
  canUserCompile,
  getDeviceId,
  getTierFeatures,
  getUserTier,
  incrementCapture,
  incrementCompile,
  invalidateTierCache
};
