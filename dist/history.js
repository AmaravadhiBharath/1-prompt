import { b as signInWithGoogle } from "./auth.js";
import { r as reactExports, j as jsxRuntimeExports, R as React, c as client } from "./vendor.js";
import { getUserTier } from "./pricing.js";
/* empty css      */
import "./firebase.js";
const IconArrowLeft = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M19 12H5M12 19l-7-7 7-7" }) });
const IconSearch = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "11", cy: "11", r: "8" }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })
] });
const IconTrash = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "3 6 5 6 21 6" }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })
] });
const IconMessage = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) });
const LogoChatGPT = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" }) });
const LogoClaude = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" }) });
const LogoGemini = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" }) });
const LogoPerplexity = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "10" }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 6v6l4 2" })
] });
const LogoDeepseek = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" }) });
const LogoLovable = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" }) });
const LogoBolt = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" }) });
const LogoCursor = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M13 13l6 6" })
] });
const LogoMetaAI = () => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 12.5C12 12.5 11 10 10 10C8.5 10 7.5 11.5 7.5 12.5C7.5 13.5 8.5 15 10 15C11 15 12 12.5 12 12.5ZM12 12.5C12 12.5 13 10 14 10C15.5 10 16.5 11.5 16.5 12.5C16.5 13.5 15.5 15 14 15C13 15 12 12.5 12 12.5ZM24 12.5C24 16.5 21 21 16 21C13.5 21 12 19.5 12 19.5C12 19.5 10.5 21 8 21C3 21 0 16.5 0 12.5C0 8.5 3 4 8 4C11 4 12 5.5 12 5.5C12 5.5 13 4 16 4C21 4 24 8.5 24 12.5Z" }) });
const LogoGeneric = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "12", r: "10" }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M8 12h8M12 8v8" })
] });
const PlatformIcon = ({ platform }) => {
  const p = platform.toLowerCase();
  if (p.includes("chatgpt")) return /* @__PURE__ */ jsxRuntimeExports.jsx(LogoChatGPT, {});
  if (p.includes("claude")) return /* @__PURE__ */ jsxRuntimeExports.jsx(LogoClaude, {});
  if (p.includes("gemini")) return /* @__PURE__ */ jsxRuntimeExports.jsx(LogoGemini, {});
  if (p.includes("perplexity")) return /* @__PURE__ */ jsxRuntimeExports.jsx(LogoPerplexity, {});
  if (p.includes("deepseek")) return /* @__PURE__ */ jsxRuntimeExports.jsx(LogoDeepseek, {});
  if (p.includes("lovable")) return /* @__PURE__ */ jsxRuntimeExports.jsx(LogoLovable, {});
  if (p.includes("bolt")) return /* @__PURE__ */ jsxRuntimeExports.jsx(LogoBolt, {});
  if (p.includes("cursor")) return /* @__PURE__ */ jsxRuntimeExports.jsx(LogoCursor, {});
  if (p.includes("meta")) return /* @__PURE__ */ jsxRuntimeExports.jsx(LogoMetaAI, {});
  return /* @__PURE__ */ jsxRuntimeExports.jsx(LogoGeneric, {});
};
function HistoryPage() {
  const [history, setHistory] = reactExports.useState([]);
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [selectedItem, setSelectedItem] = reactExports.useState(null);
  const [activeFilter, setActiveFilter] = reactExports.useState("all");
  const [tier, setTier] = reactExports.useState("guest");
  const [loadingTier, setLoadingTier] = reactExports.useState(true);
  reactExports.useEffect(() => {
    getUserTier().then((t) => {
      setTier(t);
      setLoadingTier(false);
    });
  }, []);
  reactExports.useEffect(() => {
    chrome.storage.local.get(["theme", "extractionHistory"], (result) => {
      if (result.theme) {
        document.documentElement.setAttribute("data-theme", result.theme);
      }
      if (result.extractionHistory) {
        setHistory(result.extractionHistory);
      }
    });
  }, []);
  const groupHistoryByDate = (items) => {
    const groups = [];
    const pinnedItems = items.filter((item) => item.isPinned);
    if (pinnedItems.length > 0) {
      groups.push({ label: "Pinned", items: pinnedItems });
    }
    const unpinnedItems = items.filter((item) => !item.isPinned);
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayItems = unpinnedItems.filter((item) => {
      const d = new Date(item.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    if (todayItems.length > 0) groups.push({ label: "Today", items: todayItems });
    const yesterdayItems = unpinnedItems.filter((item) => {
      const d = new Date(item.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === yesterday.getTime();
    });
    if (yesterdayItems.length > 0) groups.push({ label: "Yesterday", items: yesterdayItems });
    const earlierItems = unpinnedItems.filter((item) => {
      const d = new Date(item.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < yesterday.getTime();
    });
    if (earlierItems.length > 0) groups.push({ label: "Earlier", items: earlierItems });
    return groups;
  };
  const filteredHistory = history.filter((item) => {
    const matchesSearch = item.preview.toLowerCase().includes(searchQuery.toLowerCase()) || item.platform.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "all" || item.mode === activeFilter;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.timestamp - a.timestamp;
  });
  const groupedHistory = groupHistoryByDate(filteredHistory);
  const handleDelete = (id, e) => {
    e.stopPropagation();
    const newHistory = history.filter((item) => item.id !== id);
    setHistory(newHistory);
    chrome.storage.local.set({ extractionHistory: newHistory });
    if ((selectedItem == null ? void 0 : selectedItem.id) === id) {
      setSelectedItem(null);
    }
  };
  if (loadingTier) return null;
  if (tier === "guest") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "history-page", style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      padding: 40,
      textAlign: "center"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 48, marginBottom: 16 }, children: "🔒" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "History Locked" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "var(--text-secondary)", marginBottom: 24, padding: "0 20px" }, children: "Sign in to access your conversation history (Basic users do not have access)." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: signInWithGoogle,
          style: {
            background: "var(--kb-logo-vibrant)",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer"
          },
          children: "Sign In with Google"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => window.close(),
          style: {
            background: "transparent",
            color: "var(--text-tertiary)",
            border: "none",
            marginTop: 16,
            cursor: "pointer",
            fontSize: "14px"
          },
          children: "Close"
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "history-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "history-sidebar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "history-header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "history-title", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "back-btn", onClick: () => window.close(), children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconArrowLeft, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "History" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "search-bar", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(IconSearch, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              placeholder: "Search conversations...",
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "history-filters", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: `filter-tab ${activeFilter === "all" ? "active" : ""}`,
              onClick: () => setActiveFilter("all"),
              children: "All"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: `filter-tab ${activeFilter === "capture" ? "active" : ""}`,
              onClick: () => setActiveFilter("capture"),
              children: "Capture"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: `filter-tab ${activeFilter === "compile" ? "active" : ""}`,
              onClick: () => setActiveFilter("compile"),
              children: "Compile"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "history-list", children: groupedHistory.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "empty-history", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "No conversations found" }) }) : groupedHistory.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs(React.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "history-date-separator", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: group.label }) }),
        group.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `history-item-card ${(selectedItem == null ? void 0 : selectedItem.id) === item.id ? "active" : ""}`,
            onClick: () => setSelectedItem(item),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-top", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "platform-badge-pill", children: !item.platform || item.platform === "unknown" ? "LEGACY" : item.platform.toUpperCase() }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-top-right", children: [
                  item.isPinned && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card-pin-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M16 12V4H8v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" }) }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "card-date-text", children: new Date(item.timestamp).toLocaleDateString() })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "card-preview-text", children: item.preview || "No content" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-bottom", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "card-count-text", children: [
                  item.promptCount,
                  " prompts"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    className: "card-delete-btn",
                    onClick: (e) => handleDelete(item.id, e),
                    title: "Delete",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconTrash, {})
                  }
                )
              ] })
            ]
          },
          item.id
        ))
      ] }, group.label)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "history-main", children: selectedItem ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-view", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "header-info", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "platform-badge", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(PlatformIcon, { platform: selectedItem.platform }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: !selectedItem.platform || selectedItem.platform === "unknown" ? "LEGACY" : selectedItem.platform.toUpperCase() })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "header-date", children: new Date(selectedItem.timestamp).toLocaleString() })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "header-actions", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stat-pill", children: [
          selectedItem.promptCount,
          " prompts ",
          selectedItem.duration ? `in ${selectedItem.duration}s` : ""
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-content", children: selectedItem.prompts.map((prompt, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "prompt-bubble", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bubble-index", children: index + 1 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bubble-text", children: prompt.content })
      ] }, index)) })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "no-selection", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "empty-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconMessage, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Select a conversation" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Choose a conversation from the list to view details" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `
        * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        .history-page {
          display: flex;
          height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
        }

        /* Sidebar */
        .history-sidebar {
          width: 320px;
          display: flex;
          flex-direction: column;
          background: var(--surface-primary);
        }

        .history-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-light);
        }

        .history-filters {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding: 0 4px;
        }

        .filter-tab {
          background: transparent;
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-tab:hover {
          background: var(--surface-hover);
        }

        .filter-tab.active {
          background: var(--text-primary);
          color: var(--bg-primary);
          border-color: var(--text-primary);
        }

        .history-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .history-title h1 {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        .back-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
        }

        .back-btn:hover {
          background: var(--surface-hover);
          color: var(--text-primary);
        }

        .search-bar {
          position: relative;
        }

        .search-bar svg {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-tertiary);
          width: 16px;
          height: 16px;
        }

        .search-bar input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          background: var(--surface-secondary);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
        }

        .search-bar input:focus {
          border-color: var(--border-strong);
          background: var(--surface-primary);
        }

        .history-list {
          flex: 1;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 0 16px 20px;
        }

        .history-list::-webkit-scrollbar {
          display: none;
          width: 0 !important;
        }

        .history-date-separator {
          padding: 24px 8px 12px;
          font-size: 13px;
          font-weight: 700;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .history-item-card {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
        }

        .history-item-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          border-color: #D1D5DB;
        }

        .history-item-card.active {
          border-color: var(--kb-logo-vibrant);
          background: #F0F7FF;
          box-shadow: 0 4px 6px -1px rgba(0, 122, 255, 0.1);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .platform-badge-pill {
          background: #EBF5FF;
          color: var(--kb-logo-vibrant);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .card-top-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .card-date-text {
          font-size: 12px;
          color: #9CA3AF;
        }

        .card-pin-icon {
          color: var(--kb-logo-vibrant);
        }

        .card-preview-text {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          line-height: 1.5;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
        }

        .card-count-text {
          font-size: 13px;
          color: #6B7280;
          font-weight: 500;
        }

        .card-delete-btn {
          background: transparent;
          border: none;
          color: #D1D5DB;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-delete-btn:hover {
          background: #F3F4F6;
          color: #EF4444;
        }

        .history-filters {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding: 0 4px;
          margin-bottom: 8px;
        }

        .filter-tab {
          background: transparent;
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-tab:hover {
          background: var(--surface-hover);
        }

        .filter-tab.active {
          background: var(--text-primary);
          color: var(--bg-primary);
          border-color: var(--text-primary);
        }


        /* Main Content */
        .history-main {
          flex: 1;
          background: var(--bg-secondary);
          display: flex;
          flex-direction: column;
        }

        .conversation-view {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .conversation-header {
          padding: 20px 32px;
          background: var(--surface-primary);
          border-bottom: 1px solid var(--border-light);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .platform-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .header-date {
          font-size: 13px;
          color: var(--text-tertiary);
        }

        .stat-pill {
          background: var(--surface-secondary);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .conversation-content {
          flex: 1;
          overflow-y: auto;
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
        }

        .prompt-bubble {
          display: flex;
          gap: 16px;
          background: var(--surface-primary);
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          border: 1px solid var(--border-light);
        }

        .bubble-index {
          width: 24px;
          height: 24px;
          background: var(--text-primary);
          color: var(--bg-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .bubble-text {
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-primary);
          white-space: pre-wrap;
        }

        .no-selection {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-tertiary);
        }

        .empty-icon {
          width: 64px;
          height: 64px;
          background: var(--surface-secondary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          color: var(--text-secondary);
        }

        .empty-icon svg {
          width: 32px;
          height: 32px;
        }

        .no-selection h2 {
          margin: 0 0 8px 0;
          color: var(--text-primary);
        }

        .empty-history {
          padding: 32px;
          text-align: center;
          color: var(--text-tertiary);
        }
      ` })
  ] });
}
client.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(HistoryPage, {}) })
);
