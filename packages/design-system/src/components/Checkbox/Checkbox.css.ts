import { style, recipe, RecipeVariants } from '@vanilla-extract/css';
import { tokens } from '../../tokens/tokens.css';

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
    borderRadius: tokens.borderRadius.sm,
    border: `2px solid ${tokens.colors.border.default}`,
    backgroundColor: tokens.colors.background.paper,
    transition: 'all 0.2s',
    flexShrink: 0,

    selectors: {
      [`${hiddenInput}:focus-visible + &`]: {
        outline: `2px solid ${tokens.colors.primary.main}`,
        outlineOffset: '2px',
      },

      [`${hiddenInput}:checked + &`]: {
        backgroundColor: tokens.colors.primary.main,
        borderColor: tokens.colors.primary.main,
      },

      [`${hiddenInput}:indeterminate + &`]: {
        backgroundColor: tokens.colors.primary.main,
        borderColor: tokens.colors.primary.main,
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
          [`${hiddenInput}:indeterminate + &`]: {
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
          [`${hiddenInput}:indeterminate + &`]: {
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
  color: tokens.colors.background.paper,
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
    marginLeft: 'calc(20px + ' + tokens.space.sm + ')',
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

export type CheckboxState = NonNullable<RecipeVariants<typeof checkbox>['state']>;
export type CheckboxSize = NonNullable<RecipeVariants<typeof checkbox>['size']>;
