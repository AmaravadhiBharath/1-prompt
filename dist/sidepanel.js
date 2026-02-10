const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./pricing.js","./firebase.js"])))=>i.map(i=>d[i]);
import { g as getAuthToken, i as initializeAuth, s as subscribeToAuthChanges, a as signOut, b as signInWithGoogle } from "./auth.js";
import { r as reactExports, j as jsxRuntimeExports, R as ReactDOM } from "./vendor.js";
import { r as resilientFetch, c as config, g as getHistoryFromCloud, m as mergeHistory, s as saveHistoryToCloud } from "./firebase.js";
import { _ as __vitePreload } from "./preload-helper.js";
import { PRO_PRICING, getUserTier, incrementCompile, incrementCapture, canUserCompile, canUserCapture } from "./pricing.js";
class TelemetryService {
  queue = [];
  enabled = false;
  // Default to false for privacy
  consentGiven = false;
  constructor() {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get("telemetryConsent", (data) => {
        this.consentGiven = !!data.telemetryConsent;
        this.enabled = this.consentGiven;
      });
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.telemetryConsent) {
          this.consentGiven = changes.telemetryConsent.newValue;
          this.enabled = this.consentGiven;
        }
      });
    }
    if (typeof window !== "undefined" || typeof self !== "undefined") {
      setInterval(() => this.flush(), 6e4);
    }
  }
  setConsent(given) {
    this.consentGiven = given;
    this.enabled = given;
    chrome.storage.local.set({ telemetryConsent: given });
    if (!given) {
      this.queue = [];
    }
  }
  track(event, data = {}) {
    if (!this.enabled || !this.consentGiven) return;
    this.queue.push({
      event,
      timestamp: Date.now(),
      data: {
        ...data,
        version: chrome.runtime.getManifest().version
      }
    });
    if (event.includes("error") || event.includes("crash") || event.includes("failure")) {
      this.flush();
    }
  }
  async flush() {
    if (this.queue.length === 0) return;
    if (!this.consentGiven) {
      this.queue = [];
      return;
    }
    const events = [...this.queue];
    this.queue = [];
    try {
      const token = await getAuthToken();
      const stored = await chrome.storage.session.get("firebase_current_user_id");
      const userId = stored.firebase_current_user_id;
      const headers = {
        "Content-Type": "application/json"
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (userId) headers["X-User-Id"] = userId;
      await resilientFetch(`${config.backend.url}/telemetry`, {
        method: "POST",
        headers,
        body: JSON.stringify({ events })
      });
    } catch (error) {
      if (events.length < 100) {
        this.queue = [...events, ...this.queue].slice(0, 100);
      }
    }
  }
}
const telemetry = new TelemetryService();
class ErrorBoundary extends reactExports.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    telemetry.track("ui_crash", {
      error: error.message,
      stack: error.stack?.slice(0, 500),
      component: errorInfo.componentStack?.slice(0, 200)
    });
  }
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };
  render() {
    if (this.state.hasError) {
      return this.props.fallback || /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "error-boundary-container", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "error-boundary-content", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "error-boundary-emoji", children: "😵" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "error-boundary-title", children: "Something went wrong" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "error-boundary-desc", children: this.state.error?.message || "An unexpected error occurred" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: this.handleReset,
              className: "btn-primary",
              children: "Try Again"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `
            .error-boundary-container {
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              padding: 24px;
              text-align: center;
              background: var(--bg-primary);
              color: var(--text-primary);
            }
            .error-boundary-emoji {
              font-size: 48px;
              margin-bottom: 16px;
            }
            .error-boundary-title {
              font-size: 20px;
              font-weight: 700;
              margin-bottom: 8px;
            }
            .error-boundary-desc {
              font-size: 14px;
              color: var(--text-secondary);
              margin-bottom: 24px;
              max-width: 300px;
            }
          ` })
      ] });
    }
    return this.props.children;
  }
}
function UpgradePrompt({ currentTier, onSignIn, onUpgradeToPro, onClose }) {
  if (currentTier === "guest") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "upgrade-modal", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "upgrade-content", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "upgrade-close", onClick: onClose, children: "×" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "upgrade-header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "🚀 Unlock Go Tier (Free!)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
          "You're on Basic. Sign in to get ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Unlimited Captures" }),
          " and more for FREE!"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "upgrade-features", style: { margin: "24px 0" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "feature-item", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "feature-icon", children: "✨" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Unlimited content captures" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "feature-item", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "feature-icon", children: "☁️" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "History & Sync across devices" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "feature-item", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "feature-icon", children: "📍" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Pin your favorite prompts" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "feature-item", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "feature-icon", children: "⚡" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "10 Compiles per day" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "kb-google-btn", onClick: onSignIn, style: { width: "100%", marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z", fill: "#4285F4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z", fill: "#34A853" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z", fill: "#FBBC05" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z", fill: "#EA4335" })
        ] }),
        "Sign in & Upgrade to Go"
      ] })
    ] }) });
  }
  if (currentTier === "free" || currentTier === "go") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "upgrade-modal", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "upgrade-content", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "upgrade-close", onClick: onClose, children: "×" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "upgrade-header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "⭐ Upgrade to Pro" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pricing-display", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "price-new", children: [
          "$",
          PRO_PRICING.regularPrice,
          "/month"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Get unlimited power and advanced control." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "upgrade-features", style: { margin: "24px 0" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "feature-item", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "feature-icon", children: "⚡" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Unlimited" }),
            " session compiles"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "feature-item", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "feature-icon", children: "🧠" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Access to Advanced Models" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "feature-item", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "feature-icon", children: "🛠️" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Custom DOM & API options" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "feature-item", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "feature-icon", children: "💬" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Priority Support" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "kb-btn-primary", onClick: onUpgradeToPro, style: { width: "100%", padding: "12px", height: "48px" }, children: "Upgrade to Pro" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "upgrade-note", children: "Cancel anytime" })
    ] }) });
  }
  return null;
}
function OnePromptApp() {
  const [user, setUser] = reactExports.useState(null);
  const [tier, setTier] = reactExports.useState("free");
  const [extractionResult, setExtractionResult] = reactExports.useState(null);
  const [mode, setMode] = reactExports.useState("capture");
  const [loading, setLoading] = reactExports.useState(false);
  const [status, setStatus] = reactExports.useState({ supported: false, platform: null });
  const [showResults, setShowResults] = reactExports.useState(false);
  const [viewingHistory, setViewingHistory] = reactExports.useState(false);
  const [historyItems, setHistoryItems] = reactExports.useState([]);
  const [showPopup, setShowPopup] = reactExports.useState(false);
  const [selectedPrompts, setSelectedPrompts] = reactExports.useState([]);
  const [showUpgradeModal, setShowUpgradeModal] = reactExports.useState(false);
  const [extractionSource, setExtractionSource] = reactExports.useState("auto");
  const [showProSettings, setShowProSettings] = reactExports.useState(false);
  const [historyFilter, setHistoryFilter] = reactExports.useState("all");
  const [copySuccess, setCopySuccess] = reactExports.useState(false);
  const [aiError, setAiError] = reactExports.useState(null);
  const [isRefining, setIsRefining] = reactExports.useState(false);
  const [extractionTime, setExtractionTime] = reactExports.useState(null);
  const [currentHistoryId, setCurrentHistoryId] = reactExports.useState(null);
  const [isPinned, setIsPinned] = reactExports.useState(false);
  const [liveTime, setLiveTime] = reactExports.useState(0);
  const startTimeRef = reactExports.useRef(0);
  const timerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    initializeAuth().then((state) => setUser(state.user));
    const unsubscribe = subscribeToAuthChanges((u) => setUser(u));
    const checkStatus = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.id) {
          const url = activeTab.url || "";
          let tempPlatform = null;
          if (url.includes("chatgpt.com")) tempPlatform = "chatgpt";
          else if (url.includes("claude.ai")) tempPlatform = "claude";
          else if (url.includes("deepseek.com")) tempPlatform = "deepseek";
          else if (url.includes("perplexity.ai")) tempPlatform = "perplexity";
          else if (url.includes("meta.ai")) tempPlatform = "meta-ai";
          else if (url.includes("gemini.google.com")) tempPlatform = "gemini";
          try {
            chrome.tabs.sendMessage(activeTab.id, { action: "GET_STATUS" }, (response) => {
              if (chrome.runtime.lastError) {
                if (tempPlatform) {
                  setStatus({ supported: false, platform: tempPlatform });
                } else {
                  setStatus({ supported: false, platform: null });
                }
              } else {
                setStatus(response || { supported: false, platform: null });
              }
            });
          } catch (e) {
            if (tempPlatform) {
              setStatus({ supported: false, platform: tempPlatform });
            } else {
              setStatus({ supported: false, platform: null });
            }
          }
        }
      });
    };
    const statusInterval = setInterval(checkStatus, 1e3);
    checkStatus();
    const onTabActivated = () => checkStatus();
    const onTabUpdated = (_tabId, _changeInfo, tab) => {
      if (tab.active) checkStatus();
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
  reactExports.useEffect(() => {
    const loadTier = async () => {
      const t = await getUserTier();
      setTier(t);
    };
    loadTier();
  }, [user]);
  const loadHistory = async () => {
    const local = await chrome.storage.local.get("history");
    const localItems = local.history || [];
    setHistoryItems(localItems);
    setViewingHistory(true);
    setShowPopup(false);
    if (user) {
      try {
        const cloudItems = await getHistoryFromCloud(user.id);
        const merged = mergeHistory(localItems, cloudItems);
        setHistoryItems(merged);
      } catch (e) {
      }
    }
  };
  const startTimer = () => {
    const start = Date.now();
    startTimeRef.current = start;
    setLiveTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const d = (Date.now() - start) / 1e3;
      setLiveTime(parseFloat(d.toFixed(1)));
    }, 100);
  };
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  reactExports.useEffect(() => {
    const messageListener = async (msg) => {
      if (msg.action === "EXTRACTION_RESULT" || msg.action === "EXTRACTION_FROM_PAGE_RESULT") {
        if (msg.error) {
          setAiError(msg.error);
        } else {
          setAiError(null);
        }
        if (isRefining && msg.error) {
          setIsRefining(false);
          setLoading(false);
          setAiError(msg.error);
          stopTimer();
          return;
        }
        if (msg.mode === "compile" && !msg.result.summary && !msg.error) {
          console.log("[Sidepanel] Received raw compile result, waiting for AI...");
          setExtractionResult(msg.result);
          return;
        }
        setIsRefining(false);
        setExtractionResult(msg.result);
        setMode(msg.mode || "capture");
        setLoading(false);
        stopTimer();
        setViewingHistory(false);
        setShowResults(true);
        const duration = startTimeRef.current ? parseFloat(((Date.now() - startTimeRef.current) / 1e3).toFixed(1)) : 0;
        setExtractionTime(duration);
        const newItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          platform: msg.result.metadata?.platform || msg.result.platform || "Unknown",
          promptCount: msg.result.prompts.length,
          preview: msg.result.summary ? msg.result.summary.substring(0, 100) + "..." : (msg.result.prompts[0]?.content || "").substring(0, 100) + "...",
          prompts: msg.result.prompts,
          summary: msg.result.summary,
          model: msg.result.model,
          provider: msg.result.provider,
          mode: msg.mode || "capture",
          duration,
          isPinned: false
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
        if (msg.mode === "compile") {
          await incrementCompile();
        } else {
          await incrementCapture();
        }
        const newTier = await getUserTier();
        setTier(newTier);
      } else if (msg.action === "STATUS_RESULT") {
        setStatus({ supported: msg.supported, platform: msg.platform });
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
    } catch (e) {
      console.error("[UI] Login failed:", e);
      alert(`Login Failed: ${e.message || "Please check your connection or Extension ID"}`);
    }
  };
  const handleExtract = async (m) => {
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
        chrome.tabs.sendMessage(tabs[0].id, { action: "EXTRACT_PROMPTS", mode: m, extractionSource });
      }
    });
  };
  const handleCopy = async () => {
    const cleanContent = (content) => {
      return content.replace(/\n\n⚡ Summary by .*$/, "");
    };
    const promptsToCopy = selectedPrompts.length > 0 ? selectedPrompts.map((i) => cleanContent(extractionResult?.prompts[i].content || "")).join("\n\n") : extractionResult?.prompts.map((p) => cleanContent(p.content)).join("\n\n");
    if (promptsToCopy) {
      await navigator.clipboard.writeText(promptsToCopy);
    }
  };
  const handleDelete = () => {
    if (!extractionResult) return;
    if (selectedPrompts.length === 0) return;
    const newPrompts = extractionResult.prompts.filter((_, i) => !selectedPrompts.includes(i));
    setExtractionResult({ ...extractionResult, prompts: newPrompts });
    setSelectedPrompts([]);
  };
  const toggleSelection = (index) => {
    setSelectedPrompts((prev) => prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]);
  };
  const handlePin = async () => {
    if (tier === "guest") return;
    if (!currentHistoryId) return;
    const newPinnedState = !isPinned;
    setIsPinned(newPinnedState);
    const local = await chrome.storage.local.get("history");
    const history = local.history || [];
    const updated = history.map(
      (item) => item.id === currentHistoryId ? { ...item, isPinned: newPinnedState } : item
    );
    await chrome.storage.local.set({ history: updated });
    setHistoryItems(updated);
  };
  const groupHistoryByDate = (items) => {
    const groups = [];
    const pinnedItems = items.filter((item) => item.isPinned);
    if (pinnedItems.length > 0) groups.push({ label: "Pinned", items: pinnedItems });
    const unpinnedItems = items.filter((item) => !item.isPinned);
    const filteredItems = unpinnedItems.filter((item) => {
      if (historyFilter === "all") return true;
      return item.mode === historyFilter;
    });
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayItems = filteredItems.filter((item) => {
      const d = new Date(item.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    if (todayItems.length > 0) groups.push({ label: "Today", items: todayItems });
    const yesterdayItems = filteredItems.filter((item) => {
      const d = new Date(item.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === yesterday.getTime();
    });
    if (yesterdayItems.length > 0) groups.push({ label: "Yesterday", items: yesterdayItems });
    const earlierItems = filteredItems.filter((item) => {
      const d = new Date(item.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < yesterday.getTime();
    });
    if (earlierItems.length > 0) groups.push({ label: "Earlier", items: earlierItems });
    return groups;
  };
  const renderHeader = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-header-icons", children: [
    tier !== "guest" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "kb-icon-button", onClick: loadHistory, title: "History", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "10" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "12 6 12 12 16 14" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "kb-icon-button", onClick: () => setShowPopup(!showPopup), title: "Profile", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: user ? "currentColor" : "none", stroke: "currentColor", strokeWidth: user ? "0" : "2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "7", r: "4" })
    ] }) })
  ] });
  const renderUnsupported = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-screen-content", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "kb-title-large", children: [
      "This page",
      /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
      "is not",
      /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
      "supported"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "kb-text-body", style: { marginBottom: 16 }, children: [
      "Please navigate to a ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", onClick: () => setShowUpgradeModal(true), style: { color: "var(--kb-primary-blue)", textDecoration: "none", fontWeight: 600 }, children: "supported site" }),
      " to use this extension."
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "kb-link-text", children: [
      "Try ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", onClick: () => chrome.tabs.create({ url: "https://chatgpt.com" }), style: { color: "inherit" }, children: "ChatGPT" }),
      ", ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", onClick: () => chrome.tabs.create({ url: "https://claude.ai" }), style: { color: "inherit" }, children: "Claude" }),
      ", or ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", onClick: () => chrome.tabs.create({ url: "https://chat.deepseek.com" }), style: { color: "inherit" }, children: "DeepSeek" }),
      "."
    ] })
  ] });
  const renderUnconnected = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-screen-content", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "kb-title-large", children: [
      "Connection",
      /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
      "Lost"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "kb-text-body", children: "Handshake missing. Please refresh to continue." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "kb-btn-refresh", onClick: () => chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => tabs[0]?.id && chrome.tabs.reload(tabs[0].id)), children: "Refresh" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-shortcut-hint", children: navigator.platform.includes("Mac") ? "Cmd + R" : "Ctrl + R" })
  ] });
  const renderConnected = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-screen-content", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "kb-title-large", children: [
      "One Click",
      /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
      "Away"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "kb-text-body", children: [
      "Connected to ",
      status.platform || "AI Chat",
      ".",
      /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
      "Choose a mode to begin."
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-action-card", onClick: () => handleExtract("capture"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kb-card-label", children: "Capture" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M5 12h14" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 5l7 7-7 7" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-action-card", onClick: () => handleExtract("compile"), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kb-card-label", children: "Compile" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M5 12h14" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 5l7 7-7 7" })
      ] })
    ] }),
    (tier === "pro" || tier === "infi" || tier === "admin") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: "100%", marginTop: 24 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setShowProSettings(!showProSettings),
          style: { background: "none", border: "none", color: "var(--kb-logo-vibrant)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, margin: "0 auto" },
          children: [
            "Advanced Options ",
            showProSettings ? "▲" : "▼"
          ]
        }
      ),
      showProSettings && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 12, background: "rgba(0,0,0,0.03)", padding: 12, borderRadius: 8, fontSize: 12, textAlign: "left" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontWeight: 600, marginBottom: 4 }, children: "Extraction Mode" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              value: extractionSource,
              onChange: (e) => setExtractionSource(e.target.value),
              style: { width: "100%", padding: 4, borderRadius: 4, border: "1px solid #ddd" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "auto", children: "Auto (Best)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "dom", children: "DOM Only (Scrape)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "keylog", children: "Keylog Only (Live)" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 4 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { opacity: 0.6, display: "flex", alignItems: "center", gap: 6 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "🧠" }),
            " Advanced Models",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, background: "#eee", padding: "2px 4px", borderRadius: 4 }, children: "Coming Soon" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { opacity: 0.6, display: "flex", alignItems: "center", gap: 6 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "💬" }),
            " Priority Support",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, background: "#eee", padding: "2px 4px", borderRadius: 4 }, children: "Active" })
          ] })
        ] })
      ] })
    ] })
  ] });
  const renderResults = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-results-wrapper", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-results-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "kb-back-circle", onClick: () => {
        if (selectedPrompts.length > 0) {
          setSelectedPrompts([]);
        } else {
          setShowResults(false);
        }
      }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M19 12H5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 19l-7-7 7-7" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-mode-pill", children: [
        mode === "compile" ? "Compile" : "Capture",
        mode === "compile" && /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 40 } }),
      " "
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-stats-bar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-stats-text", style: { marginBottom: 0 }, children: [
        "Captured ",
        extractionResult?.prompts.length || 0,
        " prompts in ",
        extractionTime?.toFixed(0) || liveTime.toFixed(0),
        " s"
      ] }),
      tier !== "guest" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: `kb-pin-btn ${isPinned ? "active" : ""}`,
          onClick: handlePin,
          title: isPinned ? "Unpin" : "Pin to top",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: isPinned ? "currentColor" : "var(--kb-text-secondary)", xmlns: "http://www.w3.org/2000/svg", style: { transform: "rotate(45deg)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M16 9V4h1c0.55 0 1-0.45 1-1s-0.45-1-1-1H7C6.45 2 6 2.45 6 3s0.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" }) })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-results-card", children: [
      mode === "compile" && extractionResult?.summary ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-summary-section", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-summary-content", children: extractionResult.summary }),
        extractionResult.summary.includes("Local Client-Side Logic") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 12 }, children: [
          aiError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
            fontSize: 11,
            color: "#EF4444",
            background: "#FFF1F1",
            padding: "8px 12px",
            borderRadius: 8,
            marginBottom: 12,
            border: "1px solid rgba(239, 68, 68, 0.2)"
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Cloud AI Error:" }),
            " ",
            aiError
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "kb-footer-btn-secondary",
              style: { width: "100%", borderRadius: 12, padding: "8px 0", fontSize: 13 },
              onClick: async () => {
                setLoading(true);
                setIsRefining(true);
                setAiError(null);
                chrome.runtime.sendMessage({
                  action: "RE_SUMMARIZE"
                });
              },
              children: isRefining ? "✨ Refining..." : "✨ Refine with Cloud AI"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { borderTop: "1px solid var(--kb-border)", marginTop: 16, paddingTop: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            className: "kb-link-btn",
            onClick: () => {
              setMode("capture");
            },
            children: [
              "View full list of prompts (",
              extractionResult.prompts.length,
              ")"
            ]
          }
        ) })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-results-scroll", children: extractionResult?.prompts.map((p, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: `kb-result-item ${selectedPrompts.includes(i) ? "selected" : ""}`,
          onClick: () => toggleSelection(i),
          children: [
            selectedPrompts.includes(i) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-selection-dot" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-card-body", children: p.content })
          ]
        },
        i
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-card-footer", children: mode === "compile" && extractionResult?.summary ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "kb-footer-btn-primary", onClick: () => {
        if (extractionResult?.summary) {
          chrome.runtime.sendMessage({ action: "COPY_TEXT", text: extractionResult.summary });
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2e3);
        }
      }, children: copySuccess ? "Copied!" : "Copy Summary" }) : selectedPrompts.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "kb-footer-btn-secondary", onClick: handleDelete, children: "Delete" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-footer-divider" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "kb-footer-btn-primary", onClick: handleCopy, children: copySuccess ? "Copied!" : `Copy (${selectedPrompts.length})` })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "kb-footer-btn-primary", onClick: handleCopy, children: copySuccess ? "Copied!" : "Copy" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-disclaimer", children: "Please verify content before use." })
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-app-container", children: [
    !showResults && !viewingHistory && renderHeader(),
    (showResults || viewingHistory) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-header-icons", children: [
      !viewingHistory && tier !== "guest" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "kb-icon-button", onClick: () => loadHistory(), title: "History", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "10" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "12 6 12 12 16 14" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "kb-icon-button", onClick: () => setShowPopup(!showPopup), title: "Profile", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: user ? "currentColor" : "none", stroke: "currentColor", strokeWidth: user ? "0" : "2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "7", r: "4" })
      ] }) })
    ] }),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "fixed", inset: 0, background: "rgba(255,255,255,0.8)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-spinner", style: { width: 32, height: 32, border: "3px solid #E5E7EB", borderTopColor: "var(--kb-logo-vibrant)", borderRadius: "50%" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { marginTop: 16, color: "var(--kb-text-secondary)", fontWeight: 500 }, children: [
        mode === "compile" ? "Compiling..." : "Capturing...",
        " ",
        liveTime.toFixed(1),
        "s"
      ] })
    ] }),
    viewingHistory ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-history-overlay kb-fade-in", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-results-header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "kb-back-circle", onClick: () => setViewingHistory(false), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M19 12H5" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 19l-7-7 7-7" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { style: { fontSize: 18, fontWeight: 700 }, children: "History" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 40 } })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-history-filters", style: { display: "flex", gap: 8, padding: "0 16px 12px", overflowX: "auto", scrollbarWidth: "none" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: `kb-filter-pill ${historyFilter === "all" ? "active" : ""}`,
            onClick: () => setHistoryFilter("all"),
            children: "All"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: `kb-filter-pill ${historyFilter === "capture" ? "active" : ""}`,
            onClick: () => setHistoryFilter("capture"),
            children: "Capture"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: `kb-filter-pill ${historyFilter === "compile" ? "active" : ""}`,
            onClick: () => setHistoryFilter("compile"),
            children: "Compile"
          }
        )
      ] }),
      tier === "guest" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-screen-content", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "History Locked" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Sign in to access your prompt history!" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "kb-btn-primary", onClick: handleLogin, children: "Sign In" })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-history-list", children: groupHistoryByDate(historyItems).map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-history-separator", children: group.label }),
        group.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-history-card-premium", onClick: () => {
          setExtractionResult({
            prompts: item.prompts,
            platform: item.platform,
            url: "",
            title: "History Item",
            extractedAt: item.timestamp,
            summary: item.summary,
            model: item.model,
            provider: item.provider
          });
          setExtractionTime(item.duration || 0);
          setMode(item.mode || "capture");
          setViewingHistory(false);
          setShowResults(true);
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-history-card-top", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-history-platform-pill", children: !item.platform || item.platform === "unknown" ? "LEGACY" : item.platform.toUpperCase() }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-history-meta", children: [
              item.isPinned && /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "var(--kb-logo-vibrant)", style: { transform: "rotate(45deg)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M16 12V4H8v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kb-history-date", children: new Date(item.timestamp).toLocaleDateString() })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-history-card-preview", children: item.preview }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-history-card-bottom", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "kb-history-count", children: [
            item.promptCount,
            " prompts"
          ] }) })
        ] }, item.id))
      ] }, group.label)) })
    ] }) : showResults ? renderResults() : !status.platform ? renderUnsupported() : !status.supported ? renderUnconnected() : renderConnected(),
    showPopup && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-popup-backdrop", onClick: () => setShowPopup(false) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-profile-menu kb-fade-in", onClick: (e) => e.stopPropagation(), children: user ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-menu-item", style: { borderBottom: "1px solid #F3F4F6", marginBottom: 4, paddingBottom: 10 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600 }, children: user.name || "User" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 12, color: "var(--kb-text-secondary)" }, children: [
            tier === "guest" ? "Basic" : tier === "free" || tier === "go" ? "Go" : "Pro",
            " Plan"
          ] })
        ] }),
        (tier === "free" || tier === "go") && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-menu-item", style: { color: "var(--kb-logo-vibrant)" }, onClick: () => setShowUpgradeModal(true), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600 }, children: "Upgrade to PRO 🚀" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#60A5FA" }, children: "Unlimited Compiles & More" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kb-menu-item", style: { color: "#EF4444", marginTop: 4 }, onClick: () => signOut(), children: "Sign Out" })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kb-menu-item", onClick: handleLogin, style: { display: "flex", flexDirection: "column", gap: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600 }, children: "Login with Google" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "var(--kb-text-secondary)" }, children: "Unlock Go Tier (Free!)" })
      ] }) })
    ] }),
    showUpgradeModal && /* @__PURE__ */ jsxRuntimeExports.jsx(
      UpgradePrompt,
      {
        currentTier: tier,
        onSignIn: handleLogin,
        onUpgradeToPro: async () => {
          setLoading(true);
          try {
            const { invalidateTierCache } = await __vitePreload(async () => {
              const { invalidateTierCache: invalidateTierCache2 } = await import("./pricing.js");
              return { invalidateTierCache: invalidateTierCache2 };
            }, true ? __vite__mapDeps([0,1]) : void 0, import.meta.url);
            await invalidateTierCache();
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await chrome.storage.local.set({ userTier: "pro" });
            const newTier = await getUserTier();
            setTier(newTier);
            setLoading(false);
            setShowUpgradeModal(false);
            alert("✅ Upgrade Successful! (Simulation Mode)");
          } catch (error) {
            console.error("Upgrade error:", error);
            setLoading(false);
            alert("❌ Upgrade failed. Please try again.");
          }
        },
        onClose: () => setShowUpgradeModal(false)
      }
    )
  ] });
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(OnePromptApp, {}) })
);
