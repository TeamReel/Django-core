import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { themeVars } from '../../tokens/theme.css';

export const heading = recipe({
  base: {
    fontFamily: themeVars.typography.fontFamily.sans,
    fontWeight: themeVars.typography.fontWeight.bold,
    lineHeight: themeVars.typography.lineHeight.tight,
    color: themeVars.color.text.primary,
    margin: 0,
  },
  variants: {
    level: {
      1: { fontSize: themeVars.typography.fontSize['4xl'] },
      2: { fontSize: themeVars.typography.fontSize['3xl'] },
      3: { fontSize: themeVars.typography.fontSize['2xl'] },
      4: { fontSize: themeVars.typography.fontSize.xl },
      5: { fontSize: themeVars.typography.fontSize.lg },
      6: { fontSize: themeVars.typography.fontSize.md },
    },
  },
  defaultVariants: {
    level: 1,
  },
});

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
