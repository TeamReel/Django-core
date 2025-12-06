import { recipe, style, type RecipeVariants } from '@vanilla-extract/recipes';
import { themeVars } from '../../tokens/theme.css';

export const progress = recipe({
  base: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    borderRadius: themeVars.radius.full,
  },
  variants: {
    size: {
      sm: {
        height: '4px',
      },
      md: {
        height: '8px',
      },
      lg: {
        height: '12px',
      },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export const progressBar = style({
  height: '100%',
  backgroundColor: '#3b82f6',
  transition: 'width 0.3s ease-in-out',
  borderRadius: themeVars.radius.full,
});

export const progressLabel = style({
  fontSize: themeVars.typography.fontSize.sm,
  color: themeVars.color.text.secondary,
  marginBottom: themeVars.spacing['2'],
  fontWeight: 500,
});

export type ProgressSize = NonNullable<RecipeVariants<typeof progress>>['size'];
