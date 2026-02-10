// UX Enhancement Components for 1prompt v1.3.0
// These components add empathy, guidance, and delight to the user experience

import React from 'react';

// ═══════════════════════════════════════════════════
// ONBOARDING MODAL - First-time user experience
// ═══════════════════════════════════════════════════

interface OnboardingModalProps {
    onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
    const [step, setStep] = React.useState(1);

    const handleComplete = () => {
        chrome.storage.local.set({ hasSeenOnboarding: true });
        onClose();
    };

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-modal animate-m3-fade-in">
                {step === 1 && (
                    <div className="onboarding-step">
                        <div className="onboarding-icon">🎯</div>
                        <h2>Welcome to 1prompt!</h2>
                        <p>Your AI conversation companion that helps you capture, organize, and reuse your best prompts.</p>
                        <div className="onboarding-visual">
                            <div className="visual-card">
                                <div className="visual-icon">💬</div>
                                <span>Chat with AI</span>
                            </div>
                            <div className="visual-arrow">→</div>
                            <div className="visual-card">
                                <div className="visual-icon">📝</div>
                                <span>Extract Prompts</span>
                            </div>
                            <div className="visual-arrow">→</div>
                            <div className="visual-card">
                                <div className="visual-icon">🎨</div>
                                <span>Reuse Anytime</span>
                            </div>
                        </div>
                        <button onClick={() => setStep(2)} className="m3-button-filled">
                            Get Started
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="onboarding-step">
                        <div className="onboarding-icon">🚀</div>
                        <h2>How It Works</h2>
                        <div className="onboarding-steps-list">
                            <div className="step-item">
                                <div className="step-number">1</div>
                                <div className="step-content">
                                    <h3>Open Any AI Platform</h3>
                                    <p>ChatGPT, Claude, Gemini, Perplexity, and more!</p>
                                </div>
                            </div>
                            <div className="step-item">
                                <div className="step-number">2</div>
                                <div className="step-content">
                                    <h3>Have Your Conversation</h3>
                                    <p>Ask questions, get creative, solve problems</p>
                                </div>
                            </div>
                            <div className="step-item">
                                <div className="step-number">3</div>
                                <div className="step-content">
                                    <h3>Click "Extract"</h3>
                                    <p>We'll capture all your prompts automatically</p>
                                </div>
                            </div>
                        </div>
                        <div className="onboarding-actions">
                            <button onClick={() => setStep(1)} className="m3-button-text">
                                Back
                            </button>
                            <button onClick={() => setStep(3)} className="m3-button-filled">
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="onboarding-step">
                        <div className="onboarding-icon">⚡</div>
                        <h2>Pro Tips</h2>
                        <div className="tips-grid">
                            <div className="tip-card">
                                <div className="tip-icon">⌨️</div>
                                <h4>Keyboard Shortcuts</h4>
                                <p><kbd>Cmd/Ctrl + Shift + E</kbd> to extract</p>
                                <p><kbd>Cmd/Ctrl + C</kbd> to copy</p>
                            </div>
                            <div className="tip-card">
                                <div className="tip-icon">⚡</div>
                                <h4>Summarize Mode</h4>
                                <p>Get AI-powered summaries of long conversations</p>
                            </div>
                            <div className="tip-card">
                                <div className="tip-icon">📚</div>
                                <h4>History</h4>
                                <p>All extractions auto-saved for easy access</p>
                            </div>
                        </div>
                        <button onClick={handleComplete} className="m3-button-filled">
                            Let's Go! 🎉
                        </button>
                    </div>
                )}

                <div className="onboarding-dots">
                    <span className={step === 1 ? 'active' : ''} onClick={() => setStep(1)}></span>
                    <span className={step === 2 ? 'active' : ''} onClick={() => setStep(2)}></span>
                    <span className={step === 3 ? 'active' : ''} onClick={() => setStep(3)}></span>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// TOOLTIP COMPONENT - Contextual help
// ═══════════════════════════════════════════════════

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'bottom' }: TooltipProps) {
    const [show, setShow] = React.useState(false);

    return (
        <div
            className="tooltip-wrapper"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {show && (
                <div className={`tooltip tooltip-${position} animate-m3-fade-in`}>
                    {content}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════
// SUCCESS CELEBRATION - Delightful feedback
// ═══════════════════════════════════════════════════

interface SuccessCelebrationProps {
    message: string;
    onClose: () => void;
}

export function SuccessCelebration({ message, onClose }: SuccessCelebrationProps) {
    React.useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="success-celebration animate-m3-slide-up">
            <div className="celebration-content">
                <div className="celebration-icon">🎉</div>
                <p>{message}</p>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// KEYBOARD HINTS OVERLAY
// ═══════════════════════════════════════════════════

interface KeyboardHintsProps {
    onClose: () => void;
}

export function KeyboardHints({ onClose }: KeyboardHintsProps) {
    return (
        <div className="keyboard-hints-overlay" onClick={onClose}>
            <div className="keyboard-hints-modal animate-m3-fade-in" onClick={e => e.stopPropagation()}>
                <div className="hints-header">
                    <h3>⌨️ Keyboard Shortcuts</h3>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>
                <div className="hints-grid">
                    <div className="hint-row">
                        <kbd>Cmd/Ctrl</kbd> + <kbd>E</kbd>
                        <span>Extract prompts from current page</span>
                    </div>
                    <div className="hint-row">
                        <kbd>Cmd/Ctrl</kbd> + <kbd>C</kbd>
                        <span>Copy all prompts to clipboard</span>
                    </div>
                    <div className="hint-row">
                        <kbd>Esc</kbd>
                        <span>Close modals and popups</span>
                    </div>
                    <div className="hint-row">
                        <kbd>?</kbd>
                        <span>Show/hide this help</span>
                    </div>
                </div>
                <p className="hints-footer">Press <kbd>?</kbd> anytime to see shortcuts</p>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// ENHANCED EMPTY STATE - More guidance
// ═══════════════════════════════════════════════════


export function EnhancedEmptyState() {
    // Restore old empty state content in main area, keep 1Prompt in footer
    return (
        <div className="enhanced-empty-state animate-m3-fade-in">
            <div className="empty-hero">
                <div className="hero-icon">🚀</div>
                <h1>Start Your AI Journey</h1>
                <p>Open any supported AI platform to begin extracting and organizing your prompts.</p>
            </div>
            <div className="platform-grid">
                <h3>Supported Platforms</h3>
                <div className="platforms-showcase">
                    {[
                        { name: 'ChatGPT', url: 'https://chatgpt.com', color: '#10a37f' },
                        { name: 'Claude', url: 'https://claude.ai', color: '#cc785c' },
                        { name: 'Gemini', url: 'https://gemini.google.com', color: '#4285f4' },
                        { name: 'Perplexity', url: 'https://perplexity.ai', color: '#20808d' },
                        { name: 'DeepSeek', url: 'https://chat.deepseek.com', color: '#1a73e8' },
                        { name: 'Lovable', url: 'https://lovable.dev', color: '#ff6b6b' },
                        { name: 'Bolt', url: 'https://bolt.new', color: '#f59e0b' },
                        { name: 'Cursor', url: 'https://cursor.com', color: '#000000' },
                        { name: 'Meta AI', url: 'https://meta.ai', color: '#0668e1' },
                    ].map(p => (
                        <a
                            key={p.name}
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="platform-card"
                            style={{ borderColor: p.color }}
                        >
                            <div className="platform-dot" style={{ background: p.color }}></div>
                            <span>{p.name}</span>
                            <div className="platform-arrow">→</div>
                        </a>
                    ))}
                </div>
            </div>
            <div className="getting-started-steps">
                <h3>Getting Started</h3>
                <div className="steps-flow">
                    <div className="flow-step">
                        <div className="flow-number">1</div>
                        <p>Click any platform above</p>
                    </div>
                    <div className="flow-arrow">→</div>
                    <div className="flow-step">
                        <div className="flow-number">2</div>
                        <p>Start a conversation</p>
                    </div>
                    <div className="flow-arrow">→</div>
                    <div className="flow-step">
                        <div className="flow-number">3</div>
                        <p>Come back & extract!</p>
                    </div>
                </div>
            </div>
            <div className="empty-footer-message">
                <span className="empty-main-message">
                    All you need is <b className="one-prompt-bold">1prompt</b>
                </span>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// MODE TOGGLE WITH TOOLTIPS
// ═══════════════════════════════════════════════════

interface ModeToggleProps {
    mode: 'capture' | 'compile';
    onChange: (mode: 'capture' | 'compile') => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
    return (
        <div className="mode-toggle">
            <button
                onClick={() => onChange('capture')}
                className={`toggle-btn ${mode === 'capture' ? 'active' : ''}`}
            >
                <span>Capture</span>
            </button>
            <button
                onClick={() => onChange('compile')}
                className={`toggle-btn ${mode === 'compile' ? 'active' : ''}`}
            >
                <span>Compile</span>
            </button>
        </div>
    );
}
