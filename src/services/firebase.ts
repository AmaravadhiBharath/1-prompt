/**
 * Backend Sync Service
 * - History sync for logged-in users via Cloudflare Worker
 * - User profile management via Cloudflare Worker
 * - Quotas and Tier check via Cloudflare Worker
 */

import { config } from '../config';
import { resilientFetch } from './resilient-api';

const USER_ID_KEY = 'prompt_extractor_user_id';

// Helper to get backend headers
async function getHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  // Get Google Access Token from Chrome identity API
  const token = await getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Get Google Access Token from Chrome Identity
 */
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

// ============================================
// Authentication (Chrome Identity based)
// ============================================

/**
 * Set the current user ID (called after Chrome Identity auth)
 */
export async function setCurrentUser(userId: string | null): Promise<void> {
  if (userId) {
    await chrome.storage.session.set({ [USER_ID_KEY]: userId });
    await chrome.storage.local.set({ [USER_ID_KEY]: userId });
  } else {
    await chrome.storage.session.remove([USER_ID_KEY]);
    await chrome.storage.local.remove([USER_ID_KEY]);
  }
  console.log('[Backend] User set:', userId ? 'logged in' : 'logged out');
}

/**
 * Sign out from backend
 */
export async function signOutFromBackend(): Promise<void> {
  await chrome.storage.session.remove([USER_ID_KEY]);
  await chrome.storage.local.remove([USER_ID_KEY]);
  console.log('[Backend] Signed out');
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const sessionResult = await chrome.storage.session.get([USER_ID_KEY]);
  if (sessionResult[USER_ID_KEY]) return sessionResult[USER_ID_KEY];
  const localResult = await chrome.storage.local.get([USER_ID_KEY]);
  return localResult[USER_ID_KEY] || null;
}

// ============================================
// History Sync (VIA WORKER)
// ============================================

export interface CloudHistoryItem {
  id: string;
  platform: string;
  promptCount: number;
  mode: 'capture' | 'compile';
  timestamp: number;
  preview: string;
  prompts: Array<{ content: string; index: number }>;
  summary?: string;
  duration?: number;
  isPinned?: boolean;
}

/**
 * Save history item to Cloudflare via API
 */
export async function saveHistoryToCloud(_userId: string, item: CloudHistoryItem): Promise<void> {
  try {
    const response = await resilientFetch(`${config.backend.url}/history`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ item })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    console.log('[Backend] Saved history:', item.id);
  } catch (error) {
    console.error('[Backend] Save history error:', error);
  }
}

/**
 * Get history from Cloudflare via API
 */
export async function getHistoryFromCloud(userId: string): Promise<CloudHistoryItem[]> {
  try {
    const response = await resilientFetch(`${config.backend.url}/history?userId=${userId}`, {
      method: 'GET',
      headers: await getHeaders()
    });

    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return data.history || [];
  } catch (error) {
    console.error('[Backend] Get history error:', error);
    throw error;
  }
}

/**
 * Delete history item via API
 */
export async function deleteHistoryFromCloud(_userId: string, itemId: string): Promise<void> {
  try {
    const response = await resilientFetch(`${config.backend.url}/history/${itemId}`, {
      method: 'DELETE',
      headers: await getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    console.log('[Backend] Deleted history:', itemId);
  } catch (error) {
    console.error('[Backend] Delete history error:', error);
    throw error;
  }
}

/**
 * Clear all history via API
 */
export async function clearHistoryFromCloud(_userId: string): Promise<void> {
  try {
    const response = await resilientFetch(`${config.backend.url}/history`, {
      method: 'DELETE',
      headers: await getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    console.log('[Backend] Cleared all history');
  } catch (error) {
    console.error('[Backend] Clear history error:', error);
    throw error;
  }
}

// ============================================
// User Profile (VIA WORKER)
// ============================================

/**
 * Save user profile to Cloudflare via API
 */
export async function saveUserProfile(user: {
  id: string;
  email: string;
  name: string;
  picture?: string
}): Promise<void> {
  try {
    const response = await resilientFetch(`${config.backend.url}/user/profile`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(user)
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    console.log('[Backend] Saved user profile');
  } catch (error) {
    console.warn('[Backend] Save profile failed (non-critical):', error);
  }
}

// ============================================
// Admin Quotas (VIA WORKER)
// ============================================

export interface Quotas {
  guest: number;
  free: number;
  go?: number;
  pro: number;
  infi?: number;
}

const DEFAULT_QUOTAS: Quotas = { guest: 3, free: 10, go: 25, pro: 100, infi: 999 };

/**
 * Get admin-configured quotas from Backend
 */
export async function getQuotas(): Promise<Quotas> {
  try {
    const response = await resilientFetch(`${config.backend.url}/config/quotas`, {
      method: 'GET',
      headers: await getHeaders()
    });

    if (!response.ok) return DEFAULT_QUOTAS;

    const data = await response.json();
    return data.quotas || DEFAULT_QUOTAS;
  } catch (error) {
    console.error('[Backend] Get quotas error:', error);
    return DEFAULT_QUOTAS;
  }
}

/**
 * Check user tier from Backend
 */
export async function checkUserTier(email: string): Promise<'free' | 'go' | 'pro' | 'infi' | 'admin' | null> {
  try {
    const response = await resilientFetch(`${config.backend.url}/user/tier`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ email })
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.tier || null;
  } catch (error) {
    console.error('[Backend] Check user tier error:', error);
    return null;
  }
}

// ============================================
// Sync Helper
// ============================================

/**
 * Merge local and cloud history (cloud wins on conflict)
 */
export function mergeHistory(
  local: CloudHistoryItem[],
  cloud: CloudHistoryItem[]
): CloudHistoryItem[] {
  if (!cloud || !Array.isArray(cloud)) return local;

  const cloudIds = new Set(cloud.map(item => item.id));
  const merged = [...cloud];

  for (const localItem of local) {
    if (!cloudIds.has(localItem.id)) {
      merged.push(localItem);
    }
  }

  merged.sort((a, b) => b.timestamp - a.timestamp);
  return merged;
}
