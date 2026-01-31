import React from 'react';

export const compactTableStyle: React.CSSProperties = {
  tableLayout: 'fixed',
  width: '100%',
  minWidth: '1200px',
  borderCollapse: 'collapse',
  fontSize: '13px' // Slightly smaller for compactness
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

// Use 'primary' | 'secondary' | 'danger' | 'warning' | 'neutral' to match design system variants conceptually
export const actionButtonStyle = (variant: 'primary' | 'secondary' | 'danger' | 'warning' | 'neutral'): React.CSSProperties => {
  const base: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: 'var(--app-surface)',
    cursor: 'pointer',
    fontSize: '12px',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  };

  // View / Primary: Outline (Link Color)
  if (variant === 'primary') {
    return {
      ...base,
      color: 'var(--app-link)',
      border: '1px solid var(--app-link)'
    };
  }

  // Edit / Warning: Outline (Warning Color)
  if (variant === 'warning') {
    return {
      ...base,
      color: 'var(--app-warning)',
      border: '1px solid var(--app-warning)'
    };
  }

  // Delete / Danger: Outline (Error Color)
  if (variant === 'danger') {
    return {
      ...base,
      border: '1px solid var(--app-error)',
      color: 'var(--app-error)'
    };
  }

  // secondary / neutral
  return { ...base, backgroundColor: 'var(--app-surface-2)', color: 'var(--app-text)', border: '1px solid var(--app-border)' };
};
