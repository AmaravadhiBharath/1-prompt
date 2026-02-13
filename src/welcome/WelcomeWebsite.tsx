import React, { useState, useEffect } from 'react';
import './new-design.css';

// --- Confetti Component ---
const Confetti = () => {
    const [pieces, setPieces] = useState<any[]>([]);

    useEffect(() => {
        const colors = ['#007cff', '#00c6ff', '#10b981', '#f59e0b', '#ef4444'];
        const p = Array.from({ length: 50 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100 + 'vw',
            delay: Math.random() * 3 + 's',
            color: colors[Math.floor(Math.random() * colors.length)],
            duration: (Math.random() * 2 + 2) + 's'
        }));
        setPieces(p);
    }, []);

    return (
        <div className="celebration-container" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10001, overflow: 'hidden' }}>
            {pieces.map(p => (
                <div key={p.id} className="confetti" style={{
                    left: p.left,
                    background: p.color,
                    animationDelay: p.delay,
                    animationDuration: p.duration,
                    position: 'absolute',
                    width: '10px',
                    height: '10px',
                    top: '-10px',
                    borderRadius: '2px',
                    animationName: 'confetti-fall',
                    animationIterationCount: 'infinite',
                    animationTimingFunction: 'ease-in-out'
                }} />
            ))}
        </div>
    );
};

// --- Shared Components ---

const PinAnimation = () => (
    <div className="pin-visual-animated">
        <div className="mock-browser-chrome">
            <div className="mock-url-bar"></div>
            <div className="mock-extensions-area">
                <div className="puzzle-icon-container pulse-hint">
                    <svg viewBox="0 0 24 24" className="icon-svg">
                        <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H5c-1.1 0-2 .9-2 2v13.5c0 1.1.9 2 2 2h13.5c1.1 0 2-.9 2-2V14.5a2.5 2.5 0 0 0 0-3.5z" />
                    </svg>
                </div>
                <div className="extension-pin-menu">
                    <div className="menu-item-mock">
                        <div className="app-icon-small"></div>
                        <span className="app-name-small">1-prompt</span>
                        <div className="pin-icon-container highlight-action">
                            <svg viewBox="0 0 24 24" className="icon-svg-small">
                                <path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="animated-moving-cursor"></div>
            </div>
        </div>
    </div>
);

const WelcomeWebsite: React.FC = () => {
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginStep, setLoginStep] = useState(0);
    const [loginSuccess, setLoginSuccess] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [prepMessages, setPrepMessages] = useState<string[]>([]);

    const loginMessages = [
        "Securing your connection...",
        "Syncing your AI workspace...",
        "Preparing your toolkit...",
        "All set! Opening 1-prompt..."
    ];

    const logoUrl = "/icons/icon128.png";

    useEffect(() => {
        // Try to seed login state from localStorage if available (no firebase required)
        try {
            const u = localStorage.getItem('oneprompt_user');
            if (u) {
                const parsed = JSON.parse(u);
                if (parsed && parsed.email) {
                    setLoginSuccess(true);
                    setUserEmail(parsed.email);
                }
            }
        } catch (e) { }
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
                await new Promise(r => setTimeout(r, 600));
            }
            // Firebase is optional. Treat this as a local flow: mark success as Guest.
            setUserEmail('Guest');
            setLoginSuccess(true);
            setLoginStep(3);
            await new Promise(r => setTimeout(r, 400));
            setIsTransitioning(true);
            setIsLoggingIn(false);
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
            await new Promise(r => setTimeout(r, 600));
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
            await new Promise(r => setTimeout(r, 600));
        }
        setIsTransitioning(true);
        setIsLoggingIn(false);
        setTimeout(() => {
            // Ask content script/extension if it's present. If present, open the extension install page.
            try {
                const pingTimeout = 700;
                let handled = false;
                function onMessage(e: MessageEvent) {
                    if (!e.data || e.data.type !== 'ONE_PROMPT_PONG') return;
                    handled = true;
                    window.removeEventListener('message', onMessage as any);
                    const extId = e.data.extensionId;
                    if (extId) {
                        // Open extension install page / anchor inside extension
                        const url = `chrome-extension://${extId}/#install.html`;
                        window.open(url, '_blank');
                        return;
                    }
                }
                window.addEventListener('message', onMessage as any);
                // Send ping to content script (if extension installed it'll reply)
                window.postMessage({ type: 'ONE_PROMPT_MSG', action: 'PING' }, '*');
                setTimeout(() => {
                    if (!handled) {
                        window.removeEventListener('message', onMessage as any);
                        // Fallback: open site install instructions
                        window.open('/install/index.html', '_blank');
                    }
                }, pingTimeout);
            } catch (e) {
                console.log('Error pinging extension', e);
                window.open('/install/index.html', '_blank');
            }
        }, 800);
    };

    const signOut = async () => {
        await signOutFromBackend();
        setLoginSuccess(false);
        setUserEmail(null);
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.remove(['firebase_user_email', 'firebase_current_user_id']);
        }
    };

    const platforms = [
        { name: 'ChatGPT', url: 'https://chatgpt.com', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg' },
        { name: 'Claude', url: 'https://claude.ai', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Anthropic_logo.svg' },
        { name: 'Gemini', url: 'https://gemini.google.com', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg' },
        { name: 'Perplexity', url: 'https://perplexity.ai', logo: 'https://www.perplexity.ai/favicon.ico' },
        { name: 'DeepSeek', url: 'https://chat.deepseek.com', logo: 'https://www.deepseek.com/favicon.ico' },
        { name: 'Lovable', url: 'https://lovable.dev', logo: 'https://lovable.dev/favicon.ico' }
    ];

    return (
        <div className="welcome-page-root fade-in">
            {isTransitioning && (
                <>
                    <Confetti />
                    <div className="handoff-overlay fade-in">
                        <div className="handoff-content">
                            <div className="handoff-pulse">
                                <img src={logoUrl} alt="Logo" className="handoff-logo" />
                            </div>
                            <h2 className="handoff-title">Welcome to 1-prompt</h2>
                            <p className="handoff-subtitle">Your AI workspace is ready.</p>
                            <div className="handoff-loader">
                                <div className="handoff-loader-bar" />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Header */}
            <header className="premium-header">
                <div className="brand-bundle">
                    <img src={logoUrl} alt="1-prompt" className="brand-logo" />
                    <span className="brand-name">1-prompt</span>
                </div>
                {loginSuccess && (
                    <div className="user-info-pill">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>{userEmail}</span>
                        <a href="#" className="secondary-link logout" style={{ marginLeft: '12px', marginRight: 0 }} onClick={(e) => { e.preventDefault(); signOut(); }}>Logout</a>
                    </div>
                )}
            </header>

            {/* Main Content Areas */}
            <main className={`dashboard-grid-layout ${(loginSuccess && isPinned) ? 'full-width' : ''}`}>

                {/* 1. BEFORE LOGIN: Single Card for Login + Pin */}
                {!loginSuccess && (
                    <div className="centered-single-card">
                        <div className="premium-card" style={{ maxWidth: '480px', width: '100%' }}>
                            <h2 className="card-title">Setup 1-prompt</h2>
                            <p className="card-desc">Sign in to sync your prompts and pin the extension to your toolbar.</p>

                            <PinAnimation />

                            <div style={{ marginTop: '24px' }}>
                                <button
                                    className={`google-btn ${isLoggingIn ? 'loading' : ''}`}
                                    style={{
                                        width: '100%', height: '52px', borderRadius: '12px', border: '1px solid #e2e8f0',
                                        background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        gap: '12px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px'
                                    }}
                                    onClick={handleGoogleLogin}
                                    disabled={isLoggingIn}
                                >
                                    {isLoggingIn ? (
                                        <div className="login-processing">
                                            <span className="processing-status">{prepMessages[loginStep] || "Preparing..."}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" />
                                            <span>Continue with Google</span>
                                        </>
                                    )}
                                </button>
                                <div style={{ textAlign: 'center' }}>
                                    <button onClick={handleGuestContinue} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
                                        Continue as Guest
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. AFTER LOGIN (UNPINNED): Platform Grid + Pin Sidebar */}
                {loginSuccess && !isPinned && (
                    <>
                        <section className="sidebar-column">
                            <div className="premium-card pin-card">
                                <div className="section-label" style={{ color: '#f59e0b' }}>PIN REQUIRED</div>
                                <h2 className="card-title">Pin for Quick Access</h2>
                                <p className="card-desc">Keep 1-prompt visible for the fastest capturing.</p>

                                <PinAnimation />

                                <button onClick={() => setIsPinned(true)} className="confirm-pin-btn" style={{
                                    width: '100%', background: '#f1f5f9',
                                    border: 'none', padding: '12px', borderRadius: '10px',
                                    cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                                    color: '#475569', marginTop: '20px'
                                }}>
                                    I've Pinned It
                                </button>
                            </div>
                        </section>

                        <section className="platforms-column">
                            <div className="fade-in">
                                <div className="section-label">Supported Platforms</div>
                                <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '24px', lineHeight: 1.1 }}>
                                    Start capturing prompts.
                                </h1>

                                <div className="platforms-grid">
                                    {platforms.map(p => (
                                        <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer" className="platform-card" onClick={(e) => { e.preventDefault(); handleLaunchSidepanel(); }}>
                                            <img src={p.logo} alt={p.name} className="platform-logo" />
                                            <span className="platform-name">{p.name}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </>
                )}

                {/* 3. AFTER LOGIN (PINNED): Platform Grid Only */}
                {loginSuccess && isPinned && (
                    <section className="platforms-column">
                        <div className="fade-in">
                            <div className="section-label">Your Workspace</div>
                            <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '24px', lineHeight: 1.1 }}>
                                Select a platform to begin.
                            </h1>

                            <div className="platforms-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                                {platforms.map(p => (
                                    <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer" className="platform-card" onClick={() => openSidePanel(false)}>
                                        <img src={p.logo} alt={p.name} className="platform-logo" />
                                        <span className="platform-name">{p.name}</span>
                                    </a>
                                ))}
                            </div>

                            <div style={{ marginTop: '40px', textAlign: 'center' }}>
                                <button
                                    className="launch-btn-premium"
                                    style={{ maxWidth: '300px', margin: '0 auto' }}
                                    onClick={handleLaunchSidepanel}
                                >
                                    Open Library
                                </button>
                            </div>
                        </div>
                    </section>
                )}

            </main>

            <footer style={{ marginTop: 'auto', padding: '32px 12px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px' }}>
                <span>© 2026 1-prompt. In One Click.</span>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</a>
                    <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</a>
                    <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Support</a>
                </div>
            </footer>
        </div>
    );
};

export default WelcomeWebsite;
