/**
 * Robust Prompt Storage Service for 1prompt
 *
 * Handles:
 * - Memory storage with size limits
 * - Local persistence (chrome.storage.local)
 * - Cloud sync (Firestore)
 * - Offline queue with retry
 * - Deduplication
 */

import type { ScrapedPrompt } from "../types";

// Configuration
const CONFIG = {
  MAX_MEMORY_PROMPTS: 500, // Max prompts in memory per conversation
  MAX_STORED_PROMPTS: 1000, // Max prompts in storage per conversation
  SYNC_DEBOUNCE_MS: 2000, // Debounce cloud sync
  MAX_RETRY_ATTEMPTS: 3, // Max retry for failed syncs
  RETRY_DELAY_MS: 5000, // Delay between retries
  CAPTURE_TIMEOUT_MS: 5000, // Timeout for capture confirmation (increased from 2s)
};

// Types
interface StoredPrompt extends ScrapedPrompt {
  id: string;
  captureMethod: "network" | "dom" | "button_click" | "keyboard";
  synced: boolean;
  retryCount: number;
}

interface ConversationStorage {
  conversationId: string;
  platform: string;
  prompts: StoredPrompt[];
  lastUpdated: number;
}

interface OfflineQueueItem {
  prompt: StoredPrompt;
  action: "add" | "delete";
  timestamp: number;
  retryCount: number;
}

// In-memory state
const memoryStore = new Map<string, StoredPrompt[]>();
const offlineQueue: OfflineQueueItem[] = [];
let syncDebounceTimer: number | null = null;
let isOnline = navigator.onLine;

// Generate unique ID for prompt
function generatePromptId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Normalize text for deduplication
function normalizeForComparison(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 300);
}

// Get storage key for conversation
function getStorageKey(platform: string, conversationId: string): string {
  return `prompts_${platform}_${conversationId}`;
}

// Check if prompt is duplicate
function isDuplicate(prompts: StoredPrompt[], newContent: string): boolean {
  const normalized = normalizeForComparison(newContent);
  return prompts.some((p) => normalizeForComparison(p.content) === normalized);
}

// Trim array to max size (keep newest)
function trimToMaxSize<T>(arr: T[], maxSize: number): T[] {
  if (arr.length <= maxSize) return arr;
  return arr.slice(arr.length - maxSize);
}

/**
 * Add a captured prompt to storage
 */
export async function addCapturedPrompt(
  content: string,
  platform: string,
  conversationId: string,
  captureMethod: StoredPrompt["captureMethod"],
): Promise<boolean> {
  if (!content || content.trim().length === 0) {
    console.log("[1prompt Storage] Empty prompt, skipping");
    return false;
  }

  const storageKey = getStorageKey(platform, conversationId);

  // Get current prompts from memory or load from storage
  let prompts = memoryStore.get(storageKey);
  if (!prompts) {
    prompts = await loadFromStorage(storageKey);
    memoryStore.set(storageKey, prompts);
  }

  // Check for duplicate
  if (isDuplicate(prompts, content)) {
    console.log("[1prompt Storage] Duplicate prompt, skipping");
    return false;
  }

  // Create stored prompt
  const storedPrompt: StoredPrompt = {
    id: generatePromptId(),
    content: content.trim(),
    index: prompts.length,
    timestamp: Date.now(),
    conversationId,
    source: captureMethod === "network" ? "network" : "keylog",
    captureMethod,
    synced: false,
    retryCount: 0,
  };

  // Add to memory store
  prompts.push(storedPrompt);
  prompts = trimToMaxSize(prompts, CONFIG.MAX_MEMORY_PROMPTS);
  memoryStore.set(storageKey, prompts);

  console.log(
    `[1prompt Storage] Added prompt via ${captureMethod}: "${content.slice(0, 50)}..."`,
  );
  console.log(
    `[1prompt Storage] Total prompts for ${conversationId}: ${prompts.length}`,
  );

  // Persist to local storage
  await saveToStorage(storageKey, prompts);

  // Queue for cloud sync
  queueForSync(storedPrompt);

  // Notify background script
  notifyBackgroundScript(storedPrompt, platform, conversationId);

  return true;
}

/**
 * Get all prompts for a conversation
 */
export async function getPromptsForConversation(
  platform: string,
  conversationId: string,
): Promise<StoredPrompt[]> {
  const storageKey = getStorageKey(platform, conversationId);

  // Check memory first
  let prompts = memoryStore.get(storageKey);
  if (prompts) return [...prompts];

  // Load from storage
  prompts = await loadFromStorage(storageKey);
  memoryStore.set(storageKey, prompts);

  return [...prompts];
}

/**
 * Load prompts from chrome.storage.local
 */
async function loadFromStorage(storageKey: string): Promise<StoredPrompt[]> {
  try {
    const result = await chrome.storage.local.get(storageKey);
    const data = result[storageKey] as ConversationStorage | undefined;

    if (data?.prompts) {
      console.log(
        `[1prompt Storage] Loaded ${data.prompts.length} prompts from storage`,
      );
      return data.prompts;
    }
  } catch (e) {
    console.error("[1prompt Storage] Failed to load from storage:", e);
  }
  return [];
}

/**
 * Save prompts to chrome.storage.local
 */
async function saveToStorage(
  storageKey: string,
  prompts: StoredPrompt[],
): Promise<void> {
  try {
    const trimmedPrompts = trimToMaxSize(prompts, CONFIG.MAX_STORED_PROMPTS);

    const data: ConversationStorage = {
      conversationId: prompts[0]?.conversationId || "unknown",
      platform: storageKey.split("_")[1] || "unknown",
      prompts: trimmedPrompts,
      lastUpdated: Date.now(),
    };

    await chrome.storage.local.set({ [storageKey]: data });
    console.log(
      `[1prompt Storage] Saved ${trimmedPrompts.length} prompts to storage`,
    );
  } catch (e) {
    console.error("[1prompt Storage] Failed to save to storage:", e);
  }
}

/**
 * Queue prompt for cloud sync
 */
function queueForSync(prompt: StoredPrompt): void {
  offlineQueue.push({
    prompt,
    action: "add",
    timestamp: Date.now(),
    retryCount: 0,
  });

  // Debounce sync
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    processOfflineQueue();
  }, CONFIG.SYNC_DEBOUNCE_MS) as unknown as number;
}

/**
 * Process offline queue - sync to cloud
 */
async function processOfflineQueue(): Promise<void> {
  if (!isOnline) {
    console.log("[1prompt Storage] Offline, queue will process when online");
    return;
  }

  if (offlineQueue.length === 0) return;

  console.log(
    `[1prompt Storage] Processing ${offlineQueue.length} queued items`,
  );

  const itemsToProcess = [...offlineQueue];
  offlineQueue.length = 0; // Clear queue

  for (const item of itemsToProcess) {
    try {
      // Send to background for cloud sync
      const response = await chrome.runtime.sendMessage({
        action: "SYNC_PROMPT_TO_CLOUD",
        prompt: item.prompt,
        platform: item.prompt.conversationId?.split("_")[0] || "unknown",
      });

      if (response?.success) {
        // Mark as synced in storage
        item.prompt.synced = true;
        console.log(`[1prompt Storage] Synced prompt: ${item.prompt.id}`);
      } else {
        throw new Error(response?.error || "Sync failed");
      }
    } catch (e) {
      console.error("[1prompt Storage] Sync failed:", e);

      // Retry if under max attempts
      if (item.retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
        item.retryCount++;
        offlineQueue.push(item);

        // Schedule retry
        setTimeout(() => processOfflineQueue(), CONFIG.RETRY_DELAY_MS);
      } else {
        console.error(
          `[1prompt Storage] Max retries reached for prompt: ${item.prompt.id}`,
        );
      }
    }
  }
}

/**
 * Notify background script of new prompt
 */
function notifyBackgroundScript(
  prompt: StoredPrompt,
  platform: string,
  conversationId: string,
): void {
  chrome.runtime
    .sendMessage({
      action: "SAVE_SESSION_PROMPTS",
      prompts: [prompt],
      platform,
      conversationId,
    })
    .catch((e) => {
      console.warn("[1prompt Storage] Failed to notify background:", e);
      // Will sync via queue later
    });
}

/**
 * Handle online/offline events
 */
function setupConnectivityListeners(): void {
  window.addEventListener("online", () => {
    console.log("[1prompt Storage] Back online, processing queue");
    isOnline = true;
    processOfflineQueue();
  });

  window.addEventListener("offline", () => {
    console.log("[1prompt Storage] Went offline, queuing syncs");
    isOnline = false;
  });
}

/**
 * Clear prompts for a conversation
 */
export async function clearConversationPrompts(
  platform: string,
  conversationId: string,
): Promise<void> {
  const storageKey = getStorageKey(platform, conversationId);
  memoryStore.delete(storageKey);
  await chrome.storage.local.remove(storageKey);
  console.log(`[1prompt Storage] Cleared prompts for ${conversationId}`);
}

/**
 * Sync all unsynced prompts to cloud
 * Called by alarm or manual trigger
 */
export async function syncPromptsToCloud(): Promise<{
  synced: number;
  failed: number;
}> {
  let synced = 0;
  let failed = 0;

  // First, process any offline queue items
  await processOfflineQueue();

  // Then, find all unsynced prompts in memory
  const promptsToSync: StoredPrompt[] = [];
  let syncPlatform = "unknown";

  memoryStore.forEach((prompts, key) => {
    const unsyncedPrompts = prompts.filter((p) => !p.synced);
    if (unsyncedPrompts.length > 0) {
      promptsToSync.push(...unsyncedPrompts);
      // Extract platform from key (format: prompts_platform_conversationId)
      const parts = key.split("_");
      if (parts.length >= 2) {
        syncPlatform = parts[1];
      }
    }
  });

  if (promptsToSync.length === 0) {
    console.log("[1prompt Storage] No prompts to sync");
    return { synced: 0, failed: 0 };
  }

  console.log(
    `[1prompt Storage] Syncing ${promptsToSync.length} prompts to cloud`,
  );

  try {
    const response = await chrome.runtime.sendMessage({
      action: "SYNC_PROMPTS_TO_CLOUD",
      prompts: promptsToSync.map((p) => ({
        id: p.id,
        content: p.content,
        timestamp: p.timestamp,
        platform: syncPlatform,
        conversationId: p.conversationId,
        captureMethod: p.captureMethod || "unknown",
      })),
      platform: syncPlatform,
    });

    if (response?.success) {
      synced = response.synced || promptsToSync.length;

      // Mark as synced
      promptsToSync.forEach((p) => {
        p.synced = true;
      });

      console.log(`[1prompt Storage] Successfully synced ${synced} prompts`);
    } else {
      failed = promptsToSync.length;
      console.error("[1prompt Storage] Cloud sync failed:", response?.error);
    }
  } catch (e) {
    failed = promptsToSync.length;
    console.error("[1prompt Storage] Cloud sync error:", e);

    // Add to offline queue for retry
    for (const prompt of promptsToSync) {
      offlineQueue.push({
        prompt,
        action: "add",
        timestamp: Date.now(),
        retryCount: 0,
      });
    }
  }

  return { synced, failed };
}

/**
 * Get storage stats
 */
export async function getStorageStats(): Promise<{
  memoryConversations: number;
  totalMemoryPrompts: number;
  offlineQueueSize: number;
}> {
  let totalMemoryPrompts = 0;
  memoryStore.forEach((prompts) => {
    totalMemoryPrompts += prompts.length;
  });

  return {
    memoryConversations: memoryStore.size,
    totalMemoryPrompts,
    offlineQueueSize: offlineQueue.length,
  };
}

/**
 * Initialize storage service
 */
export function initPromptStorage(): void {
  setupConnectivityListeners();
  console.log("[1prompt Storage] Prompt storage service initialized");
}

// Export config for testing
export { CONFIG as STORAGE_CONFIG };
