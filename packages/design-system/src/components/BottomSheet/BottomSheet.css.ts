import { style, keyframes } from '@vanilla-extract/css';
import { themeVars } from '../../tokens/theme.css';

const slideUp = keyframes({
  '0%': { transform: 'translateY(100%)' },
  '100%': { transform: 'translateY(0)' },
});

const slideDown = keyframes({
  '0%': { transform: 'translateY(0)' },
  '100%': { transform: 'translateY(100%)' },
});

const fadeIn = keyframes({
  '0%': { opacity: 0 },
  '100%': { opacity: 1 },
});

const fadeOut = keyframes({
  '0%': { opacity: 1 },
  '100%': { opacity: 0 },
});

export const bottomSheetOverlay = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 1090,
  animation: `${fadeIn} 200ms ease-out`,
  '@media': {
    '(max-width: 639px)': {
      top: 'var(--tr-top-navbar-offset, 57px)',
      bottom: 'var(--tr-bottom-navbar-offset, calc(80px + env(safe-area-inset-bottom, 0px)))',
    },
  },
});

export const bottomSheetOverlayClosing = style({
  animation: `${fadeOut} 200ms ease-out forwards`,
});

export const bottomSheetContainer = style({
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1091,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: themeVars.color.background.primary,
  borderTopLeftRadius: themeVars.radius.lg,
  borderTopRightRadius: themeVars.radius.lg,
  boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
  maxHeight: '90vh',
  animation: `${slideUp} 300ms cubic-bezier(0.32, 0.72, 0, 1)`,
  // Safe area padding for notched devices
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  // Touch action for gesture support (desktop / drag handle only)
  touchAction: 'none',
  '@media': {
    '(max-width: 639px)': {
      /* Sit between dynamic top & bottom nav offsets (runtime measured). */
      top: 'var(--tr-top-navbar-offset, 57px)',
      bottom: 'var(--tr-bottom-navbar-offset, calc(80px + env(safe-area-inset-bottom, 0px)))',
      maxHeight: 'none',
      overflow: 'hidden',
      borderTopLeftRadius: '16px',
      borderTopRightRadius: '16px',
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      paddingBottom: 0,
      /* Allow vertical touch scrolling inside child scroll areas */
      touchAction: 'pan-y',
    },
  },
});

export const bottomSheetContainerClosing = style({
  animation: `${slideDown} 200ms ease-in forwards`,
});

export const bottomSheetDragHandle = style({
  display: 'flex',
  justifyContent: 'center',
  padding: `${themeVars.spacing['3']} 0`,
  cursor: 'grab',
  // Mobile accessibility: 44px minimum touch target
  minHeight: '44px',
  alignItems: 'center',
  ':active': {
    cursor: 'grabbing',
  },
});

export const bottomSheetDragIndicator = style({
  width: '36px',
  height: '4px',
  backgroundColor: themeVars.color.border.secondary,
  borderRadius: '2px',
});

export const bottomSheetHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `0 ${themeVars.spacing['5']} ${themeVars.spacing['4']}`,
  borderBottom: `1px solid ${themeVars.color.border.primary}`,
});

export const bottomSheetTitle = style({
  margin: 0,
  fontSize: themeVars.typography.fontSize.lg,
  fontWeight: themeVars.typography.fontWeight.semibold,
  color: themeVars.color.text.primary,
});

export const bottomSheetCloseButton = style({
  background: 'none',
  border: 'none',
  fontSize: '24px',
  lineHeight: 1,
  cursor: 'pointer',
  // Mobile accessibility: 44px minimum touch target
  minWidth: '44px',
  minHeight: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: themeVars.color.text.secondary,
  borderRadius: themeVars.radius.md,
  transition: 'all 0.2s',
  ':hover': {
    color: themeVars.color.text.primary,
    backgroundColor: themeVars.color.background.secondary,
  },
  ':focus': {
    outline: `2px solid ${themeVars.color.border.focus}`,
    outlineOffset: '2px',
  },
});

export const bottomSheetBody = style({
  display: 'flex',
  flexDirection: 'column',
  padding: themeVars.spacing['5'],
  overflowY: 'auto',
  overflowX: 'hidden',
  flex: 1,
  minHeight: 0,
  // Smooth scrolling on iOS
  WebkitOverflowScrolling: 'touch',
  '@media': {
    '(max-width: 639px)': {
      /* On mobile the sheet fills between navbars — body must NOT scroll
         so inner flex children (scrollArea + bottomBar) lay out correctly. */
      overflowY: 'hidden',
    },
  },
});

export const bottomSheetFooter = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'stretch',
  gap: themeVars.spacing['3'],
  padding: themeVars.spacing['5'],
  borderTop: `1px solid ${themeVars.color.border.primary}`,
});
