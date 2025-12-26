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
        backgroundColor: themeVars.color.background.secondary,
        color: themeVars.color.text.primary,
      },
      primary: {
        backgroundColor: themeVars.color.interactive.primary,
        color: themeVars.color.text.inverse,
      },
      success: {
        backgroundColor: themeVars.color.background.success,
        color: themeVars.color.text.success,
      },
      warning: {
        backgroundColor: themeVars.color.background.warning,
        color: themeVars.color.text.warning,
      },
      error: {
        backgroundColor: themeVars.color.background.error,
        color: themeVars.color.text.error,
      },
      info: {
        backgroundColor: themeVars.color.background.info,
        color: themeVars.color.interactive.primary,
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
