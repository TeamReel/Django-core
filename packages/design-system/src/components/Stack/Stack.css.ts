import { recipe } from '@vanilla-extract/recipes';

export const stack = recipe({
  base: {
    display: 'flex',
  },
  variants: {
    direction: {
      row: { flexDirection: 'row' },
      column: { flexDirection: 'column' },
    },
    wrap: {
      true: { flexWrap: 'wrap' },
    },
  },
  defaultVariants: {
    direction: 'column',
  },
});
