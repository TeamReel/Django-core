import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { themeVars } from '../../tokens/theme.css';

export const input = recipe({
  base: {
    width: '100%',
    padding: `${themeVars.spacing['2']} ${themeVars.spacing['3']}`,
    fontSize: themeVars.typography.fontSize.sm,
    lineHeight: themeVars.typography.lineHeight.normal,
    borderRadius: themeVars.radius.md,
    border: `1px solid ${themeVars.color.border.secondary}`,
    backgroundColor: themeVars.color.background.primary,
    color: themeVars.color.text.primary,
    transition: 'all 150ms ease',
    outline: 'none',

    ':focus': {
      borderColor: themeVars.color.palette.primary['500'],
      boxShadow: `0 0 0 3px ${themeVars.color.palette.primary['100']}`,
    },

    ':disabled': {
      backgroundColor: themeVars.color.palette.neutral['100'],
      color: themeVars.color.text.disabled,
      cursor: 'not-allowed',
    },

    '::placeholder': {
      color: themeVars.color.palette.neutral['400'],
    },
  },

  variants: {
    state: {
      default: {},
      error: {
        borderColor: themeVars.color.palette.error['500'],
        ':focus': {
          borderColor: themeVars.color.palette.error['500'],
          boxShadow: `0 0 0 3px ${themeVars.color.palette.error['100']}`,
        },
      },
      success: {
        borderColor: themeVars.color.palette.success['500'],
        ':hover:not(:disabled)': {
          borderColor: themeVars.color.palette.success['600'],
        },
        ':focus': {
          borderColor: themeVars.color.palette.success['500'],
          boxShadow: `0 0 0 3px ${themeVars.color.palette.success['100']}`,
        },
      },
    },
    size: {
      // Mobile accessibility: All sizes meet 44px minimum touch target (WCAG 2.5.5)
      sm: {
        minHeight: '44px',
        padding: `${themeVars.spacing['1']} ${themeVars.spacing['2']}`,
        fontSize: themeVars.typography.fontSize.xs,
      },
      md: {
        minHeight: '44px',
        padding: `${themeVars.spacing['2']} ${themeVars.spacing['3']}`,
        fontSize: themeVars.typography.fontSize.sm,
      },
      lg: {
        minHeight: '48px',
        padding: `${themeVars.spacing['3']} ${themeVars.spacing['4']}`,
        fontSize: themeVars.typography.fontSize.md,
      },
    },
  },

  defaultVariants: {
    state: 'default',
    size: 'md',
  },
});

export const label = recipe({
  base: {
    display: 'block',
    fontSize: themeVars.typography.fontSize.sm,
    fontWeight: themeVars.typography.fontWeight.medium,
    color: themeVars.color.text.secondary,
    marginBottom: themeVars.spacing['1'],
  },

  variants: {
    state: {
      default: {},
      error: {
        color: themeVars.color.palette.error['700'],
      },
      success: {
        color: themeVars.color.palette.success['700'],
      },
    },
    required: {
      true: {
        '::after': {
          content: '" *"',
          color: themeVars.color.palette.error['500'],
        },
      },
    },
  },

  defaultVariants: {
    state: 'default',
  },
});

export const helperText = recipe({
  base: {
    display: 'block',
    fontSize: themeVars.typography.fontSize.xs,
    marginTop: themeVars.spacing['1'],
    color: themeVars.color.text.tertiary,
  },

  variants: {
    state: {
      default: {},
      error: {
        color: themeVars.color.palette.error['600'],
      },
      success: {
        color: themeVars.color.palette.success['600'],
      },
    },
  },

  defaultVariants: {
    state: 'default',
  },
});

export type InputVariant = NonNullable<RecipeVariants<typeof input>>;
export type InputState = InputVariant['state'];
export type InputSize = InputVariant['size'];
