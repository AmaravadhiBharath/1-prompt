import { a as getAuthToken, c as config } from "./firebase.js";
const PRICING_TIERS = {
  guest: {
    // Basic
    tier: "guest",
    maxCaptures: -1,
    maxCompiles: 10,
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
    maxCompiles: 10,
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
    // Unlimited compiles (switches to Llama after 10)
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
async function canUserCapture() {
  const tier = await getUserTier();
  const limit = PRICING_TIERS[tier].maxCaptures;
  if (limit === -1) return { allowed: true };
  const usage = await getDailyUsage();
  const remaining = limit - usage.captures;
  if (remaining <= 0) {
    return {
      allowed: false,
      reason: tier === "guest" ? "Daily capture limit reached. Sign in to unlock Go tier with more captures!" : "Daily capture limit reached. Join the Pro waitlist for unlimited access!"
    };
  }
  return { allowed: true, remaining };
}
async function canUserCompile() {
  const tier = await getUserTier();
  const usage = await getDailyUsage();
  if (tier === "guest") {
    const limit = 10;
    const remaining = limit - usage.compiles;
    if (remaining <= 0) {
      return {
        allowed: false,
        reason: "Daily compile limit reached. Sign in to unlock Go tier with unlimited compiles!"
      };
    }
    return { allowed: true, remaining };
  }
  return { allowed: true };
}
async function incrementCapture() {
  const usage = await getDailyUsage();
  usage.captures += 1;
  await chrome.storage.local.set({ [USAGE_KEY]: usage });
  await reportUsageToBackend("capture", usage.date);
}
async function incrementCompile() {
  const usage = await getDailyUsage();
  usage.compiles += 1;
  await chrome.storage.local.set({ [USAGE_KEY]: usage });
  await reportUsageToBackend("compile", usage.date);
}
async function reportUsageToBackend(mode, date) {
  try {
    const userData = await chrome.storage.local.get(["oneprompt_user"]);
    const user = userData.oneprompt_user;
    if (!user) return;
    const token = await getAuthToken();
    if (!token) return;
    await fetch(`${config.backend.url}/user/usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ mode, date })
    });
  } catch (err) {
    console.error("[Pricing] Failed to report usage:", err);
  }
}
export {
  PRICING_TIERS as P,
  incrementCapture as a,
  canUserCapture as b,
  canUserCompile as c,
  getUserTier as g,
  incrementCompile as i
};
