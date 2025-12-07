import { style } from '@vanilla-extract/css';
import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { themeVars } from '../../tokens/theme.css';

export const container = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: themeVars.spacing['3'], // sm: 12px
  cursor: 'pointer',
  userSelect: 'none',

  selectors: {
    '&[data-disabled="true"]': {
      cursor: 'not-allowed',
      opacity: 0.6,
    },
  },
});

export const checkboxWrapper = style({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const hiddenInput = style({
  position: 'absolute',
  opacity: 0,
  width: 0,
  height: 0,
  margin: 0,
  padding: 0,
});

export const checkbox = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: themeVars.radius.sm,
    border: `2px solid ${themeVars.color.border.primary}`,
    backgroundColor: themeVars.color.background.primary,
    transition: 'all 0.2s',
    flexShrink: 0,

    selectors: {
      [`${hiddenInput}:focus-visible + &`]: {
        outline: `2px solid ${themeVars.color.palette.primary['500']}`,
        outlineOffset: '2px',
      },

      [`${hiddenInput}:checked + &`]: {
        backgroundColor: themeVars.color.palette.primary['500'],
        borderColor: themeVars.color.palette.primary['500'],
      },

      [`${hiddenInput}:indeterminate + &`]: {
        backgroundColor: themeVars.color.palette.primary['500'],
        borderColor: themeVars.color.palette.primary['500'],
      },

      [`${hiddenInput}:disabled + &`]: {
        backgroundColor: themeVars.color.palette.neutral['100'],
        borderColor: themeVars.color.border.primary,
        cursor: 'not-allowed',
      },
    },
  },

  variants: {
    state: {
      default: {},
      error: {
        borderColor: themeVars.color.palette.error['500'],
        selectors: {
          [`${hiddenInput}:checked + &`]: {
            backgroundColor: themeVars.color.palette.error['500'],
            borderColor: themeVars.color.palette.error['500'],
          },
          [`${hiddenInput}:indeterminate + &`]: {
            backgroundColor: themeVars.color.palette.error['500'],
            borderColor: themeVars.color.palette.error['500'],
          },
        },
      },
      success: {
        borderColor: themeVars.color.palette.success['500'],
        selectors: {
          [`${hiddenInput}:checked + &`]: {
            backgroundColor: themeVars.color.palette.success['500'],
            borderColor: themeVars.color.palette.success['500'],
          },
          [`${hiddenInput}:indeterminate + &`]: {
            backgroundColor: themeVars.color.palette.success['500'],
            borderColor: themeVars.color.palette.success['500'],
          },
        },
      },
    },

    size: {
      sm: {
        width: '16px',
        height: '16px',
      },
      md: {
        width: '20px',
        height: '20px',
      },
      lg: {
        width: '24px',
        height: '24px',
      },
    },
  },

  defaultVariants: {
    state: 'default',
    size: 'md',
  },
});

export const checkIcon = style({
  width: '100%',
  height: '100%',
  color: themeVars.color.background.primary,
});

export const label = recipe({
  base: {
    fontSize: themeVars.typography.fontSize.md,
    color: themeVars.color.text.primary,
    cursor: 'pointer',

    selectors: {
      '[data-disabled="true"] &': {
        color: themeVars.color.text.disabled,
        cursor: 'not-allowed',
      },
    },
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

export const helperText = recipe({
  base: {
    display: 'block',
    fontSize: themeVars.typography.fontSize.xs,
    marginTop: themeVars.spacing['2'], // xs: 8px
    marginLeft: `calc(20px + ${themeVars.spacing['3']})`, // 20px + sm (12px)
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

export type CheckboxState = NonNullable<RecipeVariants<typeof checkbox>>['state'];
export type CheckboxSize = NonNullable<RecipeVariants<typeof checkbox>>['size'];
