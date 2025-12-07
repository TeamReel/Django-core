import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';

export const container = recipe({
  base: {
    width: '100%',
  },
  variants: {
    maxWidth: {
      sm: { maxWidth: '640px' },
      md: { maxWidth: '768px' },
      lg: { maxWidth: '1024px' },
      xl: { maxWidth: '1280px' },
      full: { maxWidth: '100%' },
    },
    centered: {
      true: { marginInline: 'auto' },
    },
  },
  defaultVariants: {
    maxWidth: 'lg',
    centered: true,
  },
});

export type ContainerMaxWidth = NonNullable<RecipeVariants<typeof container>>['maxWidth'];
