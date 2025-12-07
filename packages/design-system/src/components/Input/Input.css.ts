import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { tokens } from '../../tokens/tokens.css';

export const input = recipe({
  base: {
    width: '100%',
    padding: `${tokens.space[2]} ${tokens.space[3]}`,
    fontSize: tokens.fontSize.sm,
    lineHeight: tokens.lineHeight.normal,
    borderRadius: tokens.borderRadius.md,
    border: `1px solid ${tokens.colors.neutral[300]}`,
    backgroundColor: tokens.colors.white,
    color: tokens.colors.neutral[900],
    transition: 'all 150ms ease',
    outline: 'none',

    ':focus': {
      borderColor: tokens.colors.primary[500],
      boxShadow: `0 0 0 3px ${tokens.colors.primary[100]}`,
    },

    ':disabled': {
      backgroundColor: tokens.colors.neutral[100],
      color: tokens.colors.neutral[500],
      cursor: 'not-allowed',
    },

    '::placeholder': {
      color: tokens.colors.neutral[400],
    },
  },

  variants: {
    state: {
      default: {},
      error: {
        borderColor: tokens.colors.error[500],
        ':focus': {
          borderColor: tokens.colors.error[500],
          boxShadow: `0 0 0 3px ${tokens.colors.error[100]}`,
        },
      },
      success: {
        borderColor: tokens.colors.success[500],
        ':hover:not(:disabled)': {
          borderColor: tokens.colors.success[600],
        },
        ':focus': {
          borderColor: tokens.colors.success[500],
          boxShadow: `0 0 0 3px ${tokens.colors.success[100]}`,
        },
      },
    },
    size: {
      sm: {
        padding: `${tokens.space[1]} ${tokens.space[2]}`,
        fontSize: tokens.fontSize.xs,
      },
      md: {
        padding: `${tokens.space[2]} ${tokens.space[3]}`,
        fontSize: tokens.fontSize.sm,
      },
      lg: {
        padding: `${tokens.space[3]} ${tokens.space[4]}`,
        fontSize: tokens.fontSize.base,
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
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.neutral[700],
    marginBottom: tokens.space[1],
  },

  variants: {
    state: {
      default: {},
      error: {
        color: tokens.colors.error[700],
      },
      success: {
        color: tokens.colors.success[700],
      },
    },
    required: {
      true: {
        '::after': {
          content: '" *"',
          color: tokens.colors.error[500],
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
    marginTop: tokens.space[1],
    color: tokens.colors.neutral[600],
  },

  variants: {
    state: {
      default: {},
      error: {
        color: tokens.colors.error[600],
      },
      success: {
        color: tokens.colors.success[600],
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
