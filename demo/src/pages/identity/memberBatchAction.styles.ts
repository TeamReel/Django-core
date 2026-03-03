/**
 * memberBatchAction.styles — Style constants for MemberBatchActionModal
 *
 * Extracted from MemberBatchActionModal.tsx (Phase 24).
 */

import React from 'react';

export const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9000,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
};

export const modalStyle: React.CSSProperties = {
    background: 'var(--app-surface, #1a1a2e)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '720px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    border: '1px solid var(--app-border, #333)',
};

export const headerStyle: React.CSSProperties = {
    padding: '20px 24px',
    borderBottom: '1px solid var(--app-border, #333)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
};

export const bodyStyle: React.CSSProperties = {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
};

export const footerStyle: React.CSSProperties = {
    padding: '16px 24px',
    borderTop: '1px solid var(--app-border, #333)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
};

export const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--app-border, #555)',
    background: 'var(--app-surface-2, #252540)',
    color: 'var(--app-text, #e0e0e0)',
    fontSize: '14px',
    width: '100%',
};

export const sectionStyle: React.CSSProperties = {
    marginBottom: '20px',
};

export const sectionTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '8px',
    color: 'var(--app-text, #fff)',
};

export const cardStyle: React.CSSProperties = {
    padding: '14px 16px',
    borderRadius: '8px',
    border: '1px solid var(--app-border, #333)',
    background: 'var(--app-surface-2, #252540)',
};

export const radioGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
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
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: 'var(--app-border, #333)',
    overflow: 'hidden',
    marginTop: '12px',
};
