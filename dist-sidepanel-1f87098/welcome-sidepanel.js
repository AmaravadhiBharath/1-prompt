import { r as reactExports, j as jsxRuntimeExports, R as ReactDOM, a as React } from "./vendor.js";
import { _ as __vitePreload, b as signInWithGoogleWeb } from "./firebase.js";
import { c as getStoredUser, s as subscribeToAuthChanges, a as signOut, b as signInWithGoogle } from "./auth.js";
/* empty css       */
/* empty css      */
const features = [
  {
    title: "Frictionless Flow",
    text: "Experience the fastest way to generate prompts. We've removed every unnecessary step so you never have to leave your current tab context.",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "60", height: "60", viewBox: "0 0 60 60", fill: "none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "10", cy: "30", r: "3", fill: "#0055ff" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "path",
        {
          d: "M13 30C25 30 35 15 50 15",
          stroke: "#ccc",
          strokeWidth: "2",
          strokeLinecap: "round"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "path",
        {
          d: "M13 30C25 30 35 45 50 45",
          stroke: "#ccc",
          strokeWidth: "2",
          strokeLinecap: "round"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "53", cy: "15", r: "2", fill: "#999" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "53", cy: "45", r: "2", fill: "#999" })
    ] })
  },
  {
    title: "Intelligent Context",
    text: "Highlight text on a blog, grab a YouTube transcript, or select code snippets. 1-Prompt automatically formats the context for your LLM.",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "60", height: "60", viewBox: "0 0 60 60", fill: "none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "rect",
        {
          x: "15",
          y: "15",
          width: "30",
          height: "30",
          rx: "4",
          stroke: "#ccc",
          strokeWidth: "2",
          strokeDasharray: "4 4"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: "25", y: "25", width: "10", height: "10", fill: "#e6f0ff" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "45", cy: "15", r: "2", fill: "#0055ff" })
    ] })
  },
  {
    title: "Personal Library",
    text: "Build a library of highly effective instructions. Reuse your best prompts on any content with a single keystroke.",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "60", height: "60", viewBox: "0 0 60 60", fill: "none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "rect",
        {
          x: "18",
          y: "12",
          width: "24",
          height: "36",
          rx: "2",
          stroke: "#ccc",
          strokeWidth: "2"
        }
      ),
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
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "circle",
        {
          cx: "30",
          cy: "30",
          r: "18",
          stroke: "#ccc",
          strokeWidth: "2",
          strokeDasharray: "4 4"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "12", cy: "30", r: "3", fill: "#0055ff" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "48", cy: "30", r: "3", fill: "#999" })
    ] })
  },
  {
    title: "Seamless Continuity",
    text: "Pick up exactly where you left off. 1-Prompt remembers your context so you don't have to re-explain yourself.",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "60", height: "60", viewBox: "0 0 60 60", fill: "none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "rect",
        {
          x: "12",
          y: "22",
          width: "16",
          height: "16",
          rx: "2",
          stroke: "#ccc",
          strokeWidth: "2"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "rect",
        {
          x: "32",
          y: "22",
          width: "16",
          height: "16",
          rx: "2",
          stroke: "#0055ff",
          strokeWidth: "2"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M28 30H32", stroke: "#999", strokeWidth: "2" })
    ] })
  },
  {
    title: "Preserved Intent",
    text: "Complex instructions shouldn't break when you change environments. We ensure your carefully crafted prompts remain intact.",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "60", height: "60", viewBox: "0 0 60 60", fill: "none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "rect",
        {
          x: "15",
          y: "10",
          width: "30",
          height: "40",
          rx: "3",
          fill: "#f9f9f9",
          stroke: "#eee",
          strokeWidth: "2"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M22 20H38", stroke: "#ddd", strokeWidth: "2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M22 28H38", stroke: "#ddd", strokeWidth: "2" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "path",
        {
          d: "M40 45L28 45L22 38",
          stroke: "#0055ff",
          strokeWidth: "2",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }
      )
    ] })
  }
];
const Welcome = ({ onComplete }) => {
  const [isLoggingIn, setIsLoggingIn] = reactExports.useState(false);
  const [loginSuccess, setLoginSuccess] = reactExports.useState(false);
  const [userEmail, setUserEmail] = reactExports.useState(null);
  const logoUrl = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL("icons/logo-new.png") : "/icons/logo-new.png";
  const [isPinned, setIsPinned] = reactExports.useState(false);
  const [activeSection, setActiveSection] = reactExports.useState("landing");
  const [currentFeature, setCurrentFeature] = reactExports.useState(0);
  const [animClass, setAnimClass] = reactExports.useState("fade-init");
  const timerRef = reactExports.useRef(null);
  const [waitlistEmail, setWaitlistEmail] = reactExports.useState("");
  const [waitlistStatus, setWaitlistStatus] = reactExports.useState("idle");
  const [emailError, setEmailError] = reactExports.useState("");
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
      setCurrentFeature(
        (prev) => (prev + (direction === "next" ? 1 : -1) + features.length) % features.length
      );
    }
    startAutoPlay(12e3);
  };
  reactExports.useEffect(() => {
    const handleRouting = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const combined = path + hash;
      if (combined.includes("can't-say-goodbye")) {
        setActiveSection("uninstall");
      } else if (combined.includes("install")) {
        setActiveSection("setup");
      } else if (combined.includes("supported-sites")) {
        setActiveSection("dashboard");
      } else if (combined.includes("home")) {
        setActiveSection("landing");
      } else {
        setActiveSection("landing");
      }
    };
    handleRouting();
    window.addEventListener("popstate", handleRouting);
    getStoredUser().then((user) => {
      if (user) {
        setLoginSuccess(true);
        setUserEmail(user.email);
      }
    });
    const unsubscribeAuth = subscribeToAuthChanges((user) => {
      setLoginSuccess(!!user);
      setUserEmail(user?.email || null);
    });
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
      unsubscribeAuth();
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
      if (path === "/" || path === "" || path.includes("home")) {
        setActiveSection("landing");
        window.location.hash = "home";
      } else if (path.includes("install")) {
        setActiveSection("setup");
        window.location.hash = "install";
      } else if (path.includes("supported-sites")) {
        setActiveSection("dashboard");
        window.location.hash = "supported-sites";
      } else if (path.includes("can't-say-goodbye")) {
        setActiveSection("uninstall");
        window.location.hash = "can't-say-goodbye";
      }
      return;
    }
    window.history.pushState({}, "", path);
    const event = new PopStateEvent("popstate");
    window.dispatchEvent(event);
  };
  const isHomePath = window.location.pathname.includes("home") || window.location.hash.includes("home");
  const handleGoogleLogin = async () => {
    const isExtension = window.location.protocol === "chrome-extension:";
    try {
      setIsLoggingIn(true);
      if (!isExtension) {
        try {
          const res = await signInWithGoogleWeb();
          if (res && res.idToken) {
            setLoginSuccess(true);
            setUserEmail(res.user?.email || null);
          } else {
            setIsLoggingIn(false);
            return;
          }
        } catch (e) {
          console.error("Web login failed:", e);
          alert("Web login failed. Check console for details.");
          setIsLoggingIn(false);
          return;
        }
      } else {
        const user = await signInWithGoogle();
        setLoginSuccess(true);
        setUserEmail(user.email);
      }
      setIsLoggingIn(false);
      if (!onComplete) openSidePanel(false);
      if (onComplete) {
        onComplete();
      } else {
        navigate("/supported-sites");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoggingIn(false);
    }
  };
  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    if (!waitlistEmail || !waitlistEmail.includes("@")) {
      setEmailError("Please enter a valid email");
      return;
    }
    setEmailError("");
    setWaitlistStatus("submitting");
    try {
      const { config } = await __vitePreload(async () => {
        const { config: config2 } = await import("./firebase.js").then((n) => n.i);
        return { config: config2 };
      }, true ? [] : void 0, import.meta.url);
      const response = await fetch(`${config.backend.url}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail })
      });
      if (response.ok) {
        setWaitlistStatus("joined");
      } else {
        throw new Error("Failed to join");
      }
    } catch (err) {
      console.error("Waitlist error:", err);
      setEmailError("Something went wrong. Please try again.");
      setWaitlistStatus("idle");
    }
  };
  const handleGuestContinue = () => {
    if (!onComplete) openSidePanel(false);
    if (onComplete) {
      onComplete();
    } else if (window.location.pathname.includes("sidepanel")) {
      window.location.href = "index.html";
    } else {
      navigate("/supported-sites");
    }
  };
  const openSidePanel = async (closeWindow = true) => {
    try {
      if (window.location.pathname.includes("sidepanel")) {
        window.location.href = "index.html";
        return;
      }
      const hasExtension = typeof chrome !== "undefined" && chrome.runtime;
      if (!hasExtension) return;
      chrome.windows.getCurrent((currentWindow) => {
        if (chrome.sidePanel && chrome.sidePanel.open && currentWindow.id) {
          chrome.sidePanel.open({ windowId: currentWindow.id });
        } else {
          chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" });
        }
        if (closeWindow) setTimeout(() => window.close(), 100);
      });
    } catch (e) {
      console.log("Could not open sidepanel automatically:", e);
    }
  };
  reactExports.useEffect(() => {
    const detectExtension = () => {
      const isPolyfill = window.is1PromptPolyfill === true;
      const hasExtensionAPI = !!(window.chrome && chrome.runtime && chrome.runtime.id) && !isPolyfill;
      const hasMarkerAttribute = document.documentElement.hasAttribute(
        "data-1-prompt-installed"
      );
      const installed = hasExtensionAPI || hasMarkerAttribute;
      if (installed && activeSection === "landing" && !isHomePath) {
        navigate("/install");
      }
      return installed;
    };
    detectExtension();
    const pollTimer = setInterval(() => {
      if (detectExtension()) clearInterval(pollTimer);
    }, 500);
    setTimeout(() => clearInterval(pollTimer), 5e3);
    if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage(
        { action: "CHECK_SIDEPANEL_OPEN" },
        (response) => {
          if (response && response.isOpen && window.location.pathname.includes("install")) {
            navigate("/supported-sites");
          }
        }
      );
      const messageListener = (message) => {
        if (message.action === "SIDEPANEL_OPENED" && window.location.pathname.includes("install")) {
          navigate("/supported-sites");
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
  const showFinalStage = loginSuccess && isPinned;
  const isLandingPage = ["landing", "uninstall", "pricing", "contact"].includes(
    activeSection
  );
  const feature = features[currentFeature];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: isLandingPage ? "welcome-full-container" : `welcome-container ${showFinalStage ? "final-stage" : ""}`,
      children: [
        !isLandingPage && !onComplete && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            href: "#",
            onClick: (e) => {
              e.preventDefault();
              navigate("/home");
            },
            style: {
              position: "fixed",
              top: "32px",
              left: "32px",
              zIndex: 999999,
              color: "#999",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              letterSpacing: "0.02em",
              opacity: 0.8,
              transition: "opacity 0.2s"
            },
            onMouseEnter: (e) => e.currentTarget.style.opacity = "1",
            onMouseLeave: (e) => e.currentTarget.style.opacity = "0.8",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "svg",
                {
                  width: "16",
                  height: "16",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2.5",
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "9 22 9 12 15 12 15 22" })
                  ]
                }
              ),
              "HOME"
            ]
          }
        ),
        activeSection === "uninstall" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "landing-section fade-in",
            style: { textAlign: "center" },
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "landing-content", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "brand-header center",
                  style: { justifyContent: "center", marginBottom: "24px" },
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "img",
                    {
                      src: logoUrl,
                      alt: "1-prompt Logo",
                      style: { width: "64px", height: "64px" }
                    }
                  )
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "h1",
                {
                  className: "landing-headline",
                  style: { fontSize: "2.5rem", marginBottom: "16px" },
                  children: "Sorry to see you go."
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "p",
                {
                  className: "landing-subheadline",
                  style: { margin: "0 auto 32px" },
                  children: "We're constantly improving. If you have a moment, let us know how we can do better."
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "landing-cta-group", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "google-btn", onClick: () => navigate("/home"), children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Return to Home" }) }) })
            ] })
          }
        ) : ["landing", "pricing", "contact"].includes(activeSection) ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "welcome-new-layout fade-in", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: `nav-new ${isScrolled ? "scrolled" : ""}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "nav-inner-pill", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "nav-left",
                onClick: () => scrollToSection("home-section"),
                style: { cursor: "pointer" },
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: logoUrl,
                    alt: "1-prompt Logo",
                    className: "nav-logo-img"
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "nav-right", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "a",
                {
                  href: "#",
                  className: "nav-link",
                  onClick: (e) => {
                    e.preventDefault();
                    scrollToSection("home-section");
                  },
                  children: "Home"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "a",
                {
                  href: "#",
                  className: "nav-link",
                  onClick: (e) => {
                    e.preventDefault();
                    scrollToSection("pricing-section");
                  },
                  children: "Pricing"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "a",
                {
                  href: "#",
                  className: "nav-link",
                  onClick: (e) => {
                    e.preventDefault();
                    scrollToSection("contact-section");
                  },
                  children: "Contact"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "a",
                {
                  href: "#",
                  className: "btn-demo",
                  onClick: (e) => {
                    e.preventDefault();
                    navigate("/install");
                  },
                  children: "Get Started"
                }
              )
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              id: "home-section",
              className: "section-wrapper",
              style: {
                minHeight: "85vh",
                display: "flex",
                alignItems: "center",
                scrollMarginTop: "80px",
                marginTop: "-20px"
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "hero-container-new", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hero-left-new", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "frictionless-card", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: `feature-content ${animClass}`,
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "placeholder-img", children: feature.icon }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: feature.title }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: feature.text })
                      ]
                    },
                    currentFeature
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-nav-row", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        className: "nav-arrow",
                        onClick: () => handleManualNav("prev"),
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "svg",
                          {
                            width: "16",
                            height: "16",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M15 18l-6-6 6-6" })
                          }
                        )
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "carousel-indicators", children: features.map((_, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        className: `indicator ${index === currentFeature ? "active" : ""}`,
                        onClick: () => handleManualNav(index),
                        style: { cursor: "pointer" }
                      },
                      index
                    )) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        className: "nav-arrow",
                        onClick: () => handleManualNav("next"),
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "svg",
                          {
                            width: "16",
                            height: "16",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M9 18l6-6-6-6" })
                          }
                        )
                      }
                    )
                  ] })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "hero-right-new fade-in-up",
                    style: { animationDelay: "0.2s" },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "hero-title-new", children: "1-prompt : Capture & Compile in One Click" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "hero-subtitle-new", children: "Eliminate repetitive manual inputs. Preserve intent across ChatGPT, Claude, and Gemini instantly." }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cta-group-new", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "button",
                          {
                            className: "btn-chrome-new",
                            onClick: () => {
                              window.open(
                                "https://chromewebstore.google.com/detail/1-prompt/opdaaehibnkaabelcjhoefnfmebciekj",
                                "_blank"
                              );
                            },
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: "24px", lineHeight: "1" }, children: "+" }),
                              "Add to chrome"
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "no-cc-tag", children: "No credit card Required | free to start" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "div",
                          {
                            style: {
                              fontSize: "12px",
                              color: "#888",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              marginBottom: "12px",
                              fontWeight: "500"
                            },
                            children: "Supported platforms"
                          }
                        ),
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
                    ]
                  }
                )
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              id: "pricing-section",
              className: "section-wrapper",
              style: {
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                background: "#f9fafb",
                scrollMarginTop: "80px"
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pricing-container fade-in-up", children: [
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
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Unlimited" }),
                        " Captures"
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "10 Daily AI Compiles" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Instant Access" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Community Support" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        className: "tier-btn",
                        onClick: () => navigate("/install"),
                        children: "Get Started"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pricing-card popular", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "popular-tag", children: "Early Adopter Offer" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tier-name", children: "Go" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "price", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "span",
                        {
                          style: {
                            textDecoration: "line-through",
                            fontSize: "18px",
                            color: "#888",
                            marginRight: "8px"
                          },
                          children: "$5"
                        }
                      ),
                      "$0",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "/mo" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        style: {
                          fontSize: "10px",
                          color: "#0055ff",
                          marginBottom: "15px",
                          fontWeight: "700",
                          textTransform: "uppercase"
                        },
                        children: "Free for early users"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "features-list", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Unlimited" }),
                        " Captures"
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Unlimited" }),
                        " AI Compiles*"
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Cloud History Sync" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Permanent Pinning" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "10px", color: "#888", marginBottom: "16px", fontStyle: "italic" }, children: "*10 High-speed (Gemini), then Llama 3" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        className: "tier-btn primary",
                        onClick: () => navigate("/install"),
                        children: "Join Go Free"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pricing-card coming-soon", style: { opacity: 0.8 }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tier-name", children: "Pro" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "price", children: [
                      "TBA",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "/mo" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        style: {
                          fontSize: "10px",
                          color: "#666",
                          marginBottom: "15px",
                          textTransform: "uppercase",
                          fontWeight: "bold"
                        },
                        children: "Coming Soon"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "features-list", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Unlimited High-speed AI" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Advanced AI Models" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "API Access / Webhooks" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Figma & Slack Sync" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        className: "tier-btn",
                        onClick: () => scrollToSection("contact-section"),
                        style: { background: "#f3f4f6", color: "#374151" },
                        children: "Details"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: "20px", borderTop: "1px solid #f3f4f6", paddingTop: "20px" }, children: waitlistStatus === "joined" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "var(--kb-primary-blue)", fontWeight: "600", textAlign: "center", padding: "10px", background: "#eef2ff", borderRadius: "8px" }, children: "🎉 Successfully Joined!" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleWaitlistSubmit, style: { display: "flex", flexDirection: "column", gap: "10px" }, children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          type: "email",
                          placeholder: "Your email address",
                          value: waitlistEmail,
                          onChange: (e) => setWaitlistEmail(e.target.value),
                          style: {
                            padding: "12px",
                            borderRadius: "8px",
                            border: emailError ? "1px solid #ef4444" : "1px solid #e5e7eb",
                            fontSize: "14px",
                            outline: "none"
                          }
                        }
                      ),
                      emailError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "11px", color: "#ef4444" }, children: emailError }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "button",
                        {
                          type: "submit",
                          className: "tier-btn",
                          disabled: waitlistStatus === "submitting",
                          style: {
                            width: "100%",
                            background: "var(--kb-primary-blue)",
                            color: "white"
                          },
                          children: waitlistStatus === "submitting" ? "Joining..." : "Join Waitlist"
                        }
                      )
                    ] }) })
                  ] })
                ] })
              ] })
            }
          ),
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
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "a",
                    {
                      href: "#",
                      className: "footer-link",
                      onClick: (e) => {
                        e.preventDefault();
                        scrollToSection("home-section");
                      },
                      children: "Docs"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "a",
                    {
                      href: "#",
                      className: "footer-link",
                      onClick: (e) => {
                        e.preventDefault();
                        scrollToSection("pricing-section");
                      },
                      children: "Pricing"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "a",
                    {
                      href: "#",
                      className: "footer-link",
                      onClick: (e) => {
                        e.preventDefault();
                        scrollToSection("contact-section");
                      },
                      children: "Contact"
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "footer-address", children: "Cursor Layout LLP · Plot 58 Hastinapuram, Hyderabad, Telangana, India, 500079" })
            ] })
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `setup-container ${activeSection !== "dashboard" ? "expanded-mode" : "sidebar-mode"}`,
              onClick: () => activeSection === "dashboard" && navigate("/install"),
              children: activeSection !== "dashboard" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setup-wrapper fade-in", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-section", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: "24px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "img",
                    {
                      src: logoUrl,
                      alt: "1-prompt Logo",
                      style: { width: "48px", height: "48px" }
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "headline", children: [
                    "1 prompt, ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
                    "1 click away."
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "subheadline", children: "Sign in to sync your prompts across devices and access your library from any browser." }),
                  loginSuccess ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "success-message", style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", background: "none", padding: "0", borderRadius: "0", border: "none", width: "100%", marginBottom: "20px" }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "google-btn success", style: { cursor: "default", opacity: 1, border: "1px solid #10b981", background: "#f0fdf4" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "center" }, children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: "14px", fontWeight: 500, color: "#065f46" }, children: [
                        "Signed in: ",
                        userEmail
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "#10b981", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: "20 6 9 17 4 12" }) })
                    ] }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: "16px", marginTop: "4px" }, children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "a",
                        {
                          href: "#",
                          onClick: (e) => {
                            e.preventDefault();
                            signOut();
                          },
                          style: {
                            color: "#ef4444",
                            textDecoration: "none",
                            borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
                            fontSize: "13px",
                            fontWeight: 500
                          },
                          children: "Logout"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "a",
                        {
                          href: "#",
                          onClick: (e) => {
                            e.preventDefault();
                            navigate("/home");
                            setTimeout(() => scrollToSection("contact-section"), 100);
                          },
                          style: {
                            color: "#666",
                            textDecoration: "none",
                            borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
                            fontSize: "13px",
                            fontWeight: 500
                          },
                          children: "Contact"
                        }
                      )
                    ] })
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        className: "google-btn",
                        onClick: handleGoogleLogin,
                        disabled: isLoggingIn,
                        children: isLoggingIn ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Signing in..." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "img",
                            {
                              src: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg",
                              alt: "Google"
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Continue with Google" })
                        ] })
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divider", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "OR" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "guest-link", onClick: handleGuestContinue, children: "Continue without signing in" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "onboarding-section", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `badge ${isPinned ? "success" : ""}`, children: isPinned ? "✅ SET UP COMPLETE" : "RECOMMENDED" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "onboarding-title", children: isPinned ? "1-prompt is pinned!" : "Pin to Toolbar" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "onboarding-desc", children: isPinned ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    "You are all set! ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
                    "Capture insights, compile prompts, and build better with 1-prompt."
                  ] }) : "Pin 1-prompt for the fastest way to capture and compile your prompts." }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "visual-card", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animated-cursor" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "step-row", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "step-num", children: "1" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "step-content", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "step-title", children: "Click the extensions icon" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mock-browser-toolbar", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mock-url-bar" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "svg",
                            {
                              className: "puzzle-icon target-puzzle",
                              viewBox: "0 0 24 24",
                              children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H5c-1.1 0-2 .9-2 2v13.5c0 1.1.9 2 2 2h13.5c1.1 0 2-.9 2-2V14.5a2.5 2.5 0 0 0 0-3.5z" })
                            }
                          )
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
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "svg",
                            {
                              className: "pin-icon target-pin",
                              viewBox: "0 0 24 24",
                              children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" })
                            }
                          )
                        ] }) })
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      className: "done-btn",
                      style: { marginTop: "24px" },
                      onClick: (e) => {
                        e.stopPropagation();
                        setIsPinned(true);
                      },
                      children: "I have pinned it"
                    }
                  )
                ] })
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sidebar-content", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-label", children: "profile" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-icon user-active" })
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `dashboard-section ${activeSection === "dashboard" ? "expanded-mode" : "sidebar-mode"}`,
              onClick: () => activeSection !== "dashboard" && navigate("/supported-sites"),
              children: activeSection === "dashboard" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dashboard-content fade-in", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "dashboard-title", children: "1-prompt" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dashboard-grid", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "grid-card",
                      onClick: (e) => {
                        e.stopPropagation();
                        window.open("https://chatgpt.com", "_blank");
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "img",
                          {
                            src: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg",
                            alt: "ChatGPT",
                            className: "grid-logo"
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid-label", children: "ChatGPT" })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "grid-card",
                      onClick: (e) => {
                        e.stopPropagation();
                        window.open("https://claude.ai", "_blank");
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "img",
                          {
                            src: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Anthropic_logo.svg",
                            alt: "Claude",
                            className: "grid-logo"
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid-label", children: "Claude" })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "grid-card",
                      onClick: (e) => {
                        e.stopPropagation();
                        window.open("https://gemini.google.com", "_blank");
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "img",
                          {
                            src: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg",
                            alt: "Gemini",
                            className: "grid-logo"
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid-label", children: "Gemini" })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "grid-card",
                      onClick: (e) => {
                        e.stopPropagation();
                        window.open("https://perplexity.ai", "_blank");
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "img",
                          {
                            src: "https://www.perplexity.ai/favicon.ico",
                            alt: "Perplexity",
                            className: "grid-logo"
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "grid-label", children: "Perplexity" })
                      ]
                    }
                  )
                ] })
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sidebar-content", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-label", children: "platforms" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sidebar-icon grid-active" })
              ] })
            }
          )
        ] })
      ]
    }
  );
};
ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Welcome, {}) })
);
