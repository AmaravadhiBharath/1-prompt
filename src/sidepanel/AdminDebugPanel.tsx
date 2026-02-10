/**
 * Admin Debug Panel - Tier Switcher
 * Only visible to admin users for testing different tier UIs
 */

import { type UserTier, type ChromeUser } from "../services/auth";

interface DebugPanelProps {
  user: ChromeUser | null;
  currentTier: UserTier;
  onTierChange: () => void;
}

// Admin Debug Panel removed for production build
// Admin Debug Panel removed for production build
export function AdminDebugPanel({}: DebugPanelProps) {
  return null;
}
