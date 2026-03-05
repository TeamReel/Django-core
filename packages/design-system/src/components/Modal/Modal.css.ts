import { style, globalStyle } from '@vanilla-extract/css';
import { themeVars } from '../../tokens/theme.css';

export const modalOverlay = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: themeVars.spacing['4'],
  '@media': {
    '(max-width: 639px)': {
      top: '57px',
      bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
      alignItems: 'flex-end',
      padding: 0,
    },
  },
});

export const modalContent = style({
  backgroundColor: themeVars.color.background.primary,
  borderRadius: themeVars.radius.md,
  boxShadow: themeVars.shadow.lg,
  maxWidth: '600px',
  width: '100%',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  '@media': {
    '(max-width: 639px)': {
      maxWidth: '100%',
      maxHeight: '100%',
      borderRadius: '16px 16px 0 0',
      boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.15)',
    },
  },
});

/* Drag handle indicator for mobile bottom sheet */
export const modalDragHandle = style({
  display: 'none',
  '@media': {
    '(max-width: 639px)': {
      display: 'flex',
      justifyContent: 'center',
      padding: '10px 0 2px',
      cursor: 'grab',
    },
  },
});

export const modalDragBar = style({
  width: '36px',
  height: '4px',
  borderRadius: '2px',
  backgroundColor: themeVars.color.border.primary,
  opacity: 0.6,
});

export const modalHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: themeVars.spacing['6'],
  borderBottom: `1px solid ${themeVars.color.border.primary}`,
});

globalStyle(`${modalHeader} h2`, {
  margin: 0,
  fontSize: themeVars.typography.fontSize.lg,
  fontWeight: themeVars.typography.fontWeight.semibold,
  color: themeVars.color.text.primary,
});

export const modalCloseButton = style({
  background: 'none',
  border: 'none',
  fontSize: '24px',
  lineHeight: 1,
  cursor: 'pointer',
  padding: themeVars.spacing['2'],
  color: themeVars.color.text.secondary,
  transition: 'color 0.2s',
  ':hover': {
    color: themeVars.color.text.primary,
  },
  ':focus': {
    outline: `2px solid ${themeVars.color.border.focus}`,
    outlineOffset: '2px',
  },
});

export const modalBody = style({
  padding: themeVars.spacing['6'],
  overflow: 'auto',
  flex: 1,
});

export const modalFooter = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: themeVars.spacing['3'],
  padding: themeVars.spacing['6'],
  borderTop: `1px solid ${themeVars.color.border.primary}`,
});
