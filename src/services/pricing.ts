/**
 * Pricing Tiers Configuration
 * Basic (Guest): Unlimited captures, 10 compiles/day (simulated), no history, login optional.
 * Go: Free, Unlimited captures, Unlimited compiles, history, sync, pin.
 * Pro: $9/mo, Unlimited all, advanced models, support.
 */

import { config } from "../config";
import { getAuthToken } from "./firebase";

export type UserTier = "guest" | "free" | "go" | "pro" | "infi" | "admin";

export interface PricingConfig {
  tier: UserTier;
  maxCaptures: number; // Daily limit (-1 for unlimited)
  maxCompiles: number; // Daily limit (-1 for unlimited)
  hasHistory: boolean;
  canEdit: boolean;
  hasGenerateMode2: boolean;
  requiresAuth: boolean;
  deviceLocked: boolean;
  canPin: boolean;
}

export const PRICING_TIERS: Record<UserTier, PricingConfig> = {
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
    canPin: false,
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
    canPin: true,
  },
  go: {
    tier: "go",
    maxCaptures: -1,
    maxCompiles: -1, // Unlimited compiles (switches to Llama after 10)
    hasHistory: true,
    canEdit: true,
    hasGenerateMode2: false,
    requiresAuth: true,
    deviceLocked: false,
    canPin: true,
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
    canPin: true,
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
    canPin: true,
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
    canPin: true,
  },
};

export const PRO_PRICING = {
  regularPrice: 9,
  offerPrice: 5,
  currency: "USD",
  billingPeriod: "month",
};

/**
 * Get user's current tier (SERVER-VERIFIED)
 */
export async function getUserTier(): Promise<UserTier> {
  try {
    const userData = await chrome.storage.local.get(["oneprompt_user"]);
    const user = userData.oneprompt_user;

    if (!user) {
      return "guest";
    }

    // Check cache (5 mins)
    const cacheKey = "tierCache";
    const cache = await chrome.storage.local.get([cacheKey]);
    const cached = cache[cacheKey] as
      | { tier: UserTier; timestamp: number; userId: string }
      | undefined;

    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000;

    if (
      cached &&
      cached.userId === user.id &&
      now - cached.timestamp < CACHE_DURATION
    ) {
      return cached.tier;
    }

    // Fetch from backend
    const token = await getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${config.backend.url}/user/tier`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: user.id,
        email: user.email,
      }),
    });

    if (!response.ok) throw new Error("Tier check failed");

    const data = await response.json();
    const tier = data.tier as UserTier;

    await chrome.storage.local.set({
      [cacheKey]: { tier, timestamp: now, userId: user.id },
      userTier: tier,
    });

    return tier;
  } catch (error) {
    console.error("[Pricing] Tier check error:", error);
    const fallback = await chrome.storage.local.get(["userTier"]);
    return (fallback.userTier as UserTier) || "guest";
  }
}

/**
 * Invalidate tier cache
 */
export async function invalidateTierCache(): Promise<void> {
  await chrome.storage.local.remove(["tierCache"]);
}

/**
 * Get device ID for guest user locking
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

interface DailyUsage {
  date: string;
  captures: number;
  compiles: number;
}

const USAGE_KEY = "daily_usage_stats";

export async function getDailyUsage(): Promise<DailyUsage> {
  return new Promise((resolve) => {
    chrome.storage.local.get([USAGE_KEY], (data) => {
      const today = new Date().toLocaleDateString("en-CA");
      const stats = data[USAGE_KEY] as DailyUsage | undefined;

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

export async function canUserCapture(): Promise<{
  allowed: boolean;
  remaining?: number;
  reason?: string;
}> {
  const tier = await getUserTier();
  const limit = PRICING_TIERS[tier].maxCaptures;

  if (limit === -1) return { allowed: true };

  const usage = await getDailyUsage();
  const remaining = limit - usage.captures;

  if (remaining <= 0) {
    return {
      allowed: false,
      reason:
        tier === "guest"
          ? "Daily capture limit reached. Sign in to unlock Go tier with more captures!"
          : "Daily capture limit reached. Join the Pro waitlist for unlimited access!",
    };
  }

  return { allowed: true, remaining };
}

export async function canUserCompile(): Promise<{
  allowed: boolean;
  remaining?: number;
  reason?: string;
}> {
  const tier = await getUserTier();
  const usage = await getDailyUsage();

  // Basic (Guest) is limited to 10 compiles
  if (tier === "guest") {
    const limit = 10;
    const remaining = limit - usage.compiles;

    if (remaining <= 0) {
      return {
        allowed: false,
        reason: "Daily compile limit reached. Sign in to unlock Go tier with unlimited compiles!",
      };
    }
    return { allowed: true, remaining };
  }

  // All other tiers (Go, Pro, Admin) are unlimited
  return { allowed: true };
}

export async function incrementCapture(): Promise<void> {
  const usage = await getDailyUsage();
  usage.captures += 1;
  await chrome.storage.local.set({ [USAGE_KEY]: usage });

  // Also report to backend if logged in
  await reportUsageToBackend("capture", usage.date);
}

export async function incrementCompile(): Promise<void> {
  const usage = await getDailyUsage();
  usage.compiles += 1;
  await chrome.storage.local.set({ [USAGE_KEY]: usage });

  // Also report to backend if logged in
  await reportUsageToBackend("compile", usage.date);
}

async function reportUsageToBackend(mode: "capture" | "compile", date: string) {
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

export function getTierFeatures(tier: UserTier) {
  const config = PRICING_TIERS[tier];
  let displayName = "Admin";
  if (tier === "guest") displayName = "Basic";
  else if (tier === "free" || tier === "go") displayName = "Go";

  return {
    ...config,
    displayName,
    captureText:
      config.maxCaptures === -1
        ? "Unlimited Captures"
        : `${config.maxCaptures}/day Captures`,
    compileText:
      config.maxCompiles === -1
        ? "Unlimited Compiles"
        : config.maxCompiles === 0
          ? "No Compiles"
          : `${config.maxCompiles}/day Compiles`,
  };
}
