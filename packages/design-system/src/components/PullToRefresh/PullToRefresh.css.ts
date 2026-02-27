import { style, keyframes } from '@vanilla-extract/css';
import { themeVars } from '../../tokens/theme.css';

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

export const pullToRefreshContainer = style({
  position: 'relative',
  overflow: 'hidden',
  touchAction: 'pan-y',
  WebkitOverflowScrolling: 'touch',
});

export const pullToRefreshIndicator = style({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 60,
  transform: 'translateY(-100%)',
  transition: 'transform 0.2s ease-out',
  backgroundColor: themeVars.color.background.primary,
  zIndex: 10,
});

export const pullToRefreshIndicatorPulling = style({
  // Dynamic transform applied via inline style
});

export const pullToRefreshIndicatorRefreshing = style({
  transform: 'translateY(0)',
});

export const pullToRefreshSpinner = style({
  width: 24,
  height: 24,
  borderRadius: '50%',
  border: `2px solid ${themeVars.color.border.primary}`,
  borderTopColor: themeVars.color.interactive.primary,
  animation: `${spin} 0.8s linear infinite`,
});

export const pullToRefreshArrow = style({
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.2s ease-out',
  color: themeVars.color.text.secondary,
  fontSize: 20,
});

export const pullToRefreshArrowReady = style({
  transform: 'rotate(180deg)',
  color: themeVars.color.interactive.primary,
});

export const pullToRefreshText = style({
  marginLeft: 8,
  fontSize: 14,
  color: themeVars.color.text.secondary,
});

export const pullToRefreshContent = style({
  minHeight: '100%',
});
