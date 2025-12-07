import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { themeVars } from '../../tokens/theme.css';

export const button = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: themeVars.spacing['2'],
    borderRadius: themeVars.radius.md,
    fontFamily: themeVars.typography.fontFamily.sans,
    fontWeight: themeVars.typography.fontWeight.medium,
    transition: `all ${themeVars.motion.duration.fast} ${themeVars.motion.easing.default}`,
    cursor: 'pointer',
    border: 'none',
    ':focus-visible': {
      outline: `2px solid ${themeVars.color.border.focus}`,
      outlineOffset: '2px',
    },
    ':disabled': {
      cursor: 'not-allowed',
      opacity: 0.5,
    },
  },
  variants: {
    variant: {
      primary: {
        backgroundColor: themeVars.color.interactive.primary,
        color: themeVars.color.text.inverse,
        ':hover:not(:disabled)': {
          backgroundColor: themeVars.color.interactive.primaryHover,
        },
        ':active:not(:disabled)': {
          backgroundColor: themeVars.color.interactive.primaryActive,
        },
      },
      secondary: {
        backgroundColor: themeVars.color.interactive.secondary,
        color: themeVars.color.text.primary,
        ':hover:not(:disabled)': {
          backgroundColor: themeVars.color.interactive.secondaryHover,
        },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: themeVars.color.text.primary,
        ':hover:not(:disabled)': {
          backgroundColor: themeVars.color.interactive.secondary,
        },
      },
      destructive: {
        backgroundColor: themeVars.color.interactive.destructive,
        color: themeVars.color.text.inverse,
        ':hover:not(:disabled)': {
          backgroundColor: themeVars.color.interactive.destructiveHover,
        },
      },
    },
    size: {
      sm: {
        height: '32px',
        paddingLeft: themeVars.spacing['3'],
        paddingRight: themeVars.spacing['3'],
        fontSize: themeVars.typography.fontSize.sm,
      },
      md: {
        height: '40px',
        paddingLeft: themeVars.spacing['4'],
        paddingRight: themeVars.spacing['4'],
        fontSize: themeVars.typography.fontSize.md,
      },
      lg: {
        height: '48px',
        paddingLeft: themeVars.spacing['6'],
        paddingRight: themeVars.spacing['6'],
        fontSize: themeVars.typography.fontSize.lg,
      },
    },
    fullWidth: {
      true: { width: '100%' },
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export type ButtonVariant = NonNullable<
  RecipeVariants<typeof button>
>['variant'];
export type ButtonSize = NonNullable<RecipeVariants<typeof button>>['size'];
