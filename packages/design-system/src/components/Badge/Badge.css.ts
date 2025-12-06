import { recipe, type RecipeVariants } from '@vanilla-extract/recipes';
import { themeVars } from '../../tokens/theme.css';

export const badge = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    borderRadius: themeVars.radius.full,
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  },
  variants: {
    variant: {
      default: {
        backgroundColor: '#e5e7eb',
        color: '#374151',
      },
      primary: {
        backgroundColor: '#3b82f6',
        color: '#ffffff',
      },
      success: {
        backgroundColor: '#22c55e',
        color: '#ffffff',
      },
      warning: {
        backgroundColor: '#eab308',
        color: '#ffffff',
      },
      error: {
        backgroundColor: '#ef4444',
        color: '#ffffff',
      },
    },
    size: {
      sm: {
        fontSize: themeVars.typography.fontSize.xs,
        lineHeight: '1',
        padding: `${themeVars.spacing['1']} ${themeVars.spacing['2']}`,
        minHeight: '18px',
      },
      md: {
        fontSize: themeVars.typography.fontSize.sm,
        lineHeight: '1',
        padding: `${themeVars.spacing['1']} ${themeVars.spacing['3']}`,
        minHeight: '22px',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

export type BadgeVariant = NonNullable<RecipeVariants<typeof badge>>['variant'];
export type BadgeSize = NonNullable<RecipeVariants<typeof badge>>['size'];
