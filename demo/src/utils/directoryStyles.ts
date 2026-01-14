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

// Use 'primary' | 'secondary' etc to match design system variants conceptually
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
  };

  // Match Federations tab button tones
  if (variant === 'primary') {
    return { ...base, border: '1px solid var(--app-link)', color: 'var(--app-link)' };
  }
  if (variant === 'warning') {
    return { ...base, border: '1px solid var(--app-warning)', color: 'var(--app-warning)' };
  }
  if (variant === 'danger') {
    return { ...base, border: '1px solid var(--app-error)', color: 'var(--app-error)' };
  }

  // secondary / neutral
  return { ...base, border: '1px solid #6c757d', color: '#6c757d' };
};
