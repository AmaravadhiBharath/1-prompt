import type {
  ExtractionResult,
  Message,
  Mode,
  ExtractionResultMessage,
  SetUserIdMessage,
  SyncPromptToCloudMessage,
  SyncPromptsToCloudMessage,
  ExtractionFromPageMessage,
} from "../types";
import {
  aiSummarizer,
  initializeAISummarizer,
} from "../services/ai-summarizer";
import { localSummarizer } from "../services/local-summarizer";
import { getCurrentUserId } from "../services/firebase";
import {
  RemoteConfigService,
  CACHE_TTL,
  LAST_FETCH_KEY,
} from "../services/remote-config";
import { fetchRemoteConfigUpdates } from "../services/remote-config-fetcher";

// Polyfill window for libraries that expect it
if (typeof self !== "undefined" && typeof window === "undefined") {
  (self as any).window = self;
}

console.log("[1-prompt] Service worker started");

// Initialize AI summarizer
initializeAISummarizer();

// Initialize Remote Config and check for updates
// Initialize Remote Config and check for updates
try {
  RemoteConfigService.getInstance()
    .initialize()
    .then(async () => {
      try {
        const stored = await chrome.storage.local.get([LAST_FETCH_KEY]);
        const lastFetch = stored[LAST_FETCH_KEY] || 0;
        if (Date.now() - lastFetch > CACHE_TTL) {
          const config = (RemoteConfigService.getInstance() as any).config;
          fetchRemoteConfigUpdates(config?.version || 0).catch((err) => {
            console.error("[1-prompt] Remote config update failed:", err);
          });
        }
      } catch (innerErr) {
        console.error(
          "[1-prompt] Error checking remote config cache:",
          innerErr,
        );
      }
    })
    .catch((err) => {
      console.error("[1-prompt] Remote config initialization failed:", err);
    });
} catch (err) {
  console.error("[1-prompt] Critical error initializing remote config:", err);
}

// Prevent unhandled rejections from crashing the service worker
self.addEventListener("unhandledrejection", (event) => {
  console.error(
    "[1-prompt] Unhandled rejection in service worker:",
    event.reason,
  );
  event.preventDefault(); // Prevent crash if possible
});

// ============================================================
// KEEP-ALIVE MECHANISM - Prevent service worker from going idle
// ============================================================
chrome.alarms.create("keepAlive", { periodInMinutes: 0.5 }); // Every 30 seconds
chrome.alarms.create("syncPrompts", { periodInMinutes: 5 }); // Sync every 5 minutes

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "keepAlive") {
    // Simple ping to keep service worker alive
    console.log("[1-prompt] Keep-alive ping at", new Date().toISOString());
  } else if (alarm.name === "syncPrompts") {
    // Trigger cloud sync for all active tabs
    console.log("[1-prompt] Triggering prompt sync...");
    try {
      const tabs = await chrome.tabs.query({
        url: [
          "*://*.openai.com/*",
          "*://*.anthropic.com/*",
          "*://*.google.com/*",
          "*://*.perplexity.ai/*",
          "*://*.deepseek.com/*",
          "*://*.lovable.dev/*",
          "*://*.bolt.new/*",
          "*://*.cursor.sh/*",
          "*://*.meta.ai/*",
        ],
      });
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs
            .sendMessage(tab.id, { action: "TRIGGER_CLOUD_SYNC" })
            .catch(() => {
              // Tab might not have content script loaded, ignore
            });
        }
      }
    } catch (err) {
      console.error("[1-prompt] Sync alarm error:", err);
    }
  }
});

// Cache for extraction results
let lastExtractionResult: ExtractionResult | null = null;
let pendingTrigger: { timestamp: number } | null = null;

// Open side panel on extension icon click
if (chrome.sidePanel) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.warn("[1-prompt] SidePanel setup failed:", err));
} else {
  console.warn("[1-prompt] SidePanel API not available, falling back to popup");
  chrome.action.setPopup({ popup: "sidepanel/index.html" }); // Reuse sidepanel as popup
}

// Handle connections from side panel (for initial handshake only)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidepanel") {
    console.log("[1-prompt SW] 🟢 Side panel connected");

    // Immediately check and send status when sidepanel connects
    checkActiveTabStatus();

    // Send cached result if available (via sendMessage since that's what side panel listens to)
    if (lastExtractionResult) {
      chrome.runtime
        .sendMessage({
          action: "EXTRACTION_RESULT",
          result: lastExtractionResult,
        })
        .catch(() => { });
    }

    // Check for pending trigger (extraction started from page before panel opened)
    if (pendingTrigger && Date.now() - pendingTrigger.timestamp < 3000) {
      console.log("[1-prompt] Replaying pending trigger to new sidepanel");
      chrome.runtime
        .sendMessage({ action: "EXTRACT_TRIGERED_FROM_PAGE" })
        .catch(() => { });
    }

    // Handle messages from side panel via port
    port.onMessage.addListener((message: Message) => {
      handleSidePanelMessage(message);
    });

    port.onDisconnect.addListener(() => {
      console.log("[1-prompt SW] 🔴 Side panel disconnected");
    });
  }
});

// Track daily metrics
// Track daily metrics
async function trackDailyMetrics(_promptCount: number) {
  try {
    // TODO: Implement metrics endpoint in backend
    // Placeholder for now
    console.log(
      "[1-prompt] Metrics tracking temporarily disabled during migration",
    );
  } catch (e) {
    // Ignore metrics errors
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    console.log("[1-prompt] Received message:", message.action);

    switch (message.action) {
      case "EXTRACT_PROMPTS":
      case "SUMMARIZE_PROMPTS":
      case "GET_STATUS": {
        // Forward these to the sidepanel message handler
        handleSidePanelMessage(message);
        sendResponse({ success: true });
        return true;
      }

      case "SET_USER_ID": {
        // Allow sidepanel/content to force-set user ID in local storage for background sync reliability
        const { userId } = message as SetUserIdMessage;
        if (userId) {
          chrome.storage.local.set({ firebase_current_user_id: userId }, () => {
            console.log("[1-prompt SW] User ID set in local storage:", userId);
            sendResponse({ success: true });
          });
        } else {
          chrome.storage.local.remove("firebase_current_user_id", () => {
            console.log("[1-prompt SW] User ID removed from local storage");
            sendResponse({ success: true });
          });
        }
        return true;
      }

      case "SYNC_PROMPT_TO_CLOUD": {
        const { prompt, platform } = message as SyncPromptToCloudMessage;
        handleSyncToCloud([prompt], platform, sendResponse);
        return true;
      }

      case "SYNC_PROMPTS_TO_CLOUD": {
        const { prompts, platform } = message as SyncPromptsToCloudMessage;
        handleSyncToCloud(prompts, platform, sendResponse);
        return true;
      }

      case "COPY_TEXT": {
        const { text } = message as { text: string };
        // Create an off-screen document or use active tab to copy if background can't directly
        // Chrome Extension MV3 background service workers cannot access clipboard API directly.
        // We must inject a script into the active tab to perform the copy.
        (async () => {
          try {
            // Find active tab
            const [tab] = await chrome.tabs.query({
              active: true,
              currentWindow: true,
            });
            if (tab?.id) {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (t) => {
                  // Try navigator.clipboard first
                  navigator.clipboard.writeText(t).catch(() => {
                    // Fallback to execCommand if navigator fails (legacy but reliable in content scripts)
                    const textArea = document.createElement("textarea");
                    textArea.value = t;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-9999px";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    try {
                      document.execCommand("copy");
                    } catch (err) {
                      console.error("Fallback copy failed", err);
                    }
                    document.body.removeChild(textArea);
                  });
                },
                args: [text],
              });
              sendResponse({ success: true });
            } else {
              throw new Error("No active tab found to execute copy");
            }
          } catch (e) {
            console.error("Background copy failed", e);
            sendResponse({ success: false, error: String(e) });
          }
        })();
        return true; // async response
      }

      case "OPEN_SIDE_PANEL": {
        (async () => {
          try {
            console.log(
              "[1-prompt] OPEN_SIDE_PANEL received from tab:",
              sender.tab?.id,
            );
            let windowId = sender.tab?.windowId;
            if (!windowId) {
              console.log(
                "[1-prompt] No windowId from sender, querying active tab...",
              );
              const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
              });
              windowId = tab?.windowId;
              console.log("[1-prompt] Got windowId from query:", windowId);
            }

            if (windowId) {
              console.log("[1-prompt] Opening side panel for window:", windowId);
              await chrome.sidePanel.open({ windowId });
              console.log("[1-prompt] Side panel opened successfully");
            } else {
              console.error(
                "[1-prompt] Could not find windowId to open side panel",
              );
            }
          } catch (err) {
            console.error("[1-prompt] Failed to open side panel:", err);
          }
        })();
        sendResponse({ success: true });
        break;
      }

      case "EXTRACTION_FROM_PAGE": {
        // From floating buttons - extract prompts and open side panel
        const { result, mode } = message as ExtractionFromPageMessage;
        lastExtractionResult = result;

        console.log(
          `[1-prompt SW] Received EXTRACTION_FROM_PAGE with ${result.prompts.length} prompts, mode: ${mode}`,
        );

        // Try to open side panel again just in case
        const windowId = sender.tab?.windowId;
        if (windowId) {
          chrome.sidePanel.open({ windowId }).catch(() => { });
        }

        // If mode is 'compile', run reliable compilation (local first, AI enhancement)
        if (mode === "compile" && result.prompts.length > 0) {
          console.log(
            "[1-prompt SW] Mode is COMPILE - using reliable summarization...",
          );

          // Send extraction started message to side panel
          chrome.runtime
            .sendMessage({
              action: "EXTRACTION_STARTED",
              mode,
            })
            .catch(() => { });

          (async () => {
            let localResult: any = null;

            try {
              // Step 1: Immediate local summarization (fast and reliable)
              console.log("[1-prompt SW] Running local summarization...");
              localResult = await localSummarizer.summarize(result.prompts);

              // Broadcast local result immediately
              chrome.runtime
                .sendMessage({
                  action: "EXTRACTION_FROM_PAGE_RESULT",
                  result: {
                    ...result,
                    summary: localResult.summary,
                    promptCount: localResult.promptCount,
                    model: "Local (Reliable)",
                    provider: "client-side",
                  },
                  mode,
                })
                .catch(() => { });

              console.log("[1-prompt SW] Local compilation complete and broadcasted");

              // Step 2: Attempt AI enhancement in background (10s timeout)
              console.log("[1-prompt SW] Attempting AI enhancement...");
              const userId = await getCurrentUserId();

              const aiTimeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("AI enhancement timed out after 10 seconds")), 10000);
              });

              const aiSummaryResult = await Promise.race([
                aiSummarizer.summarize(result.prompts, { userId: userId || undefined }),
                aiTimeoutPromise
              ]);

              console.log("[1-prompt SW] AI enhancement successful, broadcasting upgrade");

              // Broadcast AI-enhanced result
              chrome.runtime
                .sendMessage({
                  action: "EXTRACTION_FROM_PAGE_RESULT",
                  result: {
                    ...result,
                    summary: aiSummaryResult.summary,
                    promptCount: aiSummaryResult.promptCount,
                    model: aiSummaryResult.model,
                    provider: aiSummaryResult.provider,
                  },
                  mode,
                })
                .catch(() => { });
            } catch (error: any) {
              console.log("[1-prompt SW] AI enhancement failed, sending local result as final:", error.message);
              // Send local result as the final result since AI failed
              chrome.runtime
                .sendMessage({
                  action: "EXTRACTION_FROM_PAGE_RESULT",
                  result: {
                    ...result,
                    summary: localResult.summary,
                    promptCount: localResult.promptCount,
                    model: "Local (AI Failed)",
                    provider: "client-side-fallback",
                  },
                  mode,
                })
                .catch(() => { });
            }
          })();
        } else {
          // Mode is 'capture' - broadcast raw prompts immediately
          console.log(
            "[1-prompt SW] Broadcasting EXTRACTION_FROM_PAGE_RESULT via sendMessage...",
          );
          chrome.runtime
            .sendMessage({
              action: "EXTRACTION_FROM_PAGE_RESULT",
              result,
              mode,
            })
            .catch(() => {
              // Ignore if no listeners yet
            });
        }

        console.log("[1-prompt SW] ✅ Result broadcast complete");
        sendResponse({ success: true });
        break;
      }

      case "EXTRACTION_RESULT": {
        const { result, mode } = message as ExtractionResultMessage;
        lastExtractionResult = result;

        // Only trigger summarization if the result comes from a tab (content script)
        // AND we are in compile mode AND it hasn't been compiled yet.
        if (
          sender.tab &&
          mode === "compile" &&
          result.prompts.length > 0 &&
          !result.summary
        ) {
          console.log(
            "[1-prompt SW] Mode is COMPILE - using reliable summarization...",
          );
          (async () => {
            try {
              // Step 1: Immediate local summarization
              console.log("[1-prompt SW] Running local summarization...");
              const localResult = await localSummarizer.summarize(result.prompts);

              const updatedResult = {
                ...result,
                summary: localResult.summary,
                promptCount: localResult.promptCount,
                model: "Local (Reliable)",
                provider: "client-side",
              };
              lastExtractionResult = updatedResult;

              broadcastToSidePanels({
                action: "EXTRACTION_RESULT",
                result: updatedResult,
                mode,
              });

              console.log("[1-prompt SW] Local compilation complete and broadcasted");

              // Step 2: Attempt AI enhancement
              console.log("[1-prompt SW] Attempting AI enhancement...");
              const userId = await getCurrentUserId();

              const aiTimeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("AI enhancement timed out after 10 seconds")), 10000);
              });

              const aiSummaryResult = await Promise.race([
                aiSummarizer.summarize(result.prompts, { userId: userId || undefined }),
                aiTimeoutPromise,
              ]);

              console.log("[1-prompt SW] AI enhancement successful, broadcasting upgrade");

              const aiUpdatedResult = {
                ...result,
                summary: aiSummaryResult.summary,
                promptCount: aiSummaryResult.promptCount,
                model: aiSummaryResult.model,
                provider: aiSummaryResult.provider,
              };
              lastExtractionResult = aiUpdatedResult;

              broadcastToSidePanels({
                action: "EXTRACTION_RESULT",
                result: aiUpdatedResult,
                mode,
              });
            } catch (error: any) {
              console.log("[1-prompt SW] AI enhancement failed, keeping local result:", error.message);
              // Local result already broadcasted
            }
          })();
        } else {
          // Just broadcast if already compiled (or capture mode)
          broadcastToSidePanels({
            action: "EXTRACTION_RESULT",
            result,
            mode,
          });
        }
        sendResponse({ success: true });
        break;
      }

      case "RE_SUMMARIZE": {
        if (!lastExtractionResult || !lastExtractionResult.prompts.length) {
          sendResponse({
            success: false,
            error: "No prompts available to refine",
          });
          break;
        }

        console.log("[1-prompt SW] RE_SUMMARIZE requested");
        (async () => {
          try {
            // Step 1: Immediate local summarization
            console.log("[1-prompt SW] Running local re-summarization...");
            const localResult = await localSummarizer.summarize(lastExtractionResult!.prompts);

            const updatedResult = {
              ...lastExtractionResult!,
              summary: localResult.summary,
              promptCount: localResult.promptCount,
              model: "Local (Reliable)",
              provider: "client-side",
            };
            lastExtractionResult = updatedResult;

            broadcastToSidePanels({
              action: "EXTRACTION_RESULT",
              result: updatedResult,
              mode: "compile",
            });

            console.log("[1-prompt SW] Local re-summarization complete and broadcasted");

            // Step 2: Attempt AI enhancement
            console.log("[1-prompt SW] Attempting AI re-enhancement...");
            const userId = await getCurrentUserId();

            const aiTimeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error("AI re-enhancement timed out after 10 seconds")), 10000);
            });

            const aiSummaryResult = await Promise.race([
              aiSummarizer.summarize(lastExtractionResult!.prompts, { userId: userId || undefined }),
              aiTimeoutPromise,
            ]);

            console.log("[1-prompt SW] AI re-enhancement successful, broadcasting upgrade");

            const aiUpdatedResult = {
              ...lastExtractionResult!,
              summary: aiSummaryResult.summary,
              promptCount: aiSummaryResult.promptCount,
              model: aiSummaryResult.model,
              provider: aiSummaryResult.provider,
            };
            lastExtractionResult = aiUpdatedResult;

            broadcastToSidePanels({
              action: "EXTRACTION_RESULT",
              result: aiUpdatedResult,
              mode: "compile",
            });
          } catch (error: any) {
            console.log("[1-prompt SW] AI re-enhancement failed, keeping local result:", error.message);
            // Local result already broadcasted
          }
        })();
        sendResponse({ success: true });
        break;
      }

      case "STATUS_RESULT": {
        // Content script reporting its status
        broadcastToSidePanels(message);
        sendResponse({ success: true });
        break;
      }

      case "EXTRACT_TRIGERED_FROM_PAGE": {
        console.log(
          "[1-prompt] Broadcasting page extraction trigger to sidepanel",
        );
        pendingTrigger = { timestamp: Date.now() }; // Cache it
        broadcastToSidePanels(message);
        sendResponse({ success: true });
        break;
      }

      case "SAVE_SESSION_PROMPTS": {
        const { prompts, platform, conversationId } = message as {
          prompts: any[];
          platform: string;
          conversationId?: string;
        };

        const today = new Date().toISOString().split("T")[0];
        const key = conversationId
          ? `keylog_${platform}_${conversationId}`
          : `keylog_${platform}_${today}`;

        chrome.storage.local.get([key], (result) => {
          const existing = result[key] || [];

          // Merge with deduplication
          const merged = [...existing];
          const existingContent = new Set(
            existing.map((p: any) => normalizeContent(p.content)),
          );

          for (const prompt of prompts) {
            const normalized = normalizeContent(prompt.content);
            if (!existingContent.has(normalized)) {
              merged.push({
                ...prompt,
                conversationId: conversationId || prompt.conversationId,
                savedAt: Date.now(),
              });
              existingContent.add(normalized);
            }
          }

          chrome.storage.local.set({ [key]: merged });

          // Sync to cloud if user is logged in
          getCurrentUserId().then((_userId) => {
            // Syncing logic disabled in current version
            trackDailyMetrics(prompts.length);
          });
        });

        sendResponse({ success: true });
        break;
      }

      case "GET_CONVERSATION_LOGS":
        {
          const { platform, conversationId } = message as {
            platform: string;
            conversationId: string;
          };

          const today = new Date().toISOString().split("T")[0];
          const specificKey = `keylog_${platform}_${conversationId}`;
          const generalKey = `keylog_${platform}_${today}`;

          chrome.storage.local.get(
            [specificKey, generalKey],
            async (result) => {
              let conversationLogs = result[specificKey] || [];

              // If no specific logs, check general logs and filter
              if (conversationLogs.length === 0 && result[generalKey]) {
                conversationLogs = result[generalKey].filter(
                  (log: any) => log.conversationId === conversationId,
                );
              }

              // If still no logs or very few, try fetching from cloud
              const userId = await getCurrentUserId();
              if (userId && conversationLogs.length < 5) {
                console.log(
                  "[1-prompt] Local logs sparse, fetching from cloud...",
                );
                const cloudLogs: any[] = []; // Keylogs disabled in current version

                if (cloudLogs.length > 0) {
                  // Merge cloud logs with local logs
                  const localContent = new Set(
                    conversationLogs.map((p: any) => p.content),
                  );
                  const merged = [...conversationLogs];

                  for (const cloudPrompt of cloudLogs) {
                    if (!localContent.has(cloudPrompt.content)) {
                      merged.push(cloudPrompt);
                    }
                  }

                  conversationLogs = merged.sort(
                    (a, b) => a.timestamp - b.timestamp,
                  );

                  // Cache back to local for next time
                  chrome.storage.local.set({ [specificKey]: conversationLogs });
                }
              }

              sendResponse({
                success: true,
                prompts: conversationLogs,
              });
            },
          );

          return true; // Keep channel open for async response
        }

        async function handleSyncToCloud(
          prompts: any[],
          platform: string,
          sendResponse: (response?: any) => void,
        ) {
          try {
            const userId = await getCurrentUserId();
            if (!userId) {
              sendResponse({ success: false, error: "Not logged in" });
              return;
            }

            // Group prompts by conversation
            const byConversation = new Map<string, any[]>();
            for (const prompt of prompts) {
              const convId = prompt.conversationId || "default";
              if (!byConversation.has(convId)) {
                byConversation.set(convId, []);
              }
              byConversation.get(convId)!.push({
                content: prompt.content,
                timestamp: prompt.timestamp,
                conversationId: convId,
                platform: platform,
                captureMethod: prompt.captureMethod,
              });
            }

            // Syncing logic disabled in current version
            console.log(
              `[1-prompt] Processing ${prompts.length} prompts for sync (local only)`,
            );

            console.log(
              `[1-prompt] Queued ${prompts.length} prompts for cloud sync`,
            );
            sendResponse({ success: true, synced: prompts.length });
          } catch (err) {
            console.error("[1-prompt] Sync error:", err);
            sendResponse({ success: false, error: String(err) });
          }
        }

      case "CHECK_SIDEPANEL_OPEN": {
        // We can't reliably track this without ports, so always return true
        // The side panel will be open if the user interacts with it
        sendResponse({ isOpen: true });
        break;
      }

      case "GET_SYNC_STATUS": {
        // Return current sync queue status
        sendResponse({
          success: true,
          queueSize: 0,
          isWriting: false,
        });
        break;
      }

      default:
        sendResponse({ success: false, error: "Unknown action" });
    }

    return true;
  },
);

// Keep service worker alive during long operations
async function withKeepAlive<T>(operation: () => Promise<T>): Promise<T> {
  // Create a port to keep alive (Chrome workaround)
  let port: chrome.runtime.Port | null = chrome.runtime.connect({
    name: "keep-alive",
  });

  const keepAlive = setInterval(() => {
    if (port) {
      port.postMessage({ action: "ping" });
    } else {
      // Reconnect if disconnected
      port = chrome.runtime.connect({ name: "keep-alive" });
    }
  }, 25000);

  port.onDisconnect.addListener(() => {
    port = null;
  });

  try {
    return await operation();
  } finally {
    clearInterval(keepAlive);
    if (port) port.disconnect();
  }
}

// Track which tabs have content scripts injected
const injectedTabs = new Set<number>();

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

// Handle SPA navigation - notify existing script instead of re-injecting
chrome.webNavigation?.onHistoryStateUpdated.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only main frame

  const platform = detectPlatformFromUrl(details.url);
  if (!platform) return;

  // If already injected, just notify the existing script
  if (injectedTabs.has(details.tabId)) {
    try {
      chrome.tabs.sendMessage(details.tabId, {
        action: "URL_CHANGED",
        url: details.url,
      });
      console.log(
        `[1-prompt] Notified content script of URL change for ${platform}`,
      );
    } catch (err) {
      // Script might have been unloaded, try re-injecting
      injectedTabs.delete(details.tabId);
    }
    return;
  }

  // Not injected yet, inject now
  try {
    await chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ["content.js"],
    });
    injectedTabs.add(details.tabId);
    console.log(`[1-prompt] Injected content script for ${platform}`);
  } catch (err) {
    // Permission denied or other error
    console.warn(`[1-prompt] Could not inject content script:`, err);
  }
});

// Handle messages from side panel
async function handleSidePanelMessage(message: Message) {
  console.log("[1-prompt] Side panel message:", message.action);

  switch (message.action) {
    case "EXTRACT_PROMPTS": {
      const mode = (message as { mode: Mode }).mode;

      // Send extraction request to active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        console.log("[1-prompt] Sending EXTRACT_PROMPTS to tab:", tab.id);

        // Retry logic for when content script might not be ready
        let retryCount = 0;
        const maxRetries = 3;
        let messageTimeout: any = null;

        const sendMessage = () => {
          messageTimeout = setTimeout(() => {
            if (retryCount < maxRetries) {
              console.warn(
                `[1-prompt] No response from tab ${tab.id}, retrying... (attempt ${retryCount + 1}/${maxRetries})`,
              );
              retryCount++;
              sendMessage();
            } else {
              broadcastToSidePanels({
                action: "ERROR",
                error:
                  "Content script not responding. Please refresh the page and try again.",
              });
            }
          }, 10000); // 10 second timeout per attempt, total 30 seconds

          chrome.tabs.sendMessage(
            tab.id!,
            { action: "EXTRACT_PROMPTS", mode },
            (response) => {
              if (messageTimeout !== null) {
                clearTimeout(messageTimeout);
                messageTimeout = null;
              }
              if (chrome.runtime.lastError) {
                console.error(
                  "[1-prompt] Error sending to tab:",
                  chrome.runtime.lastError,
                );
                if (retryCount < maxRetries) {
                  console.warn(
                    `[1-prompt] Retrying message send... (attempt ${retryCount + 1}/${maxRetries})`,
                  );
                  retryCount++;
                  sendMessage();
                } else {
                  broadcastToSidePanels({
                    action: "ERROR",
                    error:
                      "Could not connect to the page. Please refresh and try again.",
                  });
                }
              } else {
                console.log(
                  "[1-prompt] Content script acknowledged extraction:",
                  response,
                );
              }
            },
          );
        };

        sendMessage();
      } else {
        broadcastToSidePanels({
          action: "ERROR",
          error: "No active tab found. Please make sure a chat page is open.",
        });
      }
      break;
    }

    case "GET_STATUS": {
      checkActiveTabStatus();
      break;
    }

    case "SUMMARIZE_PROMPTS": {
      // Handle compilation request with reliable summarization
      const { prompts, userId, userEmail, authToken } = message as {
        prompts: Array<{ content: string; index: number }>;
        userId?: string;
        userEmail?: string;
        authToken?: string;
      };

      (async () => {
        try {
          console.log(`[1-prompt] Summarizing ${prompts.length} prompts reliably...`);

          // Step 1: Immediate local summarization
          console.log("[1-prompt] Running local summarization...");
          const localResult = await localSummarizer.summarize(prompts);

          broadcastToSidePanels({
            action: "SUMMARY_RESULT",
            result: localResult,
            success: true,
          });

          console.log("[1-prompt] Local compilation complete and broadcasted");

          // Step 2: Attempt AI enhancement
          console.log("[1-prompt] Attempting AI enhancement...");
          const aiTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("AI enhancement timed out after 10 seconds")), 10000);
          });

          const aiResult = await Promise.race([
            withKeepAlive(async () => {
              return await aiSummarizer.summarize(prompts, {
                userId,
                userEmail,
                authToken,
              });
            }),
            aiTimeoutPromise,
          ]);

          console.log("[1-prompt] AI enhancement successful, broadcasting upgrade");

          broadcastToSidePanels({
            action: "SUMMARY_RESULT",
            result: aiResult,
            success: true,
          });
        } catch (error) {
          console.log("[1-prompt] AI enhancement failed, keeping local result:", error instanceof Error ? error.message : String(error));
          // Local result already broadcasted
        }
      })();
      break;
    }
  }
}

// Broadcast message to side panel via chrome.runtime.sendMessage
function broadcastToSidePanels(message: any) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Ignore error if no listeners
  });
}

// Install handler - show welcome page on first install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[1-prompt] Extension installed:", details.reason);

  if (details.reason === "install") {
    // Open welcome page (Live Website /install) on first install
    // This forces the "Setup" view to show immediately
    const { hasSeenWelcome } = await chrome.storage.local.get("hasSeenWelcome");
    if (!hasSeenWelcome) {
      chrome.tabs.create({ url: "https://1-prompt.in/install" });
      chrome.storage.local.set({ hasSeenWelcome: true });
    }
  }
});

// Set uninstall URL - disable during development reloads to prevent annoying tab pops
if (chrome.runtime.setUninstallURL) {
  const isDevelopment = !("update_url" in chrome.runtime.getManifest());
  if (!isDevelopment) {
    chrome.runtime.setUninstallURL("https://1-prompt.in/uninstall");
  } else {
    console.log("[1-prompt] Development mode detected: skipping setUninstallURL");
  }
}

// Monitor tab changes to update side panel status
chrome.tabs.onActivated.addListener(() => {
  checkActiveTabStatus();
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    checkActiveTabStatus();
  }
});

// Helper to check status of active tab
async function checkActiveTabStatus() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    console.log("[1-prompt] Checking tab status:", tab?.url?.substring(0, 50));

    if (!tab?.id) {
      console.log("[1-prompt] No active tab found");
      return;
    }

    // If it's a restricted URL (chrome://, etc), send unsupported immediately
    if (
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("edge://") ||
      tab.url.startsWith("about:")
    ) {
      console.log("[1-prompt] Restricted URL, sending unsupported");
      broadcastToSidePanels({
        action: "STATUS_RESULT",
        supported: false,
        platform: null,
      });
      return;
    }

    // 1. Fast Check: URL-based detection (Optimistic UI)
    const platform = detectPlatformFromUrl(tab.url);
    console.log("[1-prompt] URL-based platform detection:", platform);

    // 2. Verify with Content Script (Source of Truth)
    // Try to ping the content script
    chrome.tabs.sendMessage(
      tab.id,
      { action: "GET_STATUS" },
      async (response) => {
        if (chrome.runtime.lastError) {
          // Content script not ready
          console.log(
            "[1-prompt] Content script not ready:",
            chrome.runtime.lastError.message,
          );
          if (platform) {
            // Known platform but no content script connection - try to auto-inject!
            console.log(
              "[1-prompt] Auto-injecting content script for",
              platform,
            );
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id! },
                files: ["content.js"],
              });
              console.log(
                "[1-prompt] ✅ Content script auto-injected successfully",
              );

              // Wait a moment for script to initialize, then check status again
              setTimeout(() => {
                chrome.tabs.sendMessage(
                  tab.id!,
                  { action: "GET_STATUS" },
                  (retryResponse) => {
                    if (retryResponse) {
                      console.log(
                        "[1-prompt] Content script now responding after auto-inject",
                      );
                      broadcastToSidePanels(retryResponse);
                    } else {
                      // Still not responding, show waiting state
                      broadcastToSidePanels({
                        action: "STATUS_RESULT",
                        supported: false,
                        platform: platform,
                      });
                    }
                  },
                );
              }, 500);
            } catch (injectErr) {
              console.warn("[1-prompt] Auto-inject failed:", injectErr);
              broadcastToSidePanels({
                action: "STATUS_RESULT",
                supported: false,
                platform: platform,
              });
            }
          } else {
            // Unknown site, no content script
            broadcastToSidePanels({
              action: "STATUS_RESULT",
              supported: false,
              platform: null,
            });
          }
        } else if (response) {
          // Content script responded - use its response as source of truth
          console.log("[1-prompt] Content script responded:", response);
          broadcastToSidePanels(response);
        }
      },
    );
  } catch (e) {
    console.error("[1-prompt] Error checking tab status:", e);
  }
}

function detectPlatformFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();

    // ChatGPT - more robust detection
    if (
      hostname.includes("chatgpt.com") ||
      hostname.includes("chat.openai.com") ||
      (hostname.includes("openai.com") && pathname.includes("chat"))
    ) {
      return "ChatGPT";
    }

    // Claude - multiple domains
    if (hostname.includes("claude.ai") || hostname.includes("anthropic.com")) {
      return "Claude";
    }

    // Gemini - Google's AI platforms
    if (
      hostname.includes("gemini.google.com") ||
      hostname.includes("bard.google.com") ||
      (hostname.includes("google.com") &&
        (pathname.includes("gemini") || pathname.includes("bard")))
    ) {
      return "Gemini";
    }

    // Perplexity
    if (
      hostname.includes("perplexity.ai") ||
      hostname.includes("perplexity.com")
    ) {
      return "Perplexity";
    }

    // DeepSeek
    if (
      hostname.includes("deepseek.com") ||
      hostname.includes("chat.deepseek.com")
    ) {
      return "DeepSeek";
    }

    // Lovable - multiple possible domains
    if (
      hostname.includes("lovable.dev") ||
      hostname.includes("lovable.ai") ||
      hostname.includes("gptengineer.app") ||
      hostname.includes("run.gptengineer.app")
    ) {
      return "Lovable";
    }

    // Bolt.new and variants
    if (
      hostname.includes("bolt.new") ||
      hostname.includes("bolt.dev") ||
      hostname.includes("stackblitz.com")
    ) {
      return "Bolt.new";
    }

    // Cursor - multiple domains
    if (
      hostname.includes("cursor.sh") ||
      hostname.includes("cursor.com") ||
      hostname.includes("cursor.ai")
    ) {
      return "Cursor";
    }

    // Meta AI - Facebook/Meta platforms
    if (
      hostname.includes("meta.ai") ||
      hostname.includes("ai.meta.com") ||
      (hostname.includes("facebook.com") && pathname.includes("ai"))
    ) {
      return "Meta AI";
    }
    if (hostname.includes("meta.ai")) return "Meta AI";

    return null;
  } catch (e) {
    return null;
  }
}

// Keyboard commands handler
chrome.commands.onCommand.addListener(async (command) => {
  console.log("[1-prompt] Command received:", command);
  if (command === "extract-prompts") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      // 1. Open side panel
      try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } catch (e) {
        console.warn("[1-prompt] Could not open side panel via command:", e);
      }

      // 2. Trigger extraction
      chrome.tabs.sendMessage(tab.id, {
        action: "EXTRACT_PROMPTS",
        mode: "raw",
      });
    }
  }
});

// Helper function
function normalizeContent(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 200);
}
