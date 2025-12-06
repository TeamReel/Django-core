import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { style } from '@vanilla-extract/css';
import { themeVars } from '../../tokens/theme.css';

export const alert = recipe({
  base: {
    display: 'flex',
    gap: themeVars.spacing['3'],
    padding: themeVars.spacing['4'],
    borderRadius: themeVars.radius.md,
    border: '1px solid',
    fontSize: themeVars.typography.fontSize.sm,
    lineHeight: themeVars.typography.lineHeight.normal,
  },
  variants: {
    variant: {
      info: {
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6',
        color: '#1e40af',
      },
      success: {
        backgroundColor: '#f0fdf4',
        borderColor: '#22c55e',
        color: '#15803d',
      },
      warning: {
        backgroundColor: '#fefce8',
        borderColor: '#eab308',
        color: '#854d0e',
      },
      error: {
        backgroundColor: '#fef2f2',
        borderColor: '#ef4444',
        color: '#991b1b',
      },
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

export const alertIcon = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    flexShrink: 0,
    fontWeight: 'bold',
    fontSize: '16px',
  },
  variants: {
    variant: {
      info: {
        color: '#3b82f6',
      },
      success: {
        color: '#22c55e',
      },
      warning: {
        color: '#eab308',
      },
      error: {
        color: '#ef4444',
      },
    },
  },
});

export const alertContent = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: themeVars.spacing['1'],
});

export const alertClose = style({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '20px',
  lineHeight: 1,
  padding: 0,
  color: 'inherit',
  opacity: 0.7,
  transition: 'opacity 0.2s',
  ':hover': {
    opacity: 1,
  },
  ':focus': {
    outline: `2px solid currentColor`,
    outlineOffset: '2px',
  },
});

export type AlertVariant = NonNullable<RecipeVariants<typeof alert>>['variant'];
