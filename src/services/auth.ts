// Authentication service using Chrome Identity API + Firebase

import {
  signOutFromBackend,
  saveUserProfile,
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

const STORAGE_KEY = "promptExtractor_user";

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
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || null);
    });
  });
}

// Store user data
async function storeUser(user: ChromeUser | null): Promise<void> {
  return new Promise((resolve) => {
    if (user) {
      chrome.storage.local.set({ [STORAGE_KEY]: user }, resolve);
    } else {
      chrome.storage.local.remove([STORAGE_KEY], resolve);
    }
  });
}

// Get usage count
export async function getUsageCount(): Promise<number> {
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
  await chrome.storage.local.set({ usage_count: newCount });
  return newCount;
}

// Reset usage (for testing or new billing period)
export async function resetUsage(): Promise<void> {
  await chrome.storage.local.set({ usage_count: 0 });
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

// Sign in with Google
export async function signInWithGoogle(): Promise<ChromeUser> {
  console.log("[Auth] Starting Google Sign-In flow...");
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        console.error(
          "[Auth] Google Auth Token failed:",
          chrome.runtime.lastError,
        );
        reject(
          new Error(
            chrome.runtime.lastError?.message || "Failed to get auth token",
          ),
        );
        return;
      }

      console.log("[Auth] Google token obtained, fetching user info...");
      try {
        // Fetch user info from Google first
        const response = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!response.ok) {
          const errBody = await response.text();
          console.error(
            "[Auth] User info fetch failed:",
            response.status,
            errBody,
          );
          throw new Error("Failed to fetch user info from Google");
        }

        const data = await response.json();
        const user: ChromeUser = {
          id: data.id,
          email: data.email,
          name: data.name || data.email.split("@")[0],
          picture: data.picture,
        };

        console.log("[Auth] Authenticated as:", user.email);

        // Set the current user ID for subsequent requests
        await setCurrentUser(user.id);

        // Save user profile to backend
        await saveUserProfile(user);

        // Store locally for UI
        await storeUser(user);

        // Load quotas from Backend
        await loadQuotas();

        console.log("[Auth] Complete sign-in flow finished successfully");
        resolve(user);
      } catch (error: any) {
        console.error("[Auth] Sign-in flow interrupted:", error);
        // Revoke the token on error so the user can try again fresh
        if (token) {
          chrome.identity.removeCachedAuthToken({ token }, () => {
            console.log("[Auth] Cached token removed due to error");
          });
        }
        reject(error);
      }
    });
  });
}

// Sign out
export async function signOut(): Promise<void> {
  // Clear current user
  await setCurrentUser(null);

  // Sign out from Backend
  await signOutFromBackend();

  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (token) {
        // Revoke the token
        chrome.identity.removeCachedAuthToken({ token }, () => {
          // Also revoke from Google
          fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
        });
      }
      storeUser(null).then(resolve);
    });
  });
}

// Subscribe to auth changes
export function subscribeToAuthChanges(
  callback: (user: ChromeUser | null) => void,
): () => void {
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
