import { style, recipe, RecipeVariants } from '@vanilla-extract/css';
import { tokens } from '../../tokens/tokens.css';

export const radioGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.space.sm,
});

export const container = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: tokens.space.sm,
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
    border: `2px solid ${tokens.colors.border.default}`,
    backgroundColor: tokens.colors.background.paper,
    transition: 'all 0.2s',
    flexShrink: 0,
    position: 'relative',

    '::after': {
      content: '""',
      position: 'absolute',
      borderRadius: '50%',
      backgroundColor: tokens.colors.background.paper,
      transform: 'scale(0)',
      transition: 'transform 0.2s',
    },

    selectors: {
      [`${hiddenInput}:focus-visible + &`]: {
        outline: `2px solid ${tokens.colors.primary.main}`,
        outlineOffset: '2px',
      },

      [`${hiddenInput}:checked + &`]: {
        backgroundColor: tokens.colors.primary.main,
        borderColor: tokens.colors.primary.main,
      },

      [`${hiddenInput}:checked + &::after`]: {
        transform: 'scale(1)',
      },

      [`${hiddenInput}:disabled + &`]: {
        backgroundColor: tokens.colors.background.disabled,
        borderColor: tokens.colors.border.default,
        cursor: 'not-allowed',
      },
    },
  },

  variants: {
    state: {
      default: {},
      error: {
        borderColor: tokens.colors.error.main,
        selectors: {
          [`${hiddenInput}:checked + &`]: {
            backgroundColor: tokens.colors.error.main,
            borderColor: tokens.colors.error.main,
          },
        },
      },
      success: {
        borderColor: tokens.colors.success.main,
        selectors: {
          [`${hiddenInput}:checked + &`]: {
            backgroundColor: tokens.colors.success.main,
            borderColor: tokens.colors.success.main,
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
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text.primary,
    cursor: 'pointer',

    selectors: {
      '[data-disabled="true"] &': {
        color: tokens.colors.text.disabled,
        cursor: 'not-allowed',
      },
    },
  },

  variants: {
    state: {
      default: {},
      error: {
        color: tokens.colors.error.main,
      },
      success: {
        color: tokens.colors.success.main,
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
    fontSize: tokens.fontSize.xs,
    marginTop: tokens.space.xs,
    color: tokens.colors.text.secondary,
  },

  variants: {
    state: {
      default: {},
      error: {
        color: tokens.colors.error.main,
      },
      success: {
        color: tokens.colors.success.main,
      },
    },
  },

  defaultVariants: {
    state: 'default',
  },
});

export type RadioState = NonNullable<RecipeVariants<typeof radio>['state']>;
export type RadioSize = NonNullable<RecipeVariants<typeof radio>['size']>;
