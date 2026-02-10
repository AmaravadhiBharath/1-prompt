import { b as setCurrentUser, d as signOutFromBackend, e as saveUserProfile, f as getQuotas } from "./firebase.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
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
const STORAGE_KEY = "promptExtractor_user";
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
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || null);
    });
  });
}
async function storeUser(user) {
  return new Promise((resolve) => {
    if (user) {
      chrome.storage.local.set({ [STORAGE_KEY]: user }, resolve);
    } else {
      chrome.storage.local.remove([STORAGE_KEY], resolve);
    }
  });
}
async function getUsageCount() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["usage_count"], (result) => {
      resolve(result.usage_count || 0);
    });
  });
}
async function signInWithGoogle() {
  console.log("[Auth] Starting Google Sign-In flow...");
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        console.error("[Auth] Google Auth Token failed:", chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError?.message || "Failed to get auth token"));
        return;
      }
      console.log("[Auth] Google token obtained, fetching user info...");
      try {
        const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
          const errBody = await response.text();
          console.error("[Auth] User info fetch failed:", response.status, errBody);
          throw new Error("Failed to fetch user info from Google");
        }
        const data = await response.json();
        const user = {
          id: data.id,
          email: data.email,
          name: data.name || data.email.split("@")[0],
          picture: data.picture
        };
        console.log("[Auth] Authenticated as:", user.email);
        await setCurrentUser(user.id);
        await saveUserProfile(user);
        await storeUser(user);
        await loadQuotas();
        console.log("[Auth] Complete sign-in flow finished successfully");
        resolve(user);
      } catch (error) {
        console.error("[Auth] Sign-in flow interrupted:", error);
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
async function signOut() {
  await setCurrentUser(null);
  await signOutFromBackend();
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
        });
      }
      storeUser(null).then(resolve);
    });
  });
}
function subscribeToAuthChanges(callback) {
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
  getAuthToken as g,
  initializeAuth as i,
  subscribeToAuthChanges as s
};
