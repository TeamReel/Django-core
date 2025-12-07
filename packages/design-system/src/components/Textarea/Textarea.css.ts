import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { themeVars } from '../../tokens/theme.css';

export const textarea = recipe({
  base: {
    width: '100%',
    padding: themeVars.spacing['4'], // md: 16px
    fontSize: themeVars.typography.fontSize.md,
    fontFamily: 'inherit',
    lineHeight: '1.5',
    color: themeVars.color.text.primary,
    backgroundColor: themeVars.color.background.secondary,
    border: `1px solid ${themeVars.color.border.primary}`,
    borderRadius: themeVars.radius.md,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    minHeight: '80px',

    ':focus': {
      outline: 'none',
      borderColor: themeVars.color.palette.primary['500'],
      boxShadow: `0 0 0 3px ${themeVars.color.palette.primary['100']}`,
    },

    ':disabled': {
      backgroundColor: themeVars.color.palette.neutral['100'],
      color: themeVars.color.text.disabled,
      cursor: 'not-allowed',
    },

    '::placeholder': {
      color: themeVars.color.text.secondary,
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
        ':focus': {
          borderColor: themeVars.color.palette.success['500'],
          boxShadow: `0 0 0 3px ${themeVars.color.palette.success['100']}`,
        },
      },
    },

    size: {
      sm: {
        padding: themeVars.spacing['3'], // 12px
        fontSize: themeVars.typography.fontSize.sm,
      },
      md: {
        padding: themeVars.spacing['4'], // 16px
        fontSize: themeVars.typography.fontSize.md,
      },
      lg: {
        padding: themeVars.spacing['6'], // 24px
        fontSize: themeVars.typography.fontSize.lg,
      },
    },

    resize: {
      none: {
        resize: 'none',
      },
      vertical: {
        resize: 'vertical',
      },
      both: {
        resize: 'both',
      },
    },
  },

  defaultVariants: {
    state: 'default',
    size: 'md',
    resize: 'vertical',
  },
});

export const label = recipe({
  base: {
    display: 'block',
    fontSize: themeVars.typography.fontSize.sm,
    fontWeight: 500,
    color: themeVars.color.text.primary,
    marginBottom: themeVars.spacing['2'], // xs: 8px
  },

  variants: {
    state: {
      default: {},
      error: {
        color: themeVars.color.palette.error['500'],
      },
      success: {
        color: themeVars.color.palette.success['500'],
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
    marginTop: themeVars.spacing['2'], // xs: 8px
    color: themeVars.color.text.secondary,
  },

  variants: {
    state: {
      default: {},
      error: {
        color: themeVars.color.palette.error['500'],
      },
      success: {
        color: themeVars.color.palette.success['500'],
      },
    },
  },

  defaultVariants: {
    state: 'default',
  },
});

export type TextareaState = NonNullable<RecipeVariants<typeof textarea>>['state'];
export type TextareaSize = NonNullable<RecipeVariants<typeof textarea>>['size'];
export type TextareaResize = NonNullable<RecipeVariants<typeof textarea>>['resize'];
