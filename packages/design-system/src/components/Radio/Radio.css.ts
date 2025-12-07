import { style } from '@vanilla-extract/css';
import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { themeVars } from '../../tokens/theme.css';

export const radioGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: themeVars.spacing['3'], // sm: 12px
});

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

export const radioWrapper = style({
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

export const radio = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    border: `2px solid ${themeVars.color.border.primary}`,
    backgroundColor: themeVars.color.background.primary,
    transition: 'all 0.2s',
    flexShrink: 0,
    position: 'relative',

    '::after': {
      content: '""',
      position: 'absolute',
      borderRadius: '50%',
      backgroundColor: themeVars.color.background.primary,
      transform: 'scale(0)',
      transition: 'transform 0.2s',
    },

    selectors: {
      [`${hiddenInput}:focus-visible + &`]: {
        outline: `2px solid ${themeVars.color.palette.primary['500']}`,
        outlineOffset: '2px',
      },

      [`${hiddenInput}:checked + &`]: {
        backgroundColor: themeVars.color.palette.primary['500'],
        borderColor: themeVars.color.palette.primary['500'],
      },

      [`${hiddenInput}:checked + &::after`]: {
        transform: 'scale(1)',
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
        },
      },
      success: {
        borderColor: themeVars.color.palette.success['500'],
        selectors: {
          [`${hiddenInput}:checked + &`]: {
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
        '::after': {
          width: '6px',
          height: '6px',
        },
      },
      md: {
        width: '20px',
        height: '20px',
        '::after': {
          width: '8px',
          height: '8px',
        },
      },
      lg: {
        width: '24px',
        height: '24px',
        '::after': {
          width: '10px',
          height: '10px',
        },
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

export type RadioState = NonNullable<RecipeVariants<typeof radio>>['state'];
export type RadioSize = NonNullable<RecipeVariants<typeof radio>>['size'];
