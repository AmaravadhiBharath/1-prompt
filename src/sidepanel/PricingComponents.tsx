/**
 * Pricing Tier UI Components
 * Shows upgrade prompts, tier badges, and pricing modals
 */

import { UserTier, PRO_PRICING } from "../services/pricing";

interface TierBadgeProps {
  tier: UserTier;
  remaining?: number;
}

export function TierBadge({ tier, remaining }: TierBadgeProps) {
  if (tier === "guest") {
    return (
      <div className="tier-badge guest">
        <span className="tier-icon">👤</span>
        <span className="tier-text">Basic</span>
        {remaining !== undefined && (
          <span className="tier-remaining">{remaining}/10</span>
        )}
      </div>
    );
  }

  if (tier === "free" || tier === "go") {
    return (
      <div className="tier-badge go">
        <span className="tier-icon">🚀</span>
        <span className="tier-text">Go</span>
        {remaining !== undefined && (
          <span className="tier-remaining">{remaining} Left</span>
        )}
      </div>
    );
  }

  return (
    <div className="tier-badge pro">
      <span className="tier-icon">⭐</span>
      <span className="tier-text">Pro</span>
    </div>
  );
}

interface UpgradePromptProps {
  currentTier: UserTier;
  onSignIn: () => void;
  onUpgradeToPro: () => void;
  onClose: () => void;
}

export function UpgradePrompt({
  currentTier,
  onSignIn,
  onUpgradeToPro,
  onClose,
}: UpgradePromptProps) {
  // Basic (Guest) -> Encourage login for Go (Free)
  if (currentTier === "guest") {
    return (
      <div className="upgrade-modal">
        <div className="upgrade-content">
          <button className="upgrade-close" onClick={onClose}>
            ×
          </button>
          <div className="upgrade-header">
            <h3>🚀 Unlock Go Tier (Free!)</h3>
            <p>
              You're on Basic. Sign in to get <b>Unlimited Captures</b> and more
              for FREE!
            </p>
          </div>

          <div className="upgrade-features" style={{ margin: "24px 0" }}>
            <div className="feature-item">
              <span className="feature-icon">✨</span>
              <span>Unlimited content captures</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">☁️</span>
              <span>History & Sync across devices</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📍</span>
              <span>Pin your favorite prompts</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span>10 Compiles per day</span>
            </div>
          </div>

          <button
            className="kb-google-btn"
            onClick={onSignIn}
            style={{ width: "100%", marginTop: 8 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in & Upgrade to Go
          </button>
        </div>
      </div>
    );
  }

  // Go (Free) -> Encourage upgrade to Pro
  if (currentTier === "free" || currentTier === "go") {
    return (
      <div className="upgrade-modal">
        <div className="upgrade-content">
          <button className="upgrade-close" onClick={onClose}>
            ×
          </button>
          <div className="upgrade-header">
            <h3>⭐ Upgrade to Pro</h3>
            <div className="pricing-display">
              <span className="price-new">
                ${PRO_PRICING.regularPrice}/month
              </span>
            </div>
            <p>Get unlimited power and advanced control.</p>
          </div>

          <div className="upgrade-features" style={{ margin: "24px 0" }}>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span>
                <b>Unlimited</b> session compiles
              </span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🧠</span>
              <span>Access to Advanced Models</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">�️</span>
              <span>Custom DOM & API options</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💬</span>
              <span>Priority Support</span>
            </div>
          </div>

          <button
            className="kb-btn-primary"
            onClick={onUpgradeToPro}
            style={{ width: "100%", padding: "12px", height: "48px" }}
          >
            Upgrade to Pro
          </button>

          <p className="upgrade-note">Cancel anytime</p>
        </div>
      </div>
    );
  }

  return null;
}

interface PasteButtonProps {
  onPaste: () => void;
}

export function PasteButton({ onPaste }: PasteButtonProps) {
  return (
    <div className="paste-notification">
      <div className="paste-content">
        <span className="paste-icon">📋</span>
        <span className="paste-text">Prompt copied to clipboard</span>
        <button className="paste-btn" onClick={onPaste}>
          Paste & Edit
        </button>
      </div>
    </div>
  );
}
