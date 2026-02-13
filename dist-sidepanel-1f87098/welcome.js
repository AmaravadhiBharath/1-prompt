import { r as reactExports, j as jsxRuntimeExports, R as ReactDOM, a as React } from "./vendor.js";
import { d as signOutFromBackend, b as signInWithGoogleWeb } from "./firebase.js";
/* empty css       */
/* empty css      */
const Confetti = () => {
  const [pieces, setPieces] = reactExports.useState([]);
  reactExports.useEffect(() => {
    const colors = ["#007cff", "#00c6ff", "#10b981", "#f59e0b", "#ef4444"];
    const p = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100 + "vw",
      delay: Math.random() * 3 + "s",
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 2 + 2 + "s"
    }));
    setPieces(p);
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "celebration-container", style: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10001, overflow: "hidden" }, children: pieces.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "confetti", style: {
    left: p.left,
    background: p.color,
    animationDelay: p.delay,
    animationDuration: p.duration,
    position: "absolute",
    width: "10px",
    height: "10px",
    top: "-10px",
    borderRadius: "2px",
    animationName: "confetti-fall",
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in-out"
  } }, p.id)) });
};
const PinAnimation = () => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pin-visual-animated", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mock-browser-chrome", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mock-url-bar" }),
  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mock-extensions-area", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "puzzle-icon-container pulse-hint", children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 24 24", className: "icon-svg", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H5c-1.1 0-2 .9-2 2v13.5c0 1.1.9 2 2 2h13.5c1.1 0 2-.9 2-2V14.5a2.5 2.5 0 0 0 0-3.5z" }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "extension-pin-menu", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "menu-item-mock", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "app-icon-small" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "app-name-small", children: "1-prompt" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pin-icon-container highlight-action", children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 24 24", className: "icon-svg-small", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" }) }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animated-moving-cursor" })
  ] })
] }) });
const WelcomeWebsite = () => {
  const [isLoggingIn, setIsLoggingIn] = reactExports.useState(false);
  const [loginStep, setLoginStep] = reactExports.useState(0);
  const [loginSuccess, setLoginSuccess] = reactExports.useState(false);
  const [userEmail, setUserEmail] = reactExports.useState(null);
  const [isTransitioning, setIsTransitioning] = reactExports.useState(false);
  const [isPinned, setIsPinned] = reactExports.useState(false);
  const [prepMessages, setPrepMessages] = reactExports.useState([]);
  const loginMessages = [
    "Securing your connection...",
    "Syncing your AI workspace...",
    "Preparing your toolkit...",
    "All set! Opening 1-prompt..."
  ];
  const logoUrl = "/icons/icon128.png";
  reactExports.useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["firebase_user_email"], (res) => {
        if (res.firebase_user_email) {
          setLoginSuccess(true);
          setUserEmail(res.firebase_user_email);
        }
      });
    }
  }, []);
  const openSidePanel = (closeWindow = true) => {
    try {
      if (typeof chrome !== "undefined" && chrome.sidePanel && chrome.sidePanel.open) {
        chrome.windows.getCurrent((currentWindow) => {
          if (currentWindow.id) {
            chrome.sidePanel.open({ windowId: currentWindow.id });
            if (closeWindow) setTimeout(() => window.close(), 100);
          }
        });
      }
    } catch (e) {
      console.log("Could not open sidepanel:", e);
    }
  };
  const handleGoogleLogin = async () => {
    setPrepMessages(loginMessages);
    try {
      setIsLoggingIn(true);
      setLoginStep(0);
      for (let i = 0; i < 3; i++) {
        setLoginStep(i);
        await new Promise((r) => setTimeout(r, 600));
      }
      const res = await signInWithGoogleWeb();
      if (res && res.user) {
        setUserEmail(res.user.email);
        setLoginSuccess(true);
        setLoginStep(3);
        await new Promise((r) => setTimeout(r, 800));
        setIsTransitioning(true);
        setIsLoggingIn(false);
      } else {
        setIsLoggingIn(false);
      }
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoggingIn(false);
    }
  };
  const handleGuestContinue = async () => {
    setIsLoggingIn(true);
    const guestSteps = ["Initializing guest session...", "Setting up workspace...", "Almost ready..."];
    setPrepMessages(guestSteps);
    for (let i = 0; i < guestSteps.length; i++) {
      setLoginStep(i);
      await new Promise((r) => setTimeout(r, 600));
    }
    setLoginSuccess(true);
    setUserEmail("Guest Session");
    setIsTransitioning(true);
    setIsLoggingIn(false);
  };
  const handleLaunchSidepanel = async () => {
    const launchSteps = ["Verifying session...", "Syncing profile...", "Ready!"];
    setPrepMessages(launchSteps);
    setIsLoggingIn(true);
    setLoginStep(0);
    for (let i = 0; i < launchSteps.length; i++) {
      setLoginStep(i);
      await new Promise((r) => setTimeout(r, 600));
    }
    setIsTransitioning(true);
    setIsLoggingIn(false);
    setTimeout(() => {
      openSidePanel(false);
      window.postMessage({ type: "ONE_PROMPT_MSG", action: "SYNC_AUTH" }, "*");
    }, 800);
  };
  const signOut = async () => {
    await signOutFromBackend();
    setLoginSuccess(false);
    setUserEmail(null);
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.remove(["firebase_user_email", "firebase_current_user_id"]);
    }
  };
  const platforms = [
    { name: "ChatGPT", url: "https://chatgpt.com", logo: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" },
    { name: "Claude", url: "https://claude.ai", logo: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Anthropic_logo.svg" },
    { name: "Gemini", url: "https://gemini.google.com", logo: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg" },
    { name: "Perplexity", url: "https://perplexity.ai", logo: "https://www.perplexity.ai/favicon.ico" },
    { name: "DeepSeek", url: "https://chat.deepseek.com", logo: "https://www.deepseek.com/favicon.ico" },
    { name: "Lovable", url: "https://lovable.dev", logo: "https://lovable.dev/favicon.ico" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "welcome-page-root fade-in", children: [
    isTransitioning && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Confetti, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "handoff-overlay fade-in", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "handoff-content", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "handoff-pulse", children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: logoUrl, alt: "Logo", className: "handoff-logo" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "handoff-title", children: "Welcome to 1-prompt" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "handoff-subtitle", children: "Your AI workspace is ready." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "handoff-loader", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "handoff-loader-bar" }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "premium-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "brand-bundle", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: logoUrl, alt: "1-prompt", className: "brand-logo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "brand-name", children: "1-prompt" })
      ] }),
      loginSuccess && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "user-info-pill", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "7", r: "4" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: userEmail }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", className: "secondary-link logout", style: { marginLeft: "12px", marginRight: 0 }, onClick: (e) => {
          e.preventDefault();
          signOut();
        }, children: "Logout" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: `dashboard-grid-layout ${loginSuccess && isPinned ? "full-width" : ""}`, children: [
      !loginSuccess && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "centered-single-card", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "premium-card", style: { maxWidth: "480px", width: "100%" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "card-title", children: "Setup 1-prompt" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "card-desc", children: "Sign in to sync your prompts and pin the extension to your toolbar." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(PinAnimation, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: "24px" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: `google-btn ${isLoggingIn ? "loading" : ""}`,
              style: {
                width: "100%",
                height: "52px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                background: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: "16px"
              },
              onClick: handleGoogleLogin,
              disabled: isLoggingIn,
              children: isLoggingIn ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "login-processing", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "processing-status", children: prepMessages[loginStep] || "Preparing..." }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg", width: "18" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Continue with Google" })
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: handleGuestContinue, style: { background: "none", border: "none", color: "#64748b", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }, children: "Continue as Guest" }) })
        ] })
      ] }) }),
      loginSuccess && !isPinned && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "sidebar-column", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "premium-card pin-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "section-label", style: { color: "#f59e0b" }, children: "PIN REQUIRED" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "card-title", children: "Pin for Quick Access" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "card-desc", children: "Keep 1-prompt visible for the fastest capturing." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(PinAnimation, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setIsPinned(true), className: "confirm-pin-btn", style: {
            width: "100%",
            background: "#f1f5f9",
            border: "none",
            padding: "12px",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 700,
            color: "#475569",
            marginTop: "20px"
          }, children: "I've Pinned It" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "platforms-column", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fade-in", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "section-label", children: "Supported Platforms" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { fontSize: "32px", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: "24px", lineHeight: 1.1 }, children: "Start capturing prompts." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "platforms-grid", children: platforms.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: p.url, target: "_blank", rel: "noopener noreferrer", className: "platform-card", onClick: () => openSidePanel(false), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: p.logo, alt: p.name, className: "platform-logo" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "platform-name", children: p.name })
          ] }, p.name)) })
        ] }) })
      ] }),
      loginSuccess && isPinned && /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "platforms-column", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fade-in", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "section-label", children: "Your Workspace" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { fontSize: "32px", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: "24px", lineHeight: 1.1 }, children: "Select a platform to begin." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "platforms-grid", style: { gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }, children: platforms.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: p.url, target: "_blank", rel: "noopener noreferrer", className: "platform-card", onClick: () => openSidePanel(false), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: p.logo, alt: p.name, className: "platform-logo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "platform-name", children: p.name })
        ] }, p.name)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: "40px", textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "launch-btn-premium",
            style: { maxWidth: "300px", margin: "0 auto" },
            onClick: handleLaunchSidepanel,
            children: "Open Library"
          }
        ) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { style: { marginTop: "auto", padding: "32px 12px 12px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "12px" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "© 2026 1-prompt. In One Click." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: "20px" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", style: { color: "inherit", textDecoration: "none" }, children: "Privacy" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", style: { color: "inherit", textDecoration: "none" }, children: "Terms" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", style: { color: "inherit", textDecoration: "none" }, children: "Support" })
      ] })
    ] })
  ] });
};
ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(WelcomeWebsite, {}) })
);
