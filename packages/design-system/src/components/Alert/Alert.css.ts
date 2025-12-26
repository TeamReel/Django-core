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
        backgroundColor: themeVars.color.background.info,
        borderColor: themeVars.color.interactive.primary,
        color: themeVars.color.text.link,
      },
      success: {
        backgroundColor: themeVars.color.background.success,
        borderColor: themeVars.color.text.success,
        color: themeVars.color.text.success,
      },
      warning: {
        backgroundColor: themeVars.color.background.warning,
        borderColor: themeVars.color.text.warning,
        color: themeVars.color.text.warning,
      },
      error: {
        backgroundColor: themeVars.color.background.error,
        borderColor: themeVars.color.text.error,
        color: themeVars.color.text.error,
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
        color: themeVars.color.interactive.primary,
      },
      success: {
        color: themeVars.color.text.success,
      },
      warning: {
        color: themeVars.color.text.warning,
      },
      error: {
        color: themeVars.color.text.error,
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
