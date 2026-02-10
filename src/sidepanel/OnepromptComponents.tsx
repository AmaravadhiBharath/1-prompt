// OnepromptComponents.tsx - UX Enhancement Components for 1prompt
// Minimal, Material 3 inspired, 150-200ms animations

import { ReactNode } from 'react';
import type { Mode } from '../types';

// ═══════════════════════════════════════════════════
// LOADING STATE
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// LOADING STATE (POLISHED)
// ═══════════════════════════════════════════════════

interface LoadingStateProps {
    message: string;
}

export function LoadingState({ message }: LoadingStateProps) {


    return (
        <div className="loading-container-polished">
            <div className="loader-ring">
                <div className="loader-center">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        <div className="loader-center-icon"></div>
                    </div>
                </div>
            </div>

            <div className="loading-text-stack">
                <div>{message || 'Loading.'}</div>
                {/* <div>Extracting.</div>
                <div>Drafting...</div> */}
            </div>

            <div className="loading-stats-row">
                <div className="loading-stat-item">
                    <span className="loading-stat-value">2.3</span>
                    <span className="loading-stat-label">seconds</span>
                </div>
                <div className="loading-stat-item">
                    <span className="loading-stat-value">--</span>
                    <span className="loading-stat-label">prompts</span>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// ERROR STATE
// ═══════════════════════════════════════════════════

interface ErrorStateProps {
    error: string;
    onRetry: () => void;
    onDismiss: () => void;
}

export function ErrorState({ error, onRetry, onDismiss }: ErrorStateProps) {
    return (
        <div className="error-state">
            <div className="error-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            </div>
            <div className="error-message">{error}</div>
            <div className="error-actions">
                <button className="error-retry-btn" onClick={onRetry}>
                    Try Again
                </button>
                <button className="error-dismiss-btn" onClick={onDismiss}>
                    Dismiss
                </button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// TOAST NOTIFICATION
// ═══════════════════════════════════════════════════

interface ToastProps {
    visible: boolean;
    message: string;
}

export function Toast({ visible, message }: ToastProps) {
    return (
        <div className={`toast ${visible ? 'visible' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
            </svg>
            {message}
        </div>
    );
}

// ═══════════════════════════════════════════════════
// CONFIRM DIALOG
// ═══════════════════════════════════════════════════

interface ConfirmDialogProps {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({ visible, title, message, confirmLabel = 'Delete', onConfirm, onCancel }: ConfirmDialogProps) {
    if (!visible) return null;

    return (
        <div className="confirm-overlay" onClick={onCancel}>
            <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
                <div className="confirm-title">{title}</div>
                <div className="confirm-message">{message}</div>
                <div className="confirm-actions">
                    <button className="confirm-cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="confirm-danger" onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// TOOLTIP
// ═══════════════════════════════════════════════════

interface TooltipProps {
    content: string;
    children: ReactNode;
    fullWidth?: boolean;
}

export function Tooltip({ children }: TooltipProps) {
    // Tooltips disabled per user request
    return <>{children}</>;
}

// ═══════════════════════════════════════════════════
// SELECTION TOOLBAR
// ═══════════════════════════════════════════════════

interface SelectionToolbarProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onClearAll: () => void;
}

export function SelectionToolbar({ selectedCount, totalCount, onSelectAll, onClearAll }: SelectionToolbarProps) {
    return (
        <div className="selection-toolbar">
            <button
                className="toolbar-btn"
                onClick={onSelectAll}
                disabled={selectedCount === totalCount}
            >
                All
            </button>
            <button
                className="toolbar-btn"
                onClick={onClearAll}
                disabled={selectedCount === 0}
            >
                Clear
            </button>
            <span className="toolbar-count">
                {selectedCount} of {totalCount} selected
            </span>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// PROMPT COUNT HEADER
// ═══════════════════════════════════════════════════

interface PromptCountHeaderProps {
    count: number;
    platform: string | null;
    mode: Mode;
}

export function PromptCountHeader({ count, platform, mode }: PromptCountHeaderProps) {
    const modeLabel = mode === 'capture' ? 'Extracted' : 'Compiled';

    return (
        <div className="prompt-count-header">
            <span className="count-text">
                {count} prompt{count !== 1 ? 's' : ''} {modeLabel.toLowerCase()}
            </span>
            {platform && (
                <span className="count-platform">from {platform}</span>
            )}
        </div>
    );
}
