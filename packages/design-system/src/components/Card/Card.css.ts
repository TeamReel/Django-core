import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { themeVars } from '../../tokens/theme.css';

export const card = recipe({
  base: {
    borderRadius: themeVars.radius.lg,
    backgroundColor: themeVars.color.background.primary,
  },
  variants: {
    variant: {
      outlined: {
        border: `1px solid ${themeVars.color.border.primary}`,
      },
      elevated: {
        boxShadow: themeVars.shadow.md,
      },
      filled: {
        backgroundColor: themeVars.color.background.secondary,
      },
    },
    padding: {
      none: { padding: 0 },
      sm: { padding: themeVars.spacing['3'] },
      md: { padding: themeVars.spacing['4'] },
      lg: { padding: themeVars.spacing['6'] },
    },
  },
  defaultVariants: {
    variant: 'outlined',
    padding: 'md',
  },
});

export type CardVariant = NonNullable<RecipeVariants<typeof card>>['variant'];
export type CardPadding = NonNullable<RecipeVariants<typeof card>>['padding'];
