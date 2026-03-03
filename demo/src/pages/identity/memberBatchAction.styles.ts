/**
 * memberBatchAction.styles — Style constants for MemberBatchActionModal
 *
 * Extracted from MemberBatchActionModal.tsx (Phase 24).
 */

import React from 'react';

export const overlayStyle: React.CSSProperties = {
    zIndex: 9000,
    background: 'rgba(0, 0, 0, 0.6)',
};

export const modalStyle: React.CSSProperties = {
    background: 'var(--app-surface, #1a1a2e)',
    maxWidth: '720px',
    maxHeight: '90vh',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
};

export const cardStyle: React.CSSProperties = {
    padding: '14px 16px',
    borderRadius: '8px',
    border: '1px solid var(--app-border, #333)',
    background: 'var(--app-surface-2, #252540)',
};

export const radioOptionStyle = (selected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '8px',
    border: `1px solid ${selected ? 'var(--color-blue-500)' : 'var(--app-border, #333)'}`,
    background: selected ? 'rgba(59,130,246,0.08)' : 'transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
});

export const memberChipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '12px',
    background: 'rgba(59,130,246,0.12)',
    color: 'var(--app-text, #e0e0e0)',
    fontSize: '12px',
    fontWeight: 500,
};

export const progressBarBg: React.CSSProperties = {
    height: '6px',
    borderRadius: '3px',
    background: 'var(--app-border, #333)',
};
