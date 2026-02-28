import React from 'react';

export const compactTableStyle: React.CSSProperties = {
  tableLayout: 'auto',
  width: '100%',
  minWidth: '900px',
  borderCollapse: 'collapse',
  fontSize: '13px', // Slightly smaller for compactness
  marginBottom: '2px' // Prevent last-row bottom border from being clipped by overflow containers
};

export const compactThStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: '0.8rem',
  textAlign: 'left',
  borderBottom: '2px solid var(--app-border)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

export const compactTdStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: '0.85rem',
  verticalAlign: 'middle',
  borderBottom: '1px solid var(--app-border)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

export const compactTextTdStyle: React.CSSProperties = {
  ...compactTdStyle,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
};

export const compactActionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  flexWrap: 'nowrap',
  alignItems: 'center'
};

// Centralized action button styling - use this everywhere for View/Edit/Delete buttons in tables
export type ActionTone = 'neutral' | 'primary' | 'warning' | 'danger' | 'success';

export const actionButtonStyle = (tone: ActionTone = 'neutral'): React.CSSProperties => {
  const base: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '12px',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
  };

  // View / Primary: Outline (Link Color)
  if (tone === 'primary') {
    return { ...base, border: '1px solid var(--app-link)', color: 'var(--app-link)' };
  }

  // Edit / Warning: Outline (Warning Color)
  if (tone === 'warning') {
    return { ...base, border: '1px solid var(--app-warning)', color: 'var(--app-warning)' };
  }

  // Delete / Danger: Outline (Error Color)
  if (tone === 'danger') {
    return { ...base, border: '1px solid var(--app-error)', color: 'var(--app-error)' };
  }

  // Success: Outline (Success Color)
  if (tone === 'success') {
    return { ...base, border: '1px solid var(--app-success, #10b981)', color: 'var(--app-success, #10b981)' };
  }

  // Neutral
  return { ...base, border: '1px solid var(--app-border)', color: 'var(--app-muted-text)' };
};

// Larger "Call To Action" buttons for prominent actions like "Add User", "Assign", etc.
export const ctaButtonStyle = (tone: ActionTone = 'neutral'): React.CSSProperties => ({
  ...actionButtonStyle(tone),
  padding: '8px 16px',
  fontSize: '14px',
  minWidth: '120px',
});
