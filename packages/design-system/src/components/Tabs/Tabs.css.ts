import { style } from '@vanilla-extract/css';
import { themeVars } from '../../tokens/theme.css';

export const tabsContainer = style({
  display: 'flex',
  flexDirection: 'column',
});

export const tabList = style({
  display: 'flex',
  borderBottom: `2px solid ${themeVars.color.border.primary}`,
});

export const tabListHorizontal = style({
  flexDirection: 'row',
  gap: themeVars.spacing['1'],
});

export const tabListVertical = style({
  flexDirection: 'column',
  borderBottom: 'none',
  borderRight: `2px solid ${themeVars.color.border.primary}`,
});

export const tab = style({
  background: 'none',
  border: 'none',
  // Mobile accessibility: Meet 44px minimum touch target (WCAG 2.5.5)
  minHeight: '44px',
  padding: `${themeVars.spacing['3']} ${themeVars.spacing['4']}`,
  fontSize: themeVars.typography.fontSize.md,
  fontWeight: themeVars.typography.fontWeight.medium,
  color: themeVars.color.text.secondary,
  cursor: 'pointer',
  transition: 'all 0.2s',
  position: 'relative',
  borderRadius: `${themeVars.radius.md} ${themeVars.radius.md} 0 0`,
  ':hover': {
    color: themeVars.color.text.primary,
    backgroundColor: themeVars.color.background.secondary,
  },
  ':focus': {
    outline: `2px solid ${themeVars.color.border.focus}`,
    outlineOffset: '-2px',
  },
  ':disabled': {
    cursor: 'not-allowed',
    opacity: 0.5,
    color: themeVars.color.text.disabled,
  },
});

export const tabSelected = style({
  color: themeVars.color.text.primary,
  fontWeight: themeVars.typography.fontWeight.semibold,
  '::after': {
    content: '""',
    position: 'absolute',
    bottom: '-2px',
    left: 0,
    right: 0,
    height: '2px',
    backgroundColor: themeVars.color.interactive.primary,
  },
});

export const tabPanel = style({
  padding: themeVars.spacing['6'],
  ':focus': {
    outline: `2px solid ${themeVars.color.border.focus}`,
    outlineOffset: '-2px',
  },
});
