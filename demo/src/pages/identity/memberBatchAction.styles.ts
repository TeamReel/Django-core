/**
 * memberBatchAction.styles — Style constants for MemberBatchActionModal
 *
 * Extracted from MemberBatchActionModal.tsx (Phase 24).
 */

import React from 'react';

export const overlayStyle: React.CSSProperties = {
    zIndex: 'var(--z-max)',
    background: 'rgba(0, 0, 0, 0.6)',
};

export const modalStyle: React.CSSProperties = {
    background: 'var(--app-surface, #1a1a2e)',
    maxWidth: '720px',
    maxHeight: '90vh',
    boxShadow: 'var(--shadow-xl)',
};

export const cardStyle: React.CSSProperties = {
    padding: 'var(--space-4) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--app-border, #333)',
    background: 'var(--app-surface-2, #252540)',
};

export const radioOptionStyle = (selected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-3)',
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-md)',
    border: `1px solid ${selected ? 'var(--color-blue-500)' : 'var(--app-border, #333)'}`,
    background: selected ? 'rgba(59,130,246,0.08)' : 'transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
});

export const memberChipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-1)',
    padding: 'var(--space-1) var(--space-3)',
    borderRadius: 'var(--radius-lg)',
    background: 'rgba(59,130,246,0.12)',
    color: 'var(--app-text, #e0e0e0)',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--font-medium)',
};

export const progressBarBg: React.CSSProperties = {
    height: '6px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--app-border, #333)',
};
