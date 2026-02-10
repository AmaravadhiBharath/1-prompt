import React, { useEffect, useState } from "react";
import { signInWithGoogle } from "../services/auth";
import "./new-design.css";

const features = [
  {
    title: "Frictionless Flow",
    text: "Experience the fastest way to generate prompts. We've removed every unnecessary step so you never have to leave your current tab context.",
    icon: (
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
        <circle cx="10" cy="30" r="3" fill="#0055ff" />
        <path
          d="M13 30C25 30 35 15 50 15"
          stroke="#ccc"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M13 30C25 30 35 45 50 45"
          stroke="#ccc"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="53" cy="15" r="2" fill="#999" />
        <circle cx="53" cy="45" r="2" fill="#999" />
      </svg>
    ),
  },
  {
    title: "Intelligent Context",
    text: "Highlight text on a blog, grab a YouTube transcript, or select code snippets. 1-Prompt automatically formats the context for your LLM.",
    icon: (
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
        <rect
          x="15"
          y="15"
          width="30"
          height="30"
          rx="4"
          stroke="#ccc"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <rect x="25" y="25" width="10" height="10" fill="#e6f0ff" />
        <circle cx="45" cy="15" r="2" fill="#0055ff" />
      </svg>
    ),
  },
  {
    title: "Personal Library",
    text: "Build a library of highly effective instructions. Reuse your best prompts on any content with a single keystroke.",
    icon: (
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
        <rect
          x="18"
          y="12"
          width="24"
          height="36"
          rx="2"
          stroke="#ccc"
          strokeWidth="2"
        />
        <path d="M24 20H36" stroke="#eee" strokeWidth="2" />
        <path d="M24 26H36" stroke="#eee" strokeWidth="2" />
        <path d="M24 32H32" stroke="#eee" strokeWidth="2" />
        <path d="M45 18L35 28" stroke="#0055ff" strokeWidth="2" />
      </svg>
    ),
  },
  {
    title: "Model-to-Model",
    text: "Seamlessly transport your prompts between GPT-4, Claude, and Gemini. Break down the silos between AI models.",
    icon: (
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
        <circle
          cx="30"
          cy="30"
          r="18"
          stroke="#ccc"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <circle cx="12" cy="30" r="3" fill="#0055ff" />
        <circle cx="48" cy="30" r="3" fill="#999" />
      </svg>
    ),
  },
  {
    title: "Seamless Continuity",
    text: "Pick up exactly where you left off. 1-Prompt remembers your context so you don't have to re-explain yourself.",
    icon: (
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
        <rect
          x="12"
          y="22"
          width="16"
          height="16"
          rx="2"
          stroke="#ccc"
          strokeWidth="2"
        />
        <rect
          x="32"
          y="22"
          width="16"
          height="16"
          rx="2"
          stroke="#0055ff"
          strokeWidth="2"
        />
        <path d="M28 30H32" stroke="#999" strokeWidth="2" />
      </svg>
    ),
  },
  {
    title: "Preserved Intent",
    text: "Complex instructions shouldn't break when you change environments. We ensure your carefully crafted prompts remain intact.",
    icon: (
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
        <rect
          x="15"
          y="10"
          width="30"
          height="40"
          rx="3"
          fill="#f9f9f9"
          stroke="#eee"
          strokeWidth="2"
        />
        <path d="M22 20H38" stroke="#ddd" strokeWidth="2" />
        <path d="M22 28H38" stroke="#ddd" strokeWidth="2" />
        <path
          d="M40 45L28 45L22 38"
          stroke="#0055ff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const Welcome: React.FC = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const [isPinned, setIsPinned] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "landing" | "pricing" | "contact" | "setup" | "dashboard" | "uninstall"
  >("landing");

  // Carousel State
  const [currentFeature, setCurrentFeature] = useState(0);
  const [animClass, setAnimClass] = useState("fade-init");
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoPlay = (delay: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setAnimClass("enter-right");
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, delay);
  };

  // Initial Timer
  useEffect(() => {
    if (activeSection === "landing") {
      startAutoPlay(4000); // Normal 4s speed
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSection]);

  const handleManualNav = (direction: "next" | "prev" | number) => {
    // Clear interval immediately to stop auto-play jumping in
    if (timerRef.current) clearInterval(timerRef.current);

    if (typeof direction === "number") {
      // Clicking dot: determine direction
      setAnimClass(direction > currentFeature ? "enter-right" : "enter-left");
      setCurrentFeature(direction);
    } else {
      setAnimClass(direction === "next" ? "enter-right" : "enter-left");
      setCurrentFeature(
        (prev) =>
          (prev + (direction === "next" ? 1 : -1) + features.length) %
          features.length,
      );
    }
    // Delay 3x (12 seconds) after interaction before resuming auto-play
    startAutoPlay(12000);
  };

  useEffect(() => {
    // Handle URL-based routing (Simple Client-Side Router)
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
    const interval = setInterval(checkPinnedStatus, 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("popstate", handleRouting);
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const container = document.querySelector(".welcome-full-container");
      if (container) {
        setIsScrolled(container.scrollTop > 50);
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

  const navigate = (path: string) => {
    // In extension environment, absolute paths like '/' or '/install' cause ERR_FILE_NOT_FOUND if triggered
    const isExtension = window.location.protocol === "chrome-extension:";

    if (isExtension) {
      if (path === "/" || path === "") {
        setActiveSection("landing");
      } else if (path.includes("install")) {
        setActiveSection("setup");
      } else if (path.includes("uninstall")) {
        setActiveSection("uninstall");
      }
      // Still push state but keep it relative to current file if needed,
      // though state change is enough for logic
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

  useEffect(() => {
    const detectExtension = () => {
      const isPolyfill = (window as any).is1PromptPolyfill === true;
      const hasExtensionAPI =
        !!(window.chrome && chrome.runtime && chrome.runtime.id) && !isPolyfill;
      const hasMarkerAttribute = document.documentElement.hasAttribute(
        "data-1prompt-installed",
      );
      const installed = hasExtensionAPI || hasMarkerAttribute;
      setIsInstalled(!!installed);
      return installed;
    };
    detectExtension();
    const pollTimer = setInterval(() => {
      if (detectExtension()) clearInterval(pollTimer);
    }, 500);
    setTimeout(() => clearInterval(pollTimer), 5000);

    if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage(
        { action: "CHECK_SIDEPANEL_OPEN" },
        (response) => {
          if (
            response &&
            response.isOpen &&
            window.location.pathname.includes("install")
          ) {
            setActiveSection("dashboard");
          }
        },
      );
      const messageListener = (message: any) => {
        if (
          message.action === "SIDEPANEL_OPENED" &&
          window.location.pathname.includes("install")
        ) {
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

  useEffect(() => {
    if (!isInstalled) return;
    if (!window.location.pathname.includes("install")) return;
    if (loginSuccess && isPinned) {
      setActiveSection("dashboard");
    } else {
      setActiveSection("setup");
    }
  }, [loginSuccess, isPinned, isInstalled]);

  const showFinalStage = loginSuccess && isPinned;
  const isLandingPage = ["landing", "uninstall", "pricing", "contact"].includes(
    activeSection,
  );

  const feature = features[currentFeature];

  return (
    <div
      className={
        isLandingPage
          ? "welcome-full-container"
          : `welcome-container ${showFinalStage ? "final-stage" : ""}`
      }
    >
      {activeSection === "uninstall" ? (
        <div
          className="landing-section fade-in"
          style={{ textAlign: "center" }}
        >
          <div className="landing-content">
            <div
              className="brand-header center"
              style={{ justifyContent: "center", marginBottom: "24px" }}
            >
              <img
                src="./icons/logo-new.png"
                alt="1-prompt Logo"
                style={{ width: "64px", height: "64px" }}
              />
            </div>
            <h1
              className="landing-headline"
              style={{ fontSize: "2.5rem", marginBottom: "16px" }}
            >
              Sorry to see you go.
            </h1>
            <p
              className="landing-subheadline"
              style={{ margin: "0 auto 32px" }}
            >
              We're constantly improving. If you have a moment, let us know how
              we can do better.
            </p>
            <div className="landing-cta-group">
              <button className="google-btn" onClick={() => navigate("/")}>
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      ) : ["landing", "pricing", "contact"].includes(activeSection) ? (
        <div className="welcome-new-layout fade-in">
          {/* Header */}
          <nav className={`nav-new ${isScrolled ? "scrolled" : ""}`}>
            <div className="nav-inner-pill">
              <div
                className="nav-left"
                onClick={() => scrollToSection("home-section")}
                style={{ cursor: "pointer" }}
              >
                <img
                  src="./icons/logo-new.png"
                  alt="1-prompt Logo"
                  className="nav-logo-img"
                />
              </div>
              <div className="nav-right">
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("home-section");
                  }}
                >
                  Home
                </a>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("pricing-section");
                  }}
                >
                  Pricing
                </a>
                <a
                  href="#"
                  className="nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("contact-section");
                  }}
                >
                  Contact
                </a>
                <a
                  href="#"
                  className="btn-demo"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveSection("setup");
                  }}
                >
                  Book a Demo
                </a>
              </div>
            </div>
          </nav>

          {/* Scrollable Content Sections */}
          <div
            id="home-section"
            className="section-wrapper"
            style={{
              minHeight: "85vh",
              display: "flex",
              alignItems: "center",
              scrollMarginTop: "80px",
              marginTop: "-20px",
            }}
          >
            <main className="hero-container-new">
              {/* Left Card Carousel */}
              <div className="hero-left-new">
                <div className="frictionless-card">
                  <div
                    key={currentFeature}
                    className={`feature-content ${animClass}`}
                  >
                    <div className="placeholder-img">{feature.icon}</div>
                    <h2>{feature.title}</h2>
                    <p>{feature.text}</p>
                  </div>
                  <div className="card-nav-row">
                    <div
                      className="nav-arrow"
                      onClick={() => handleManualNav("prev")}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </div>
                    <div className="carousel-indicators">
                      {features.map((_, index) => (
                        <div
                          key={index}
                          className={`indicator ${index === currentFeature ? "active" : ""}`}
                          onClick={() => handleManualNav(index)}
                          style={{ cursor: "pointer" }}
                        />
                      ))}
                    </div>
                    <div
                      className="nav-arrow"
                      onClick={() => handleManualNav("next")}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Content */}
              <div
                className="hero-right-new fade-in-up"
                style={{ animationDelay: "0.2s" }}
              >
                <h1 className="hero-title-new">
                  1Prompt : Capture & Compile in One Click
                </h1>
                <p className="hero-subtitle-new">
                  Eliminate repetitive manual inputs. Preserve intent across
                  ChatGPT, Claude, and Gemini instantly.
                </p>

                <div className="cta-group-new">
                  <button
                    className="btn-chrome-new"
                    onClick={() => {
                      if (isInstalled) {
                        navigate("/install");
                      } else {
                        window.open(
                          "https://chromewebstore.google.com/detail/1prompt/pckiikjlgoimpnimojpfpnfndilaogol",
                          "_blank",
                        );
                      }
                    }}
                  >
                    <span style={{ fontSize: "24px", lineHeight: "1" }}>+</span>
                    Add to chrome
                  </button>
                  <span className="no-cc-tag">
                    No credit card Required | free to start
                  </span>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#888",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "12px",
                      fontWeight: "500",
                    }}
                  >
                    Supported platforms
                  </div>
                  <div className="platforms-list-new">
                    <span className="platform-item">Gemini</span>
                    <span className="platform-item">Chatgpt</span>
                    <span className="platform-item">Perplexity</span>
                    <span className="platform-item">Lovable</span>
                    <span className="platform-item">figma</span>
                    <span className="platform-item">emergent</span>
                    <span style={{ alignSelf: "center", color: "#666" }}>
                      and more
                    </span>
                  </div>
                </div>
              </div>
            </main>
          </div>

          <div
            id="pricing-section"
            className="section-wrapper"
            style={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              background: "#f9fafb",
              scrollMarginTop: "80px",
            }}
          >
            <div className="pricing-container fade-in-up">
              <div className="pricing-header">
                <h1 className="section-title">
                  Pricing tailored to your workflow
                </h1>
                <p className="section-subtitle">
                  Scale from casual research to professional automation.
                </p>
              </div>
              <div className="pricing-grid">
                <div className="pricing-card">
                  <div className="tier-name">Basic</div>
                  <div className="price">
                    $0<span>/mo</span>
                  </div>
                  <ul className="features-list">
                    <li>10 Daily Captures</li>
                    <li>Local Workspace</li>
                    <li>Direct Clipboard Export</li>
                    <li>Instant Access</li>
                  </ul>
                  <button
                    className="tier-btn"
                    onClick={() => setActiveSection("setup")}
                  >
                    Book a Demo
                  </button>
                </div>
                <div className="pricing-card popular">
                  <div className="popular-tag">Early Adopter Offer</div>
                  <div className="tier-name">Go</div>
                  <div className="price">
                    <span
                      style={{
                        textDecoration: "line-through",
                        fontSize: "18px",
                        color: "#888",
                        marginRight: "8px",
                      }}
                    >
                      $1
                    </span>
                    $0<span>/mo</span>
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#0055ff",
                      marginBottom: "15px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                    }}
                  >
                    Free until June 2026
                  </div>
                  <ul className="features-list">
                    <li>Unlimited Capture</li>
                    <li>10 AI Orchestrations / day</li>
                    <li>Cloud Synchronization</li>
                    <li>Personal Library</li>
                  </ul>
                  <button
                    className="tier-btn primary"
                    onClick={() => setActiveSection("setup")}
                  >
                    Claim Free Access
                  </button>
                </div>
                <div className="pricing-card">
                  <div className="tier-name">Pro</div>
                  <div className="price">
                    <span
                      style={{
                        textDecoration: "line-through",
                        fontSize: "18px",
                        color: "#888",
                        marginRight: "8px",
                      }}
                    >
                      $9
                    </span>
                    $5<span>/mo</span>
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#666",
                      marginBottom: "15px",
                      textTransform: "uppercase",
                    }}
                  >
                    Introductory rate
                  </div>
                  <ul className="features-list">
                    <li>999 Orchestrations / mo</li>
                    <li>Slack Automations</li>
                    <li>Webhook Integration</li>
                    <li>Priority Support</li>
                  </ul>
                  <button
                    className="tier-btn"
                    onClick={() => setActiveSection("setup")}
                  >
                    Unlock Pro
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div id="contact-section" className="section-wrapper footer-section">
            <div className="footer-top-text">
              Questions or feedback? We'd love to hear how 1-prompt is helping
              your workflow.
            </div>

            <div className="contact-main">
              <h1 className="contact-title">Get in touch</h1>
              <div className="email-pill">
                <a href="mailto:hello@1-prompt.in">hello@1-prompt.in</a>
              </div>
            </div>

            <footer className="footer-bottom">
              <div className="footer-row">
                <div className="footer-left">
                  © 2026 Cursor Layout LLP. All rights reserved.
                </div>
                <div className="footer-right">
                  <a
                    href="#"
                    className="footer-link"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection("home-section");
                    }}
                  >
                    Docs
                  </a>
                  <a
                    href="#"
                    className="footer-link"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection("pricing-section");
                    }}
                  >
                    Pricing
                  </a>
                  <a
                    href="#"
                    className="footer-link"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection("contact-section");
                    }}
                  >
                    Contact
                  </a>
                </div>
              </div>
              <div className="footer-address">
                Cursor Layout LLP · Plot 58 Hastinapuram, Hyderabad, Telangana,
                India, 500079
              </div>
            </footer>
          </div>
        </div>
      ) : (
        <>
          {/* Setup and Dashboard remain unchanged as they are for the app flow */}
          <div
            className={`setup-container ${activeSection !== "dashboard" ? "expanded-mode" : "sidebar-mode"}`}
            onClick={() =>
              activeSection === "dashboard" && setActiveSection("setup")
            }
          >
            {activeSection !== "dashboard" ? (
              <div className="setup-wrapper">
                <div className="auth-section">
                  <div
                    onClick={() => navigate("/")}
                    style={{
                      cursor: "pointer",
                      opacity: 0.6,
                      fontSize: "14px",
                      marginBottom: "20px",
                      display: "inline-block",
                    }}
                  >
                    ← Back to home
                  </div>
                  <div style={{ marginBottom: "24px" }}>
                    <img
                      src="./icons/logo-new.png"
                      alt="1-prompt Logo"
                      style={{ width: "48px", height: "48px" }}
                    />
                  </div>
                  <h1 className="headline">
                    1 prompt, <br />1 click away.
                  </h1>
                  <p className="subheadline">
                    Sign in to sync your prompts across devices and access your
                    library from any browser.
                  </p>
                  {loginSuccess ? (
                    <div className="success-message">
                      ✓ Signed in successfully{" "}
                      <button
                        className="google-btn success"
                        style={{ marginTop: "20px" }}
                        onClick={() => openSidePanel(true)}
                      >
                        <span>Open Side Panel</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      className="google-btn"
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                    >
                      {isLoggingIn ? (
                        <span>Signing in...</span>
                      ) : (
                        <>
                          <img
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                            alt="Google"
                          />
                          <span>Continue with Google</span>
                        </>
                      )}
                    </button>
                  )}
                  <div className="divider">
                    <span>OR</span>
                  </div>
                  <button className="guest-link" onClick={handleGuestContinue}>
                    Continue without signing in
                  </button>
                </div>

                <div className="onboarding-section">
                  <div className={`badge ${isPinned ? "success" : ""}`}>
                    {isPinned ? "✅ SET UP COMPLETE" : "RECOMMENDED"}
                  </div>
                  <h2 className="onboarding-title">
                    {isPinned ? "1-prompt is pinned!" : "Pin to Toolbar"}
                  </h2>
                  <p className="onboarding-desc">
                    {isPinned
                      ? "You are all set. Click the icon to start capturing."
                      : "Keep 1-prompt within reach for the best capturing experience."}
                  </p>
                  <div className="visual-card">
                    <div className="animated-cursor"></div>
                    <div className="step-row">
                      <div className="step-num">1</div>
                      <div className="step-content">
                        <div className="step-title">
                          Click the extensions icon
                        </div>
                        <div className="mock-browser-toolbar">
                          <div className="mock-url-bar"></div>
                          <svg
                            className="puzzle-icon target-puzzle"
                            viewBox="0 0 24 24"
                          >
                            <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H5c-1.1 0-2 .9-2 2v13.5c0 1.1.9 2 2 2h13.5c1.1 0 2-.9 2-2V14.5a2.5 2.5 0 0 0 0-3.5z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="step-row">
                      <div className="step-num">2</div>
                      <div className="step-content">
                        <div className="step-title">Pin 1-prompt</div>
                        <div className="mock-menu">
                          <div className="menu-item highlight">
                            <div className="app-icon-small"></div>
                            <div className="app-name-small">1-prompt</div>
                            <svg
                              className="pin-icon target-pin"
                              viewBox="0 0 24 24"
                            >
                              <path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    className="done-btn"
                    style={{ marginTop: "24px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPinned(true);
                    }}
                  >
                    I have pinned it
                  </button>
                </div>
              </div>
            ) : (
              <div className="sidebar-content">
                <div className="sidebar-label">profile</div>
                <div className="sidebar-icon user-active"></div>
              </div>
            )}
          </div>

          <div
            className={`dashboard-section ${activeSection === "dashboard" ? "expanded-mode" : "sidebar-mode"}`}
            onClick={() =>
              activeSection !== "dashboard" && setActiveSection("dashboard")
            }
          >
            {activeSection === "dashboard" ? (
              <div className="dashboard-content fade-in">
                <h1 className="dashboard-title">1-prompt</h1>
                <div className="dashboard-grid">
                  <div
                    className="grid-card"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open("https://chatgpt.com", "_blank");
                    }}
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg"
                      alt="ChatGPT"
                      className="grid-logo"
                    />
                    <span className="grid-label">ChatGPT</span>
                  </div>
                  <div
                    className="grid-card"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open("https://claude.ai", "_blank");
                    }}
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Anthropic_logo.svg"
                      alt="Claude"
                      className="grid-logo"
                    />
                    <span className="grid-label">Claude</span>
                  </div>
                  <div
                    className="grid-card"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open("https://gemini.google.com", "_blank");
                    }}
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg"
                      alt="Gemini"
                      className="grid-logo"
                    />
                    <span className="grid-label">Gemini</span>
                  </div>
                  <div
                    className="grid-card"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open("https://perplexity.ai", "_blank");
                    }}
                  >
                    <img
                      src="https://www.perplexity.ai/favicon.ico"
                      alt="Perplexity"
                      className="grid-logo"
                    />
                    <span className="grid-label">Perplexity</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="sidebar-content">
                <div className="sidebar-label">platforms</div>
                <div className="sidebar-icon grid-active"></div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Welcome;
