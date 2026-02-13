// Authentication service using Chrome Identity API + Firebase

import {
  signOutFromBackend,
  getQuotas,
  setCurrentUser,
  checkUserTier,
} from "./firebase";

export interface ChromeUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export type UserTier = "guest" | "free" | "go" | "pro" | "infi" | "admin";

export interface UserState {
  user: ChromeUser | null;
  tier: UserTier;
  usage: {
    used: number;
    limit: number;
  };
  isLoading: boolean;
}

// Get cached auth token without prompting the user
export async function getAuthToken(): Promise<string | null> {
  // If running outside the extension (e.g. Pages), `chrome.identity` won't exist.
  if (typeof chrome === "undefined" || !chrome.identity) return null;

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

const STORAGE_KEY = "oneprompt_user";

// Default tier limits (can be overridden by Firebase admin)
let TIER_LIMITS: Record<UserTier, number> = {
  guest: 5,
  free: 10,
  go: 25,
  pro: 100,
  infi: 999,
  admin: 999,
};

// Load quotas from Firebase
async function loadQuotas(): Promise<void> {
  try {
    const quotas = await getQuotas();
    TIER_LIMITS = {
      guest: quotas.guest,
      free: quotas.free,
      go: quotas.go || 25,
      pro: quotas.pro,
      infi: quotas.infi || 999,
      admin: 999,
    };
    console.log("[Auth] Loaded quotas from Firebase:", TIER_LIMITS);
  } catch (error) {
    console.log("[Auth] Using default quotas");
  }
}

// Get stored user data
export async function getStoredUser(): Promise<ChromeUser | null> {
  // Fallback to localStorage when not running inside a browser extension
  const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  if (!hasChromeStorage) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ChromeUser) : null;
    } catch (e) {
      return null;
    }
  }

  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || null);
    });
  });
}

// Store user data
async function storeUser(user: ChromeUser | null, token?: string | null): Promise<void> {
  const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  if (!hasChromeStorage) {
    return new Promise((resolve) => {
      try {
        if (user) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
          if (token) localStorage.setItem("firebase_id_token", token);
        } else {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem("firebase_id_token");
        }
      } catch (e) {
        console.warn("[Auth] localStorage unavailable", e);
      }
      resolve();
    });
  }

  return new Promise((resolve) => {
    if (user) {
      const data: any = { [STORAGE_KEY]: user };
      if (token) data["firebase_id_token"] = token;
      chrome.storage.local.set(data, resolve);
    } else {
      chrome.storage.local.remove([STORAGE_KEY, "firebase_id_token"], resolve);
    }
  });
}

// Get usage count
export async function getUsageCount(): Promise<number> {
  const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  if (!hasChromeStorage) {
    try {
      const raw = localStorage.getItem("usage_count");
      return raw ? parseInt(raw, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(["usage_count"], (result) => {
      resolve(result.usage_count || 0);
    });
  });
}

// Increment usage count
export async function incrementUsage(): Promise<number> {
  const current = await getUsageCount();
  const newCount = current + 1;
  const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  if (!hasChromeStorage) {
    try {
      localStorage.setItem("usage_count", String(newCount));
    } catch (e) {
      console.warn("[Auth] localStorage unavailable for usage_count", e);
    }
  } else {
    await chrome.storage.local.set({ usage_count: newCount });
  }
  return newCount;
}

// Reset usage (for testing or new billing period)
export async function resetUsage(): Promise<void> {
  const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  if (!hasChromeStorage) {
    try {
      localStorage.setItem("usage_count", "0");
    } catch (e) {
      console.warn("[Auth] localStorage unavailable for resetUsage", e);
    }
  } else {
    await chrome.storage.local.set({ usage_count: 0 });
  }
}

// Admin emails (hardcoded - only these can use debug tier switcher)
const ADMIN_EMAILS = [
  "amaravadhibharath@gmail.com",
  // Add your other admin emails here
];

export function isAdmin(user: ChromeUser | null): boolean {
  if (!user) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

// Debug: Get tier override (for admin testing only)
export async function getDebugTierOverride(): Promise<UserTier | null> {
  const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  if (!hasChromeStorage) {
    try {
      const raw = localStorage.getItem("debug_tier_override");
      return raw ? (JSON.parse(raw) as UserTier) : null;
    } catch (e) {
      return null;
    }
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(["debug_tier_override"], (result) => {
      resolve(result.debug_tier_override || null);
    });
  });
}

// Debug: Set tier override (admin only)
export async function setDebugTierOverride(
  tier: UserTier | null,
): Promise<void> {
  const user = await getStoredUser();
  if (!isAdmin(user)) {
    console.warn("[Auth] setDebugTierOverride called by non-admin user");
    return;
  }
  const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  if (!hasChromeStorage) {
    try {
      if (tier) {
        localStorage.setItem("debug_tier_override", JSON.stringify(tier));
        console.log(`[Auth] Debug tier override set to: ${tier}`);
      } else {
        localStorage.removeItem("debug_tier_override");
        console.log("[Auth] Debug tier override removed");
      }
    } catch (e) {
      console.warn("[Auth] localStorage unavailable for debug_tier_override", e);
    }
    return;
  }

  return new Promise((resolve) => {
    if (tier) {
      chrome.storage.local.set({ debug_tier_override: tier }, () => {
        console.log(`[Auth] Debug tier override set to: ${tier}`);
        resolve();
      });
    } else {
      chrome.storage.local.remove(["debug_tier_override"], () => {
        console.log("[Auth] Debug tier override removed");
        resolve();
      });
    }
  });
}

// Get user tier (checks Firebase for tier status)
export async function getUserTier(user: ChromeUser | null): Promise<UserTier> {
  if (!user) return "guest";

  // Check for debug override (admin only)
  if (isAdmin(user)) {
    const debugTier = await getDebugTierOverride();
    if (debugTier) {
      console.log(`[Auth] Using debug tier override: ${debugTier}`);
      return debugTier;
    }
  }

  try {
    const tier = await checkUserTier(user.email);
    if (tier) return tier;
  } catch (error) {
    console.log("[Auth] Could not check tier, defaulting to free");
  }

  return "free";
}

// Get tier limit
export function getTierLimit(tier: UserTier): number {
  return TIER_LIMITS[tier];
}

// Check if user can extract (within quota)
export async function canExtract(tier: UserTier): Promise<boolean> {
  const usage = await getUsageCount();
  const limit = getTierLimit(tier);
  return usage < limit;
}

// Sign in with Google (Uses Chrome Identity for Extension, Firebase for Web)
export async function signInWithGoogle(): Promise<ChromeUser> {
  const isExtension =
    typeof chrome !== "undefined" &&
    chrome.identity &&
    chrome.identity.getAuthToken;

  if (isExtension) {
    console.log("[Auth] Starting Native Extension Sign-In...");
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        if (chrome.runtime.lastError || !token) {
          reject(new Error(chrome.runtime.lastError?.message || "Internal identity error"));
          return;
        }

        try {
          // Fetch user info from Google using the token
          const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (!response.ok) throw new Error("Failed to fetch Google profile");

          const profile = await response.json();
          const user: ChromeUser = {
            id: profile.sub,
            email: profile.email,
            name: profile.name,
            picture: profile.picture
          };

          // Store and trigger sync
          await storeUser(user, token);
          await setCurrentUser(user.id);

          // Post profile to backend
          const { config } = await import("../config");
          await fetch(`${config.backend.url}/user/profile`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(user)
          }).catch(err => console.warn("[Auth] Profile sync failed:", err));

          resolve(user);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  console.log("[Auth] Starting Unified Firebase Sign-In (Web Only)...");
  // We use the web sign-in logic for everything now
  const { signInWithGoogleWeb } = await import("./firebase");
  const result = await signInWithGoogleWeb();

  if (!result.user) {
    throw new Error("Firebase sign-in failed: No user returned");
  }

  // Set the current user ID for the background/API services
  await setCurrentUser(result.user.id);

  return result.user;
}

// Sign out
export async function signOut(): Promise<void> {
  console.log("[Auth] Signing out...");

  // 1. Notify Backend
  await signOutFromBackend();

  // 2. Clear Session ID
  await setCurrentUser(null);

  // 3. Clear Storage
  await storeUser(null);

  console.log("[Auth] Sign-out complete");
}

// Subscribe to auth changes
export function subscribeToAuthChanges(
  callback: (user: ChromeUser | null) => void,
): () => void {
  const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged;

  if (hasChromeStorage) {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area === "local" && changes[STORAGE_KEY]) {
        callback(changes[STORAGE_KEY].newValue || null);
      }
    };

    chrome.storage.onChanged.addListener(listener);

    // Return unsubscribe function
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }

  // Fallback for non-extension environments: use localStorage + 'storage' event
  const storageListener = (ev: StorageEvent) => {
    if (ev.key === STORAGE_KEY) {
      try {
        const newValue = ev.newValue ? (JSON.parse(ev.newValue) as ChromeUser) : null;
        callback(newValue);
      } catch (e) {
        callback(null);
      }
    }
  };

  window.addEventListener("storage", storageListener);

  return () => {
    window.removeEventListener("storage", storageListener);
  };
}

// Initialize auth state
// Initialize auth state
export async function initializeAuth(): Promise<UserState> {
  // 1. Get stored user IMMEDIATELY for instant UI
  const user = await getStoredUser();
  const used = await getUsageCount();

  // 2. Load background data (don't block UI if possible, but for first render we return what we have)
  // We trigger these but return the user state immediately
  loadQuotas().catch(console.error);

  // Minimal return for instant render.
  // Detailed tier info will come in subsequent updates if needed,
  // or we rely on defaults/cached values.
  return {
    user,
    tier: "free", // Default safe tier until verified
    usage: { used, limit: 10 },
    isLoading: false,
  };
}
