import { r as reactExports, a as React, j as jsxRuntimeExports } from "./vendor.js";
import { b as signInWithGoogle } from "./auth.js";
const features = [
  {
    title: "Frictionless Flow",
    text: "Experience the fastest way to generate prompts. We've removed every unnecessary step so you never have to leave your current tab context.",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "60", height: "60", viewBox: "0 0 60 60", fill: "none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "10", cy: "30", r: "3", fill: "#0055ff" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M13 30C25 30 35 15 50 15", stroke: "#ccc", strokeWidth: "2", strokeLinecap: "round" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M13 30C25 30 35 45 50 45", stroke: "#ccc", strokeWidth: "2", strokeLinecap: "round" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "53", cy: "15", r: "2", fill: "#999" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "53", cy: "45", r: "2", fill: "#999" })
    ] })
  },
  {
    title: "Intelligent Context",
    text: "Highlight text on a blog, grab a YouTube transcript, or select code snippets. 1-Prompt automatically formats the context for your LLM.",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "60", height: "60", viewBox: "0 0 60 60", fill: "none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "15", y: "15", width: "30", height: "30", rx: "4", stroke: "#ccc", strokeWidth: "2", strokeDasharray: "4 4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "25", y: "25", width: "10", height: "10", fill: "#e6f0ff" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "45", cy: "15", r: "2", fill: "#0055ff" })
    ] })
  },
  {
    title: "Personal Library",
    text: "Build a library of highly effective instructions. Reuse your best prompts on any content with a single keystroke.",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "60", height: "60", viewBox: "0 0 60 60", fill: "none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "18", y: "12", width: "24", height: "36", rx: "2", stroke: "#ccc", strokeWidth: "2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M24 20H36", stroke: "#eee", strokeWidth: "2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M24 26H36", stroke: "#eee", strokeWidth: "2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M24 32H32", stroke: "#eee", strokeWidth: "2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M45 18L35 28", stroke: "#0055ff", strokeWidth: "2" })
    ] })
  },
  {
    title: "Model-to-Model",
    text: "Seamlessly transport your prompts between GPT-4, Claude, and Gemini. Break down the silos between AI models.",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "60", height: "60", viewBox: "0 0 60 60", fill: "none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "30", cy: "30", r: "18", stroke: "#ccc", strokeWidth: "2", strokeDasharray: "4 4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "30", r: "3", fill: "#0055ff" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "48", cy: "30", r: "3", fill: "#999" })
    ] })
  },
  {
    title: "Seamless Continuity",
    text: "Pick up exactly where you left off. 1-Prompt remembers your context so you don't have to re-explain yourself.",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "60", height: "60", viewBox: "0 0 60 60", fill: "none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "12", y: "22", width: "16", height: "16", rx: "2", stroke: "#ccc", strokeWidth: "2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "32", y: "22", width: "16", height: "16", rx: "2", stroke: "#0055ff", strokeWidth: "2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M28 30H32", stroke: "#999", strokeWidth: "2" })
    ] })
  },
  {
    title: "Preserved Intent",
    text: "Complex instructions shouldn't break when you change environments. We ensure your carefully crafted prompts remain intact.",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "60", height: "60", viewBox: "0 0 60 60", fill: "none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "15", y: "10", width: "30", height: "40", rx: "3", fill: "#f9f9f9", stroke: "#eee", strokeWidth: "2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M22 20H38", stroke: "#ddd", strokeWidth: "2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M22 28H38", stroke: "#ddd", strokeWidth: "2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M40 45L28 45L22 38", stroke: "#0055ff", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })
    ] })
  }
];
const Welcome = () => {
  const [isLoggingIn, setIsLoggingIn] = reactExports.useState(false);
  const [loginSuccess, setLoginSuccess] = reactExports.useState(false);
  const [isPinned, setIsPinned] = reactExports.useState(false);
  const [isInstalled, setIsInstalled] = reactExports.useState(false);
  const [activeSection, setActiveSection] = reactExports.useState("landing");
  const [currentFeature, setCurrentFeature] = reactExports.useState(0);
  const [animClass, setAnimClass] = reactExports.useState("fade-init");
  const timerRef = React.useRef(null);
  const startAutoPlay = (delay) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setAnimClass("enter-right");
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, delay);
  };
  reactExports.useEffect(() => {
    if (activeSection === "landing") {
      startAutoPlay(4e3);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSection]);
  const handleManualNav = (direction) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (typeof direction === "number") {
      setAnimClass(direction > currentFeature ? "enter-right" : "enter-left");
      setCurrentFeature(direction);
    } else {
      setAnimClass(direction === "next" ? "enter-right" : "enter-left");
      setCurrentFeature((prev) => (prev + (direction === "next" ? 1 : -1) + features.length) % features.length);
    }
    startAutoPlay(12e3);
  };
  reactExports.useEffect(() => {
    const handleRouting = () => {
      const path = window.location.pathname;
      if (path.includes("uninstall")) {
        setActiveSection("uninstall");
      } else if (path.includes("install")) {
        setActiveSection("setup");
      } else {
        setActiveSection("landing");
      }
    };
    handleRouting();
    window.addEventListener("popstate", handleRouting);
    const checkPinnedStatus = async () => {
      if (chrome.action && chrome.action.getUserSettings) {
        const settings = await chrome.action.getUserSettings();
        setIsPinned(settings.isOnToolbar);
      }
    };
    checkPinnedStatus();
    const interval = setInterval(checkPinnedStatus, 1e3);
    return () => {
      clearInterval(interval);
      window.removeEventListener("popstate", handleRouting);
    };
  }, []);
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };
  const [isScrolled, setIsScrolled] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const handleScroll = () => {
      const container2 = document.querySelector(".welcome-full-container");
      if (container2) {
        setIsScrolled(container2.scrollTop > 50);
      }
    };
    const container = document.querySelector(".welcome-full-container");
    if (container) {
      container.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);
  const navigate = (path) => {
    const isExtension = window.location.protocol === "chrome-extension:";
    if (isExtension) {
      if (path === "/" || path === "") {
        setActiveSection("landing");
      } else if (path.includes("install")) {
        setActiveSection("setup");
      } else if (path.includes("uninstall")) {
        setActiveSection("uninstall");
      }
      return;
    }
    window.history.pushState({}, "", path);
    const event = new PopStateEvent("popstate");
    window.dispatchEvent(event);
  };
  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await signInWithGoogle();
      setIsLoggingIn(false);
      setLoginSuccess(true);
      openSidePanel(false);
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoggingIn(false);
    }
  };
  const handleGuestContinue = () => {
    if (window.location.pathname.includes("sidepanel")) {
      window.location.href = "index.html";
    } else {
      openSidePanel(true);
    }
  };
  const openSidePanel = async (closeWindow = true) => {
    try {
      if (window.location.pathname.includes("sidepanel")) {
        window.location.href = "index.html";
        return;
      }
      const currentWindow = await chrome.windows.getCurrent();
      if (chrome.sidePanel && chrome.sidePanel.open && currentWindow.id) {
        await chrome.sidePanel.open({ windowId: currentWindow.id });
        if (closeWindow) window.close();
      } else {
        chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" });
        if (closeWindow) setTimeout(() => window.close(), 100);
      }
    } catch (e) {
      console.log("Could not open sidepanel automatically:", e);
    }
  };
  reactExports.useEffect(() => {
    const detectExtension = () => {
      const isPolyfill = window.is1PromptPolyfill === true;
      const hasExtensionAPI = !!(window.chrome && chrome.runtime && chrome.runtime.id) && !isPolyfill;
      const hasMarkerAttribute = document.documentElement.hasAttribute("data-1prompt-installed");
      const installed = hasExtensionAPI || hasMarkerAttribute;
      setIsInstalled(!!installed);
      return installed;
    };
    detectExtension();
    const pollTimer = setInterval(() => {
      if (detectExtension()) clearInterval(pollTimer);
    }, 500);
    setTimeout(() => clearInterval(pollTimer), 5e3);
    if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: "CHECK_SIDEPANEL_OPEN" }, (response) => {
        if (response && response.isOpen && window.location.pathname.includes("install")) {
          setActiveSection("dashboard");
        }
      });
      const messageListener = (message) => {
        if (message.action === "SIDEPANEL_OPENED" && window.location.pathname.includes("install")) {
          setActiveSection("dashboard");
        }
      };
      chrome.runtime.onMessage.addListener(messageListener);
      return () => {
        chrome.runtime.onMessage.removeListener(messageListener);
        clearInterval(pollTimer);
      };
    }
    return () => clearInterval(pollTimer);
  }, []);
  reactExports.useEffect(() => {
    if (!isInstalled) return;
    if (!window.location.pathname.includes("install")) return;
    if (loginSuccess && isPinned) {
      setActiveSection("dashboard");
    } else {
      setActiveSection("setup");
    }
  }, [loginSuccess, isPinned, isInstalled]);
  const showFinalStage = loginSuccess && isPinned;
  const isLandingPage = ["landing", "uninstall", "pricing", "contact"].includes(activeSection);
  const feature = features[currentFeature];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: isLandingPage ? "welcome-full-container" : `welcome-container ${showFinalStage ? "final-stage" : ""}`, children: activeSection === "uninstall" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "landing-section fade-in", style: { textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "landing-content", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "brand-header center", style: { justifyContent: "center", marginBottom: "24px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: "./icons/logo-new.png", alt: "1-prompt Logo", style: { width: "64px", height: "64px" } }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "landing-headline", style: { fontSize: "2.5rem", marginBottom: "16px" }, children: "Sorry to see you go." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "landing-subheadline", style: { margin: "0 auto 32px" }, children: "We're constantly improving. If you have a moment, let us know how we can do better." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "landing-cta-group", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "google-btn", onClick: () => navigate("/"), children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Return to Home" }) }) })
  ] }) }) : ["landing", "pricing", "contact"].includes(activeSection) ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "welcome-new-layout fade-in", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: `nav-new ${isScrolled ? "scrolled" : ""}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "nav-inner-pill", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "nav-left", onClick: () => scrollToSection("home-section"), style: { cursor: "pointer" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: "./icons/logo-new.png", alt: "1-prompt Logo", className: "nav-logo-img" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "nav-right", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", className: "nav-link", onClick: (e) => {
          e.preventDefault();
          scrollToSection("home-section");
        }, children: "Home" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", className: "nav-link", onClick: (e) => {
          e.preventDefault();
          scrollToSection("pricing-section");
        }, children: "Pricing" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", className: "nav-link", onClick: (e) => {
          e.preventDefault();
          scrollToSection("contact-section");
        }, children: "Contact" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", className: "btn-demo", onClick: (e) => {
          e.preventDefault();
          setActiveSection("setup");
        }, children: "Book a Demo" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { id: "home-section", className: "section-wrapper", style: { minHeight: "85vh", display: "flex", alignItems: "center", scrollMarginTop: "80px", marginTop: "-20px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "hero-container-new", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hero-left-new", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "frictionless-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `feature-content ${animClass}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "placeholder-img", children: feature.icon }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: feature.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: feature.text })
        ] }, currentFeature),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-nav-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "nav-arrow", onClick: () => handleManualNav("prev"), children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M15 18l-6-6 6-6" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "carousel-indicators", children: features.map((_, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `indicator ${index === currentFeature ? "active" : ""}`,
              onClick: () => handleManualNav(index),
              style: { cursor: "pointer" }
            },
            index
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "nav-arrow", onClick: () => handleManualNav("next"), children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M9 18l6-6-6-6" }) }) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hero-right-new fade-in-up", style: { animationDelay: "0.2s" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "hero-title-new", children: "1Prompt : Capture & Compile in One Click" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "hero-subtitle-new", children: "Eliminate repetitive manual inputs. Preserve intent across ChatGPT, Claude, and Gemini instantly." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cta-group-new", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              className: "btn-chrome-new",
              onClick: () => {
                if (isInstalled) {
                  navigate("/install");
                } else {
                  window.open("https://chromewebstore.google.com/detail/1prompt/pckiikjlgoimpnimojpfpnfndilaogol", "_blank");
                }
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: "24px", lineHeight: "1" }, children: "+" }),
                "Add to chrome"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "no-cc-tag", children: "No credit card Required | free to start" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "12px", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px", fontWeight: "500" }, children: "Supported platforms" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "platforms-list-new", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "platform-item", children: "Gemini" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "platform-item", children: "Chatgpt" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "platform-item", children: "Perplexity" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "platform-item", children: "Lovable" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "platform-item", children: "figma" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "platform-item", children: "emergent" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { alignSelf: "center", color: "#666" }, children: "and more" })
          ] })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { id: "pricing-section", className: "section-wrapper", style: { minHeight: "100vh", display: "flex", alignItems: "center", background: "#f9fafb", scrollMarginTop: "80px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pricing-container fade-in-up", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pricing-header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "section-title", children: "Pricing tailored to your workflow" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "section-subtitle", children: "Scale from casual research to professional automation." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pricing-grid", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pricing-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tier-name", children: "Basic" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "price", children: [
            "$0",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "/mo" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "features-list", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "10 Daily Captures" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Local Workspace" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Direct Clipboard Export" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Instant Access" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "tier-btn", onClick: () => setActiveSection("setup"), children: "Book a Demo" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pricing-card popular", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "popular-tag", children: "Early Adopter Offer" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tier-name", children: "Go" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "price", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { textDecoration: "line-through", fontSize: "18px", color: "#888", marginRight: "8px" }, children: "$1" }),
            "$0",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "/mo" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "10px", color: "#0055ff", marginBottom: "15px", fontWeight: "700", textTransform: "uppercase" }, children: "Free until June 2026" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "features-list", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Unlimited Capture" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "10 AI Orchestrations / day" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Cloud Synchronization" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Personal Library" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "tier-btn primary", onClick: () => setActiveSection("setup"), children: "Claim Free Access" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pricing-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tier-name", children: "Pro" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "price", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { textDecoration: "line-through", fontSize: "18px", color: "#888", marginRight: "8px" }, children: "$9" }),
            "$5",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "/mo" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "10px", color: "#666", marginBottom: "15px", textTransform: "uppercase" }, children: "Introductory rate" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "features-list", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "999 Orchestrations / mo" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Slack Automations" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Webhook Integration" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Priority Support" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "tier-btn", onClick: () => setActiveSection("setup"), children: "Unlock Pro" })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { id: "contact-section", className: "section-wrapper footer-section", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "footer-top-text", children: "Questions or feedback? We'd love to hear how 1-prompt is helping your workflow." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "contact-main", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "contact-title", children: "Get in touch" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "email-pill", children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "mailto:hello@1-prompt.in", children: "hello@1-prompt.in" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "footer-bottom", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "footer-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "footer-left", children: "© 2026 Cursor Layout LLP. All rights reserved." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "footer-right", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", className: "footer-link", onClick: (e) => {
              e.preventDefault();
              scrollToSection("home-section");
            }, children: "Docs" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", className: "footer-link", onClick: (e) => {
              e.preventDefault();
              scrollToSection("pricing-section");
            }, children: "Pricing" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "#", className: "footer-link", onClick: (e) => {
              e.preventDefault();
              scrollToSection("contact-section");
            }, children: "Contact" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "footer-address", children: "Cursor Layout LLP · Plot 58 Hastinapuram, Hyderabad, Telangana, India, 500079" })
      ] })
    ] })
  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `setup-container ${activeSection !== "dashboard" ? "expanded-mode" : "sidebar-mode"}`, onClick: () => activeSection === "dashboard" && setActiveSection("setup"), children: activeSection !== "dashboard" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setup-wrapper", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-section", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { onClick: () => navigate("/"), style: { cursor: "pointer", opacity: 0.6, fontSize: "14px", marginBottom: "20px", display: "inline-block" }, children: "← Back to home" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: "24px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: "./icons/logo-new.png", alt: "1-prompt Logo", style: { width: "48px", height: "48px" } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "headline", children: [
          "1 prompt, ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
          "1 click away."
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "subheadline", children: "Sign in to sync your prompts across devices and access your library from any browser." }),
        loginSuccess ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "success-message", children: [
          "✓ Signed in successfully ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "google-btn success", style: { marginTop: "20px" }, onClick: () => openSidePanel(true), children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Open Side Panel" }) })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "google-btn", onClick: handleGoogleLogin, disabled: isLoggingIn, children: isLoggingIn ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Signing in..." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg", alt: "Google" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Continue with Google" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divider", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "OR" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "guest-link", onClick: handleGuestContinue, children: "Continue without signing in" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "onboarding-section", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `badge ${isPinned ? "success" : ""}`, children: isPinned ? "✅ SET UP COMPLETE" : "RECOMMENDED" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "onboarding-title", children: isPinned ? "1-prompt is pinned!" : "Pin to Toolbar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "onboarding-desc", children: isPinned ? "You are all set. Click the icon to start capturing." : "Keep 1-prompt within reach for the best capturing experience." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "visual-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animated-cursor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "step-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "step-num", children: "1" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "step-content", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "step-title", children: "Click the extensions icon" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mock-browser-toolbar", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mock-url-bar" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "puzzle-icon target-puzzle", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H5c-1.1 0-2 .9-2 2v13.5c0 1.1.9 2 2 2h13.5c1.1 0 2-.9 2-2V14.5a2.5 2.5 0 0 0 0-3.5z" }) })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "step-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "step-num", children: "2" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "step-content", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "step-title", children: "Pin 1-prompt" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mock-menu", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "menu-item highlight", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "app-icon-small" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "app-name-small", children: "1-prompt" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "pin-icon target-pin", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" }) })
              ] }) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "done-btn", style: { marginTop: "24px" }, onClick: (e) => {
          e.stopPropagation();
          setIsPinned(true);
        }, children: "I have pinned it" })
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sidebar-content", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-label", children: "profile" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-icon user-active" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `dashboard-section ${activeSection === "dashboard" ? "expanded-mode" : "sidebar-mode"}`, onClick: () => activeSection !== "dashboard" && setActiveSection("dashboard"), children: activeSection === "dashboard" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dashboard-content fade-in", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "dashboard-title", children: "1-prompt" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dashboard-grid", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid-card", onClick: (e) => {
          e.stopPropagation();
          window.open("https://chatgpt.com", "_blank");
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg", alt: "ChatGPT", className: "grid-logo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid-label", children: "ChatGPT" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid-card", onClick: (e) => {
          e.stopPropagation();
          window.open("https://claude.ai", "_blank");
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Anthropic_logo.svg", alt: "Claude", className: "grid-logo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid-label", children: "Claude" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid-card", onClick: (e) => {
          e.stopPropagation();
          window.open("https://gemini.google.com", "_blank");
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg", alt: "Gemini", className: "grid-logo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid-label", children: "Gemini" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid-card", onClick: (e) => {
          e.stopPropagation();
          window.open("https://perplexity.ai", "_blank");
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: "https://www.perplexity.ai/favicon.ico", alt: "Perplexity", className: "grid-logo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid-label", children: "Perplexity" })
        ] })
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sidebar-content", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-label", children: "platforms" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-icon grid-active" })
    ] }) })
  ] }) });
};
export {
  Welcome as W
};
