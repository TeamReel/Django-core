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
  ...compactTdStyle,
  textAlign: 'right', // Align right
  whiteSpace: 'nowrap',
  display: 'flex',       // Ensure flex behavior for buttons
  justifyContent: 'flex-end',
  gap: '4px'
};

// Use 'primary' | 'secondary' etc to match design system variants conceptually
export const actionButtonStyle = (variant: 'primary' | 'secondary' | 'danger' | 'warning' | 'neutral'): React.CSSProperties => {
    // Default to "Ghost/Outline" style to match existing tabs
    let backgroundColor = 'transparent';
    let color = '#374151';
    let border = '1px solid #d1d5db';

    switch (variant) {
        case 'primary':
            // "View" - Blue Outline to match "Other tabs" but blue text
            backgroundColor = '#eff6ff'; // Light blue bg
            color = '#2563eb';           // Blue text
            border = '1px solid #bfdbfe'; // Blue border
            break;
        case 'danger':
            // "Delete" - Red Outline
            backgroundColor = '#fef2f2';
            color = '#dc2626';
            border = '1px solid #fecaca';
            break;
        case 'warning':
            // "Edit" - Orange/Yellow Outline
            backgroundColor = '#fffbeb';
            color = '#d97706';
            border = '1px solid #fde68a';
            break;
        case 'neutral':
            // Default/Secondary
            backgroundColor = '#f9fafb';
            color = '#374151';
            border = '1px solid #e5e7eb';
            break;
    }

    return {
        padding: '4px 8px',
        fontSize: '12px',
        borderRadius: '4px',
        cursor: 'pointer',
        backgroundColor,
        color,
        border,
        marginLeft: '4px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 500
    };
};
