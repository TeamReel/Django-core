import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { tokens } from '../../tokens/tokens.css';

export const textarea = recipe({
  base: {
    width: '100%',
    padding: tokens.space.md,
    fontSize: tokens.fontSize.base,
    fontFamily: 'inherit',
    lineHeight: '1.5',
    color: tokens.colors.text.primary,
    backgroundColor: tokens.colors.background.paper,
    border: `1px solid ${tokens.colors.border.default}`,
    borderRadius: tokens.borderRadius.md,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    minHeight: '80px',

    ':focus': {
      outline: 'none',
      borderColor: tokens.colors.primary.main,
      boxShadow: `0 0 0 3px ${tokens.colors.primary.light}`,
    },

    ':disabled': {
      backgroundColor: tokens.colors.background.disabled,
      color: tokens.colors.text.disabled,
      cursor: 'not-allowed',
    },

    '::placeholder': {
      color: tokens.colors.text.secondary,
    },
  },

  variants: {
    state: {
      default: {},
      error: {
        borderColor: tokens.colors.error.main,
        ':focus': {
          borderColor: tokens.colors.error.main,
          boxShadow: `0 0 0 3px ${tokens.colors.error.light}`,
        },
      },
      success: {
        borderColor: tokens.colors.success.main,
        ':focus': {
          borderColor: tokens.colors.success.main,
          boxShadow: `0 0 0 3px ${tokens.colors.success.light}`,
        },
      },
    },

    size: {
      sm: {
        padding: tokens.space.sm,
        fontSize: tokens.fontSize.sm,
      },
      md: {
        padding: tokens.space.md,
        fontSize: tokens.fontSize.base,
      },
      lg: {
        padding: tokens.space.lg,
        fontSize: tokens.fontSize.lg,
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
    fontSize: tokens.fontSize.sm,
    fontWeight: 500,
    color: tokens.colors.text.primary,
    marginBottom: tokens.space.xs,
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

    required: {
      true: {
        '::after': {
          content: '" *"',
          color: tokens.colors.error.main,
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

export type TextareaState = NonNullable<RecipeVariants<typeof textarea>>['state'];
export type TextareaSize = NonNullable<RecipeVariants<typeof textarea>>['size'];
export type TextareaResize = NonNullable<RecipeVariants<typeof textarea>>['resize'];
