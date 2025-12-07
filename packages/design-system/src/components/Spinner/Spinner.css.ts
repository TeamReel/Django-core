import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { style, keyframes } from '@vanilla-extract/css';

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

export const spinner = recipe({
  base: {
    display: 'inline-block',
    border: '2px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: `${spin} 0.6s linear infinite`,
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        animation: 'none',
        borderTopColor: '#3b82f6',
        borderRightColor: '#3b82f6',
      },
    },
  },
  variants: {
    size: {
      sm: {
        width: '16px',
        height: '16px',
        borderWidth: '2px',
      },
      md: {
        width: '24px',
        height: '24px',
        borderWidth: '2px',
      },
      lg: {
        width: '40px',
        height: '40px',
        borderWidth: '3px',
      },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

// Visually hidden class for screen reader text
export const visuallyHidden = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
});

export type SpinnerSize = NonNullable<RecipeVariants<typeof spinner>>['size'];
