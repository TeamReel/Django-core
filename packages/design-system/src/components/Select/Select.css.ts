import { style } from '@vanilla-extract/css';
import { themeVars } from '../../tokens/theme.css';

export const selectContainer = style({
  position: 'relative',
  width: '100%',
});

export const selectButton = style({
  width: '100%',
  padding: `${themeVars.spacing['2']} ${themeVars.spacing['3']}`,
  backgroundColor: themeVars.color.background.primary,
  border: `1px solid ${themeVars.color.border.primary}`,
  borderRadius: themeVars.radius.md,
  fontSize: themeVars.typography.fontSize.md,
  color: themeVars.color.text.primary,
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  transition: 'all 0.2s',
  ':hover': {
    borderColor: themeVars.color.border.focus,
  },
  ':focus': {
    outline: `2px solid ${themeVars.color.border.focus}`,
    outlineOffset: '2px',
  },
  ':disabled': {
    cursor: 'not-allowed',
    opacity: 0.5,
    backgroundColor: themeVars.color.background.secondary,
  },
});

export const selectDropdown = style({
  backgroundColor: themeVars.color.background.primary,
  border: `1px solid ${themeVars.color.border.primary}`,
  borderRadius: themeVars.radius.md,
  boxShadow: themeVars.shadow.lg,
  overflow: 'auto',
  zIndex: 1000,
  minWidth: '200px',
});

export const selectOption = style({
  padding: `${themeVars.spacing['2']} ${themeVars.spacing['3']}`,
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  transition: 'background-color 0.2s',
  color: themeVars.color.text.primary,
  selectors: {
    '&[aria-disabled="true"]': {
      cursor: 'not-allowed',
      opacity: 0.5,
      color: themeVars.color.text.disabled,
    },
  },
});

export const selectOptionActive = style({
  backgroundColor: themeVars.color.background.secondary,
});

export const selectOptionSelected = style({
  backgroundColor: themeVars.color.interactive.primary,
  color: themeVars.color.text.inverse,
  ':hover': {
    backgroundColor: themeVars.color.interactive.primaryHover,
  },
});
