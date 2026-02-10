/**
 * Tab Refresh Utility
 * Handles silent refresh of active tab after login
 */

export async function refreshActiveTab(): Promise<boolean> {
  try {
    // Get the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      console.log("[TabRefresh] No active tab found");
      return false;
    }

    const tab = tabs[0];

    // Check if tab can be refreshed (not chrome:// pages etc)
    if (
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("edge://") ||
      tab.url.startsWith("moz-extension://")
    ) {
      console.log("[TabRefresh] Cannot refresh system tab:", tab.url);
      return false;
    }

    // Refresh the tab
    await chrome.tabs.reload(tab.id!);
    console.log("[TabRefresh] Successfully refreshed tab:", tab.url);
    return true;
  } catch (error) {
    console.error("[TabRefresh] Failed to refresh active tab:", error);
    return false;
  }
}

/**
 * Re-inject content script without full page refresh
 */
export async function reinjectContentScript(): Promise<boolean> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) return false;

    const tab = tabs[0];

    // Check if tab is injectable
    if (
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("edge://")
    ) {
      return false;
    }

    // Re-inject the content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      files: ["content.js"],
    });

    console.log("[TabRefresh] Re-injected content script");
    return true;
  } catch (error) {
    console.error("[TabRefresh] Failed to re-inject content script:", error);
    return false;
  }
}

/**
 * Force content script re-initialization without page refresh
 */
export async function forceContentScriptRefresh(): Promise<boolean> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) return false;

    const tab = tabs[0];

    // Send message to content script to reinitialize
    await chrome.tabs.sendMessage(tab.id!, {
      action: "FORCE_REINIT",
      timestamp: Date.now(),
    });

    console.log("[TabRefresh] Forced content script refresh");
    return true;
  } catch (error) {
    console.error("[TabRefresh] Content script refresh failed:", error);
    // If content script doesn't exist, try re-injection
    return await reinjectContentScript();
  }
}
