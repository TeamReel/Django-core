import React from 'react';

export const compactTableStyle: React.CSSProperties = {
  tableLayout: 'fixed',
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px' // Slightly smaller for compactness
};

export const compactThStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: '0.8rem',
  textAlign: 'left',
  borderBottom: '2px solid var(--app-border)',
  whiteSpace: 'nowrap'
};

export const compactTdStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: '0.85rem',
  verticalAlign: 'middle',
  borderBottom: '1px solid #eee'
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
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  };

  // View / Primary: Outline (Link Color)
  if (variant === 'primary') {
    return {
      ...base,
      backgroundColor: 'transparent',
      color: 'var(--app-link)',
      border: '1px solid var(--app-link)'
    };
  }

  // Edit / Warning: Outline (Warning Color)
  if (variant === 'warning') {
    return {
      ...base,
      backgroundColor: 'transparent',
      color: 'var(--app-warning)',
      border: '1px solid var(--app-warning)'
    };
  }

  // Delete / Danger: Outline (Error Color)
  if (variant === 'danger') {
    return {
      ...base,
      backgroundColor: 'transparent',
      border: '1px solid var(--app-error)',
      color: 'var(--app-error)'
    };
  }

  // secondary / neutral
  return { ...base, backgroundColor: '#f0f0f0', color: '#333', border: '1px solid #ccc' };
};
