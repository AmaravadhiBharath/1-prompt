import { d as signOutFromBackend, e as setCurrentUser, _ as __vitePreload, f as getQuotas } from "./firebase.js";
async function getAuthToken() {
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
let TIER_LIMITS = {
  guest: 5,
  free: 10,
  go: 25,
  pro: 100,
  infi: 999,
  admin: 999
};
async function loadQuotas() {
  try {
    const quotas = await getQuotas();
    TIER_LIMITS = {
      guest: quotas.guest,
      free: quotas.free,
      go: quotas.go || 25,
      pro: quotas.pro,
      infi: quotas.infi || 999,
      admin: 999
    };
    console.log("[Auth] Loaded quotas from Firebase:", TIER_LIMITS);
  } catch (error) {
    console.log("[Auth] Using default quotas");
  }
}
async function getStoredUser() {
  const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  if (!hasChromeStorage) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
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
async function storeUser(user, token) {
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
      const data = { [STORAGE_KEY]: user };
      if (token) data["firebase_id_token"] = token;
      chrome.storage.local.set(data, resolve);
    } else {
      chrome.storage.local.remove([STORAGE_KEY, "firebase_id_token"], resolve);
    }
  });
}
async function getUsageCount() {
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
async function signInWithGoogle() {
  const isExtension = typeof chrome !== "undefined" && chrome.identity && chrome.identity.getAuthToken;
  if (isExtension) {
    console.log("[Auth] Starting Native Extension Sign-In...");
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        if (chrome.runtime.lastError || !token) {
          reject(new Error(chrome.runtime.lastError?.message || "Internal identity error"));
          return;
        }
        try {
          const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok) throw new Error("Failed to fetch Google profile");
          const profile = await response.json();
          const user = {
            id: profile.sub,
            email: profile.email,
            name: profile.name,
            picture: profile.picture
          };
          await storeUser(user, token);
          await setCurrentUser(user.id);
          const { config } = await __vitePreload(async () => {
            const { config: config2 } = await import("./firebase.js").then((n) => n.i);
            return { config: config2 };
          }, true ? [] : void 0, import.meta.url);
          await fetch(`${config.backend.url}/user/profile`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(user)
          }).catch((err) => console.warn("[Auth] Profile sync failed:", err));
          resolve(user);
        } catch (e) {
          reject(e);
        }
      });
    });
  }
  console.log("[Auth] Starting Unified Firebase Sign-In (Web Only)...");
  const { signInWithGoogleWeb } = await __vitePreload(async () => {
    const { signInWithGoogleWeb: signInWithGoogleWeb2 } = await import("./firebase.js").then((n) => n.h);
    return { signInWithGoogleWeb: signInWithGoogleWeb2 };
  }, true ? [] : void 0, import.meta.url);
  const result = await signInWithGoogleWeb();
  if (!result.user) {
    throw new Error("Firebase sign-in failed: No user returned");
  }
  await setCurrentUser(result.user.id);
  return result.user;
}
async function signOut() {
  console.log("[Auth] Signing out...");
  await signOutFromBackend();
  await setCurrentUser(null);
  await storeUser(null);
  console.log("[Auth] Sign-out complete");
}
function subscribeToAuthChanges(callback) {
  const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged;
  if (hasChromeStorage) {
    const listener = (changes, area) => {
      if (area === "local" && changes[STORAGE_KEY]) {
        callback(changes[STORAGE_KEY].newValue || null);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }
  const storageListener = (ev) => {
    if (ev.key === STORAGE_KEY) {
      try {
        const newValue = ev.newValue ? JSON.parse(ev.newValue) : null;
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
async function initializeAuth() {
  const user = await getStoredUser();
  const used = await getUsageCount();
  loadQuotas().catch(console.error);
  return {
    user,
    tier: "free",
    // Default safe tier until verified
    usage: { used, limit: 10 },
    isLoading: false
  };
}
export {
  signOut as a,
  signInWithGoogle as b,
  getStoredUser as c,
  getAuthToken as g,
  initializeAuth as i,
  subscribeToAuthChanges as s
};
