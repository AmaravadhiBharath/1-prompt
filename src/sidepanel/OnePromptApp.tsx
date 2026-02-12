import { useState, useEffect, useRef } from "react";
import type { ExtractionResult, HistoryItem, Mode } from "../types";
import {
  initializeAuth,
  signInWithGoogle,
  signOut,
  subscribeToAuthChanges,
  type ChromeUser,
} from "../services/auth";
import {
  saveHistoryToCloud,
  getHistoryFromCloud,
  mergeHistory,
} from "../services/firebase";
import {
  canUserCapture,
  canUserCompile,
  getUserTier as fetchUserTier,
  incrementCapture,
  incrementCompile,
  type UserTier,
  PRICING_TIERS,
} from "../services/pricing";
import { UpgradePrompt } from "./PricingComponents";
import "./oneprompt.css";
import "./pricing.css";
import "../services/tab-refresh"; // Import for side effects if needed (service worker handling)

export default function OnePromptApp() {
  const [user, setUser] = useState<ChromeUser | null>(null);
  const [tier, setTier] = useState<UserTier>("guest");
  const [extractionResult, setExtractionResult] =
    useState<ExtractionResult | null>(null);
  const [mode, setMode] = useState<Mode>("capture");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    supported: false,
    platform: null as string | null,
    hasPrompts: false,
  });

  // UI States
  const [showResults, setShowResults] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedPrompts, setSelectedPrompts] = useState<number[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [extractionSource, setExtractionSource] = useState<
    "auto" | "dom" | "keylog"
  >("auto");
  const [showProSettings, setShowProSettings] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "capture" | "compile">("all");
  const [platformHistoryFilter, setPlatformHistoryFilter] = useState<string>("all");
  const [dateHistoryFilter, setDateHistoryFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [copySuccess, setCopySuccess] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [showPromptList, setShowPromptList] = useState(false);
  const [showPinned, setShowPinned] = useState(false);

  // Timer States
  const [extractionTime, setExtractionTime] = useState<number | null>(null);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [liveTime, setLiveTime] = useState(0);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  // Initial Auth & Status Check
  useEffect(() => {
    initializeAuth().then((state) => setUser(state.user));

    const unsubscribe = subscribeToAuthChanges((u) => setUser(u));

    // Status polling & Event Listeners
    let pollInterval = 1000; // Start fast for immediate feedback
    let statusInterval: number;

    const checkStatus = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.id) {
          // Check URL first for better "Unconnected" vs "Unsupported" detection
          const url = activeTab.url || "";
          let tempPlatform: string | null = null;
          if (url.includes("chatgpt.com")) tempPlatform = "chatgpt";
          else if (url.includes("claude.ai")) tempPlatform = "claude";
          else if (url.includes("deepseek.com")) tempPlatform = "deepseek";
          else if (url.includes("perplexity.ai")) tempPlatform = "perplexity";
          else if (url.includes("meta.ai")) tempPlatform = "meta-ai";
          else if (url.includes("gemini.google.com")) tempPlatform = "gemini";

          try {
            chrome.tabs.sendMessage(
              activeTab.id,
              { action: "GET_STATUS" },
              (response) => {
                if (chrome.runtime.lastError) {
                  // If message fails but URL is supported -> Unconnected
                  if (tempPlatform) {
                    setStatus({ supported: false, platform: tempPlatform, hasPrompts: false });
                  } else {
                    setStatus({ supported: false, platform: null, hasPrompts: false });
                  }
                } else {
                  setStatus(response || { supported: false, platform: null, hasPrompts: false });
                  // Once connected, slow down polling to reduce load
                  if (response?.supported && pollInterval === 1000) {
                    pollInterval = 3000;
                    clearInterval(statusInterval);
                    statusInterval = setInterval(checkStatus, pollInterval);
                  }
                }
              },
            );
          } catch (e) {
            if (tempPlatform) {
              setStatus({ supported: false, platform: tempPlatform, hasPrompts: false });
            } else {
              setStatus({ supported: false, platform: null, hasPrompts: false });
            }
          }
        }
      });
    };

    statusInterval = setInterval(checkStatus, pollInterval);
    checkStatus();

    // Listen for tab switches and updates
    const onTabActivated = () => {
      // Reset to fast polling on tab change for immediate feedback
      if (pollInterval !== 1000) {
        pollInterval = 1000;
        clearInterval(statusInterval);
        statusInterval = setInterval(checkStatus, pollInterval);
      }
      checkStatus();
    };
    const onTabUpdated = (
      _tabId: number,
      _changeInfo: any,
      tab: chrome.tabs.Tab,
    ) => {
      if (tab.active) {
        // Reset to fast polling on tab update for immediate feedback
        if (pollInterval !== 1000) {
          pollInterval = 1000;
          clearInterval(statusInterval);
          statusInterval = setInterval(checkStatus, pollInterval);
        }
        checkStatus();
      }
    };

    chrome.tabs.onActivated.addListener(onTabActivated);
    chrome.tabs.onUpdated.addListener(onTabUpdated);

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
      if (timerRef.current) clearInterval(timerRef.current);
      chrome.tabs.onActivated.removeListener(onTabActivated);
      chrome.tabs.onUpdated.removeListener(onTabUpdated);
    };
  }, []);

  // Load Pricing Tier
  useEffect(() => {
    const loadTier = async () => {
      const t = await fetchUserTier();
      setTier(t);
    };
    loadTier();
  }, [user]);

  // Load History - show immediately, fetch cloud async
  const loadHistory = async () => {
    // Immediately show local history (fast)
    const local = await chrome.storage.local.get("history");
    const localItems = (local.history as HistoryItem[]) || [];
    setHistoryItems(localItems);
    setViewingHistory(true);
    setShowPopup(false);

    // Then fetch cloud history in background (slow)
    if (user) {
      try {
        const cloudItems = await getHistoryFromCloud(user.id);
        const merged = mergeHistory(localItems, cloudItems);
        setHistoryItems(merged);
      } catch (e) {
        // Keep local items on error
      }
    }
  };

  // Timer Functions
  const startTimer = () => {
    const start = Date.now();
    startTimeRef.current = start;
    setLiveTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
    // @ts-ignore
    timerRef.current = setInterval(() => {
      const d = (Date.now() - start) / 1000;
      setLiveTime(parseFloat(d.toFixed(1)));
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Message Handling (Runtime)
  useEffect(() => {
    const messageListener = async (msg: any) => {
      if (
        msg.action === "EXTRACTION_RESULT" ||
        msg.action === "EXTRACTION_FROM_PAGE_RESULT" ||
        msg.action === "EXTRACTION_STARTED"
      ) {
        if (msg.action === "EXTRACTION_STARTED") {
          setLoading(true);
          setAiError(null);
          setAiEnhancing(msg.mode === "compile");
          startTimer();
          return;
        }

        if (msg.error) {
          setAiError(msg.error);
        } else {
          setAiError(null);
        }

        // If refinement fails, keep previous results but show error and stop loading
        if (isRefining && msg.error) {
          setIsRefining(false);
          setLoading(false);
          setAiError(msg.error);
          stopTimer();
          return;
        }

        // COMPILE MODE FILTERING:
        // 1. Ignore raw prompts (results with no summary) when in compile mode
        // 2. Ignore intermediate "Local (Reliable)" results while waiting for AI
        if (msg.mode === "compile") {
          if (!msg.result.summary) {
            console.log("[Sidepanel] Ignoring raw prompts in compile mode");
            return;
          }
          if (msg.result.model === "Local (Reliable)") {
            console.log("[Sidepanel] Ignoring intermediate local summary, waiting for AI enhancement...");
            return;
          }
        }

        setIsRefining(false);
        setMode(msg.mode || "capture");

        // For compile mode, this should always be the final AI-enhanced result
        // Set it immediately since we didn't show the local results
        setExtractionResult(msg.result);
        setAiEnhancing(false);
        setLoading(false);
        stopTimer();

        setViewingHistory(false); // Close history if open
        setShowResults(true);

        // Calculate time
        const duration = startTimeRef.current
          ? parseFloat(((Date.now() - startTimeRef.current) / 1000).toFixed(1))
          : 0;
        setExtractionTime(duration);

        // Save History only if tier supports it
        if (PRICING_TIERS[tier].hasHistory) {
          const newItem: HistoryItem = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            platform:
              msg.result.metadata?.platform || msg.result.platform || "Unknown",
            promptCount: msg.result.prompts.length,
            preview: msg.result.summary
              ? msg.result.summary.substring(0, 100) + "..."
              : (msg.result.prompts[0]?.content || "").substring(0, 100) + "...",
            prompts: msg.result.prompts,
            summary: msg.result.summary,
            model: msg.result.model,
            provider: msg.result.provider,
            mode: msg.mode || "capture",
            duration: duration,
            isPinned: false,
          };

          setCurrentHistoryId(newItem.id);
          setIsPinned(false);

          const { history = [] } = await chrome.storage.local.get("history");
          const updatedHistory = [newItem, ...history].slice(0, 50);
          await chrome.storage.local.set({ history: updatedHistory });
          setHistoryItems(updatedHistory);

          if (user) {
            await saveHistoryToCloud(user.id, newItem);
          }
        } else {
          // Guest: Temporary ID for UI tracking but don't save to storage
          setCurrentHistoryId("temp-" + Date.now());
          setIsPinned(false);
        }

        // Increment usage
        if (msg.mode === "compile") {
          await incrementCompile();
        } else {
          await incrementCapture();
        }

        // Refresh tier limits/state
        const newTier = await fetchUserTier();
        setTier(newTier);
      } else if (msg.action === "STATUS_RESULT") {
        setStatus({
          supported: msg.supported,
          platform: msg.platform,
          hasPrompts: !!msg.hasPrompts
        });
      } else if (msg.action === "ERROR") {
        setAiError(msg.error);
        setLoading(false);
        stopTimer();
      } else if (msg.action === "EXTRACT_TRIGERED_FROM_PAGE") {
        setLoading(true);
        startTimer();
        setMode(msg.mode || "capture");
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, [user, tier]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e: any) {
      console.error("[UI] Login failed:", e);
      alert(
        `Login Failed: ${e.message || "Please check your connection or Extension ID"}`,
      );
    }
  };

  const handleExtract = async (m: Mode) => {
    // Check limits
    let check;
    if (m === "compile") {
      check = await canUserCompile();
    } else {
      check = await canUserCapture();
    }

    if (!check.allowed) {
      setShowUpgradeModal(true);
      return;
    }

    setMode(m);
    setLoading(true);
    startTimer();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "EXTRACT_PROMPTS",
          mode: m,
          extractionSource,
        });
      }
    });
  };

  const handleCopy = async () => {
    const promptsToCopy =
      selectedPrompts.length > 0
        ? selectedPrompts
          .map((i) =>
            stripSignature(extractionResult?.prompts[i].content || ""),
          )
          .join("\n\n")
        : extractionResult?.prompts
          .map((p) => stripSignature(p.content))
          .join("\n\n");

    if (promptsToCopy) {
      await navigator.clipboard.writeText(promptsToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    }
  };

  // Helper to remove visible signature from text when copying
  const stripSignature = (content: string) => {
    return content.replace(/\n\n⚡ Compiled by .*$/s, "");
  };

  const handleCopyRaw = async () => {
    if (!extractionResult) return;
    const promptsToCopy = extractionResult.prompts
      .map((p) => stripSignature(p.content))
      .join("\n\n");

    if (promptsToCopy) {
      await navigator.clipboard.writeText(promptsToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500);
    }
  };

  const handleDelete = () => {
    if (!extractionResult) return;
    if (selectedPrompts.length === 0) return;

    const newPrompts = extractionResult.prompts.filter(
      (_, i) => !selectedPrompts.includes(i),
    );
    // Update prompts immediately but keep the selected state until feedback finishes
    setExtractionResult({ ...extractionResult, prompts: newPrompts });
    setDeleteSuccess(true);
    // Delay clearing the selection so the Delete button remains visible to show "Deleted!"
    setTimeout(() => {
      setSelectedPrompts([]);
      setDeleteSuccess(false);
    }, 1500);
  };

  const toggleSelection = (index: number) => {
    setSelectedPrompts((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const handlePin = async () => {
    // Pin is only for go/pro
    if (tier === "guest") return;

    if (!currentHistoryId) return;

    const newPinnedState = !isPinned;
    setIsPinned(newPinnedState);

    const local = await chrome.storage.local.get("history");
    const history = (local.history as HistoryItem[]) || [];
    const updated = history.map((item) =>
      item.id === currentHistoryId
        ? { ...item, isPinned: newPinnedState }
        : item,
    );

    await chrome.storage.local.set({ history: updated });
    setHistoryItems(updated);

    if (user) {
      // Optional: Sync pin status to cloud if supported by API
      // await updateHistoryItemInCloud(user.id, currentHistoryId, { isPinned: newPinnedState });
    }
  };


  const groupHistoryByDate = (items: HistoryItem[]) => {
    const groups: { label: string; items: HistoryItem[] }[] = [];

    // Always include pinned items if they exist
    const pinnedItems = items.filter((item) => item.isPinned);
    if (pinnedItems.length > 0)
      groups.push({ label: "PINNED", items: pinnedItems });

    const unpinnedItems = items.filter((item) => !item.isPinned);

    // Apply filter
    const filteredItems = unpinnedItems.filter((item) => {
      const modeMatch = historyFilter === "all" || item.mode === historyFilter;
      const platformMatch = platformHistoryFilter === "all" || (item.platform?.toLowerCase().includes(platformHistoryFilter.toLowerCase()));

      let dateMatch = true;
      if (dateHistoryFilter !== "all") {
        const itemDate = new Date(item.timestamp);
        const now = new Date();
        if (dateHistoryFilter === "today") {
          dateMatch = itemDate.toDateString() === now.toDateString();
        } else if (dateHistoryFilter === "week") {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          dateMatch = itemDate >= weekAgo;
        } else if (dateHistoryFilter === "month") {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          dateMatch = itemDate >= monthAgo;
        }
      }

      return modeMatch && platformMatch && dateMatch;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayItems = filteredItems.filter((item) => {
      const d = new Date(item.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    if (todayItems.length > 0)
      groups.push({ label: "Today", items: todayItems });

    const yesterdayItems = filteredItems.filter((item) => {
      const d = new Date(item.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === yesterday.getTime();
    });
    if (yesterdayItems.length > 0)
      groups.push({ label: "Yesterday", items: yesterdayItems });

    const earlierItems = filteredItems.filter((item) => {
      const d = new Date(item.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < yesterday.getTime();
    });
    if (earlierItems.length > 0)
      groups.push({ label: "Earlier", items: earlierItems });

    return groups;
  };

  const renderHistoryCard = (item: HistoryItem) => (
    <div
      key={item.id}
      className="kb-history-card-premium"
      onClick={() => {
        setExtractionResult({
          prompts: item.prompts,
          platform: item.platform,
          url: "",
          title: "History Item",
          extractedAt: item.timestamp,
          summary: item.summary,
          model: item.model,
          provider: item.provider,
        });
        setExtractionTime(item.duration || 0);
        setMode(item.mode || "capture");
        setViewingHistory(false);
        setShowResults(true);
      }}
    >
      <div className="kb-history-card-top">
        <div className="kb-history-platform-pill">
          {!item.platform || item.platform === "unknown"
            ? "LEGACY"
            : item.platform.toUpperCase()}
        </div>
        <div className="kb-history-meta">
          {item.isPinned && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="var(--kb-logo-vibrant)"
              style={{ transform: "rotate(45deg)" }}
            >
              <path d="M16 12V4H8v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          )}
          <span className="kb-history-date">
            {new Date(item.timestamp).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="kb-history-card-preview">{item.preview}</div>
      <div className="kb-history-card-bottom">
        <span className="kb-history-count">{item.promptCount} prompts</span>
      </div>
    </div>
  );


  const renderHeader = () => (
    <div className="kb-header-icons">
      {tier !== "guest" && (
        <button
          className="kb-icon-button"
          onClick={loadHistory}
          title="History"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
      )}
      <button
        className="kb-icon-button"
        onClick={() => setShowPopup(!showPopup)}
        title="Profile"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={user ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={user ? "0" : "2"}
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>
    </div>
  );

  const renderUnsupported = () => (
    <div className="kb-screen-content">
      <h1 className="kb-title-large">
        This page
        <br />
        is not
        <br />
        supported
      </h1>
      <p className="kb-text-body" style={{ marginBottom: 16 }}>
        Please navigate to a{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            chrome.tabs.create({ url: "https://1-prompt.in/supported-sites" });
          }}
          style={{
            color: "var(--kb-primary-blue)",
            textDecoration: "underline",
            fontWeight: 600,
          }}
        >
          supported site
        </a>{" "}
        to use this extension.
      </p>
      <p className="kb-link-text">
        Try{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            chrome.tabs.create({ url: "https://chatgpt.com" });
          }}
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          ChatGPT
        </a>
        ,{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            chrome.tabs.create({ url: "https://claude.ai" });
          }}
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          Claude
        </a>
        , or{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            chrome.tabs.create({ url: "https://chat.deepseek.com" });
          }}
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          DeepSeek
        </a>
        .
      </p>
    </div>
  );

  const renderUnconnected = () => (
    <div className="kb-screen-content">
      <h1 className="kb-title-large">
        Connection
        <br />
        Lost
      </h1>
      <p className="kb-text-body">
        Handshake missing. Please refresh to continue.
      </p>
      <button
        className="kb-btn-refresh"
        onClick={() =>
          chrome.tabs.query(
            { active: true, currentWindow: true },
            (tabs) => tabs[0]?.id && chrome.tabs.reload(tabs[0].id),
          )
        }
      >
        Refresh
      </button>
      <div className="kb-shortcut-hint">
        {navigator.platform.includes("Mac") ? "Cmd + R" : "Ctrl + R"}
      </div>
    </div>
  );

  const renderConnected = () => (
    <div className={`kb-screen-content platform-${status.platform || "generic"}`}>
      <h1 className="kb-title-large">
        One Click
        <br />
        Away
      </h1>
      <div className="kb-text-body">
        <p style={{ margin: 0 }}>
          {status.hasPrompts
            ? `Connected to ${status.platform ? status.platform.charAt(0).toUpperCase() + status.platform.slice(1) : "AI Chat"}.`
            : `Connected to ${status.platform ? status.platform.charAt(0).toUpperCase() + status.platform.slice(1) : "AI Chat"}.`
          }
        </p>
        <p style={{ margin: 0, fontSize: "14px", opacity: 0.8 }}>
          {status.hasPrompts
            ? "Choose a mode to begin."
            : "Open or start a chat to begin capturing."
          }
        </p>
      </div>

      <div
        className={`kb-action-card ${!status.hasPrompts ? "inactive" : ""}`}
        onClick={() => status.hasPrompts && handleExtract("capture")}
      >
        <span className="kb-card-label">Capture</span>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="M12 5l7 7-7 7" />
        </svg>
      </div>

      <div
        className={`kb-action-card ${!status.hasPrompts ? "inactive" : ""}`}
        onClick={() => status.hasPrompts && handleExtract("compile")}
      >
        <span className="kb-card-label">Compile</span>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="M12 5l7 7-7 7" />
        </svg>
      </div>

      {tier === "admin" && (
        <div style={{ width: "100%", marginTop: 24 }}>
          <button
            onClick={() => setShowProSettings(!showProSettings)}
            style={{
              background: "none",
              border: "none",
              color: "var(--kb-logo-vibrant)",
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              margin: "0 auto",
            }}
          >
            Advanced Options {showProSettings ? "▲" : "▼"}
          </button>

          {showProSettings && (
            <div
              style={{
                marginTop: 12,
                background: "rgba(0,0,0,0.03)",
                padding: 12,
                borderRadius: 8,
                fontSize: 12,
                textAlign: "left",
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <label
                  style={{ display: "block", fontWeight: 600, marginBottom: 4 }}
                >
                  Capture Mode
                </label>
                <select
                  value={extractionSource}
                  onChange={(e) => setExtractionSource(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: 4,
                    borderRadius: 4,
                    border: "1px solid #ddd",
                  }}
                >
                  <option value="auto">Auto (Best)</option>
                  <option value="dom">DOM Only (Scrape)</option>
                  <option value="keylog">Keylog Only (Live)</option>
                </select>
              </div>
              <div
                style={{
                  borderTop: "1px solid rgba(0,0,0,0.05)",
                  paddingTop: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    opacity: 0.6,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>🧠</span> Advanced Models
                  <span
                    style={{
                      fontSize: 10,
                      background: "#eee",
                      padding: "2px 4px",
                      borderRadius: 4,
                    }}
                  >
                    Coming Soon
                  </span>
                </div>
                <div
                  style={{
                    opacity: 0.6,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>💬</span> Priority Support
                  <span
                    style={{
                      fontSize: 10,
                      background: "#eee",
                      padding: "2px 4px",
                      borderRadius: 4,
                    }}
                  >
                    Active
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderResults = () => (
    <div className="kb-results-wrapper">
      <div className="kb-results-header">
        <div className="kb-mode-pill">
          {mode === "compile" ? "Compile" : "Capture"}
        </div>
        <div style={{ width: 40 }} /> {/* Spacer to center title */}
      </div>

      <div className="kb-stats-bar">
        <div className="kb-stats-text" style={{ marginBottom: 0 }}>
          Captured {extractionResult?.prompts.length || 0} prompts in{" "}
          {extractionTime?.toFixed(0) || liveTime.toFixed(0)} s
        </div>
        {tier !== "guest" && (
          <button
            className={`kb-pin-btn ${isPinned ? "active" : ""}`}
            onClick={handlePin}
            title={isPinned ? "Unpin" : "Pin to top"}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={isPinned ? "currentColor" : "var(--kb-text-secondary)"}
              xmlns="http://www.w3.org/2000/svg"
              style={{ transform: "rotate(45deg)" }}
            >
              <path d="M16 9V4h1c0.55 0 1-0.45 1-1s-0.45-1-1-1H7C6.45 2 6 2.45 6 3s0.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
            </svg>
          </button>
        )}
      </div>

      <div className="kb-results-card">
        {mode === "compile" && extractionResult?.summary ? (
          <div className={`kb-compile-section ${showPromptList ? "kb-split-view" : ""}`}>
            <div className="kb-summary-scroll-area">
              {
                (() => {
                  const raw = extractionResult.summary || "";
                  const summaryText = raw.replace(/\n\n⚡ Compiled by .*$/s, "");
                  let signatureText = "⚡ Compiled by 1-prompt";

                  // Show specific model/provider ONLY for admins
                  if (tier === "admin") {
                    if (extractionResult.provider) {
                      signatureText = `⚡ Compiled by ${extractionResult.provider}${extractionResult.model ? ` (${extractionResult.model})` : ""}`;
                    } else {
                      const m = raw.match(/\n\n(⚡ Compiled by .*?)$/s);
                      if (m) signatureText = m[1];
                    }
                  }

                  return (
                    <>
                      <div className="kb-compile-content">{summaryText}</div>
                      {signatureText && (
                        <div style={{ fontSize: 11, marginTop: 8, opacity: 0.7, textAlign: "center" }}>{signatureText}</div>
                      )}
                    </>
                  );
                })()
              }
              {extractionResult.summary.includes("1-prompt Local Logic") && (
                <div
                  style={{
                    fontSize: 10,
                    marginTop: 8,
                    opacity: 0.6,
                    textAlign: "center",
                  }}
                >
                  {aiError && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#EF4444",
                        background: "#FFF1F1",
                        padding: "8px 12px",
                        borderRadius: 8,
                        marginBottom: 12,
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                      }}
                    >
                      <strong>Cloud AI Error:</strong> {aiError}
                    </div>
                  )}
                  Local fallback used.{" "}
                  <span
                    style={{
                      textDecoration: "underline",
                      cursor: "pointer",
                      color: "var(--kb-logo-vibrant)",
                    }}
                    onClick={() => {
                      // Trigger a manual re-compilation of EXISTING prompts
                      chrome.runtime.sendMessage({
                        action: "RE_SUMMARIZE",
                      });
                    }}
                  >
                    {isRefining ? "✨ Refining..." : "✨ Refine with Cloud AI"}
                  </span>
                </div>
              )}
            </div>

            <div className="kb-prompts-toggle-sticky">
              <div className="kb-toggle-row">
                <button
                  className="kb-link-btn-split"
                  onClick={() => setShowPromptList(!showPromptList)}
                >
                  <span className="kb-link-main">
                    Captured prompts ({extractionResult.prompts.length})
                  </span>
                  <span className="kb-toggle-chevron">{showPromptList ? "▲" : "▼"}</span>
                </button>

                <button
                  className="kb-copy-pill-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyRaw();
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Copy</span>
                </button>
              </div>
            </div>

            {showPromptList && (
              <div className="kb-inline-prompts-list-container">
                <div className="kb-inline-prompts-list kb-fade-in">
                  {extractionResult.prompts.map((p, i) => (
                    <div key={i} className="kb-inline-prompt-item">
                      <div className="kb-inline-prompt-content">{p.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="kb-results-scroll">
            {extractionResult?.prompts.map((p, i) => (
              <div
                key={i}
                className={`kb-result-item ${selectedPrompts.includes(i) ? "selected" : ""}`}
                onClick={() => toggleSelection(i)}
              >
                {selectedPrompts.includes(i) && (
                  <div className="kb-selection-dot" />
                )}
                <div className="kb-card-body">{p.content}</div>
              </div>
            ))}
          </div>
        )}

        <div className={`kb-card-footer ${copySuccess || deleteSuccess ? "kb-feedback-active" : ""}`}>
          {/* When a feedback state is active, render only a compact feedback-only button */}
          {deleteSuccess ? (
            <button className="kb-footer-btn-secondary" onClick={() => { }}>
              {`Deleted (${selectedPrompts.length})`}
            </button>
          ) : copySuccess ? (
            <button className="kb-footer-btn-primary" onClick={() => { }} aria-live="polite">
              {selectedPrompts.length > 0 ? (
                `Copied (${selectedPrompts.length})`
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ marginLeft: 8 }}>Copied</span>
                </>
              )}
            </button>
          ) : mode === "compile" && extractionResult?.summary ? (
            <button
              className="kb-footer-btn-primary"
              onClick={() => {
                if (extractionResult?.summary) {
                  const textToCopy = stripSignature(extractionResult.summary || "");
                  chrome.runtime.sendMessage({
                    action: "COPY_TEXT",
                    text: textToCopy,
                  });
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2000);
                }
              }}
            >
              {copySuccess ? "Copied!" : "Copy Compiled"}
            </button>
          ) : selectedPrompts.length > 0 ? (
            <>
              <button
                className="kb-footer-btn-secondary"
                onClick={handleDelete}
              >
                {deleteSuccess ? `Deleted (${selectedPrompts.length})` : "Delete"}
              </button>
              <div className="kb-footer-divider" />
              <span className="kb-footer-count">({selectedPrompts.length})</span>
              <div className="kb-footer-divider" />
              <button className="kb-footer-btn-primary" onClick={handleCopy}>
                {copySuccess ? `Copied (${selectedPrompts.length})` : "Copy"}
              </button>
            </>
          ) : (
            <button className="kb-footer-btn-primary" onClick={handleCopy}>
              {copySuccess ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
        {/* Feedback is shown inline inside footer buttons; floating bubble removed */}
      </div>

      <div className="kb-disclaimer">Please verify content before use.</div>
    </div>
  );

  if (loading && !extractionResult && !showResults && !viewingHistory) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="kb-spinner" />
      </div>
    );
  }

  return (
    <div className="kb-app-container">
      {/* Persistent Back (left) — render only when there's something to go back from */}
      {(selectedPrompts.length > 0 || showResults || viewingHistory) && (
        <button
          className="kb-back-circle kb-abs-left"
          title="Back"
          onClick={() => {
            if (selectedPrompts.length > 0) {
              setSelectedPrompts([]);
            } else if (showResults) {
              setShowResults(false);
            } else if (viewingHistory) {
              setViewingHistory(false);
            }
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.0"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {renderHeader()}

      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(255,255,255,0.8)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <div
            className="kb-spinner"
            style={{
              width: 32,
              height: 32,
              border: "3px solid #E5E7EB",
              borderTopColor: "var(--kb-logo-vibrant)",
              borderRadius: "50%",
            }}
          ></div>
          <p
            style={{
              marginTop: 16,
              color: "var(--kb-text-secondary)",
              fontWeight: 500,
            }}
          >
            {mode === "compile"
              ? aiEnhancing
                ? "Enhancing with AI..."
                : "Compiling..."
              : "Capturing..."}{" "}
            {liveTime.toFixed(1)}s
          </p>
        </div>
      )}

      {/* View Switcher */}
      {showUpgradeModal ? (
        <UpgradePrompt
          currentTier={tier}
          onSignIn={handleLogin}
          onClose={() => setShowUpgradeModal(false)}
        />
      ) : viewingHistory ? (
        <div className="kb-history-overlay">
          <div className="kb-results-header">
            <h2 className="kb-history-title">History</h2>
            <div style={{ width: 12 }} />
          </div>

          <div
            className="kb-history-filters-refined"
            style={{
              padding: "0 16px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {/* Primary Mode Toggle */}
            <div className="kb-pill-row-compact">
              <button
                className={`kb-filter-pill-mini ${historyFilter === "all" ? "active" : ""}`}
                onClick={() => setHistoryFilter("all")}
              >
                All
              </button>
              <button
                className={`kb-filter-pill-mini ${historyFilter === "capture" ? "active" : ""}`}
                onClick={() => setHistoryFilter("capture")}
              >
                Capture
              </button>
              <button
                className={`kb-filter-pill-mini ${historyFilter === "compile" ? "active" : ""}`}
                onClick={() => setHistoryFilter("compile")}
              >
                Compile
              </button>
            </div>

            {/* Sub-Filters (Date & Platform) */}
            <div className="kb-pill-row-compact">
              <select
                className="kb-mini-select"
                value={dateHistoryFilter}
                onChange={(e) => setDateHistoryFilter(e.target.value as any)}
              >
                <option value="all">🗓️ All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>

              <select
                className="kb-mini-select"
                value={platformHistoryFilter}
                onChange={(e) => setPlatformHistoryFilter(e.target.value)}
              >
                <option value="all">🌐 Platform</option>
                {Array.from(new Set(historyItems.map((h) => h.platform)))
                  .filter(Boolean)
                  .map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {tier === "guest" ? (
            <div className="kb-screen-content">
              <h3>History Locked</h3>
              <p>Sign in to access your prompt history!</p>
              <button className="kb-btn-primary" onClick={handleLogin}>
                Sign In
              </button>
            </div>
          ) : (
            <div className="kb-history-list">
              {groupHistoryByDate(historyItems).map((group) => (
                <div key={group.label}>
                  {group.label === "PINNED" ? (
                    <>
                      <div
                        className="kb-history-separator clickable"
                        onClick={() => setShowPinned(!showPinned)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                        }}
                      >
                        <span>{group.label}</span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transform: showPinned ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.2s",
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                      {showPinned && group.items.map(renderHistoryCard)}
                    </>
                  ) : (
                    <>
                      <div className="kb-history-separator">{group.label}</div>
                      {group.items.map(renderHistoryCard)}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : showResults ? (
        renderResults()
      ) : !status.platform ? (
        renderUnsupported()
      ) : !status.supported ? (
        renderUnconnected()
      ) : (
        renderConnected()
      )}

      {/* Profile Popup with Backdrop */}
      {showPopup && (
        <>
          <div
            className="kb-popup-backdrop"
            onClick={() => setShowPopup(false)}
          />
          <div
            className="kb-profile-menu kb-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {user ? (
              <>
                <div
                  className="kb-menu-item"
                  style={{
                    borderBottom: "1px solid #F3F4F6",
                    marginBottom: 4,
                    paddingBottom: 10,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{user.name || "User"}</div>
                  <div
                    style={{ fontSize: 12, color: "var(--kb-text-secondary)" }}
                  >
                    {tier === "guest"
                      ? "Basic"
                      : tier === "free" || tier === "go"
                        ? "Go"
                        : "Admin"}{" "}
                    Plan
                  </div>
                </div>
                {tier === "admin" && (
                  <div
                    className="kb-menu-item"
                    style={{ color: "var(--kb-primary-blue)" }}
                    onClick={() => {
                      setShowPopup(false);
                      chrome.tabs.create({ url: "admin.html" });
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>📊 Admin Dashboard</div>
                    <div
                      style={{ fontSize: 11, color: "var(--kb-text-secondary)" }}
                    >
                      View Usage Stats
                    </div>
                  </div>
                )}
                <div
                  className="kb-menu-item"
                  style={{ color: "#EF4444", marginTop: 4 }}
                  onClick={() => {
                    signOut();
                  }}
                >
                  Sign Out
                </div>
              </>
            ) : (
              <div
                className="kb-menu-item"
                onClick={handleLogin}
                style={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <div style={{ fontWeight: 600 }}>Login with Google</div>
                <div
                  style={{ fontSize: 11, color: "var(--kb-text-secondary)" }}
                >
                  Unlock Go Tier (Free!)
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
