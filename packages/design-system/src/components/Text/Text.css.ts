import { recipe } from '@vanilla-extract/recipes';
import { themeVars } from '../../tokens/theme.css';

export const text = recipe({
  base: {
    fontFamily: themeVars.typography.fontFamily.sans,
    lineHeight: themeVars.typography.lineHeight.normal,
    margin: 0,
  },
  variants: {
    size: {
      xs: { fontSize: themeVars.typography.fontSize.xs },
      sm: { fontSize: themeVars.typography.fontSize.sm },
      md: { fontSize: themeVars.typography.fontSize.md },
      lg: { fontSize: themeVars.typography.fontSize.lg },
      xl: { fontSize: themeVars.typography.fontSize.xl },
    },
    weight: {
      normal: { fontWeight: themeVars.typography.fontWeight.normal },
      medium: { fontWeight: themeVars.typography.fontWeight.medium },
      semibold: { fontWeight: themeVars.typography.fontWeight.semibold },
      bold: { fontWeight: themeVars.typography.fontWeight.bold },
    },
    color: {
      primary: { color: themeVars.color.text.primary },
      secondary: { color: themeVars.color.text.secondary },
      tertiary: { color: themeVars.color.text.tertiary },
      error: { color: themeVars.color.text.error },
      success: { color: themeVars.color.text.success },
    },
  },
  defaultVariants: {
    size: 'md',
    weight: 'normal',
    color: 'primary',
  },
});

export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type TextColor = 'primary' | 'secondary' | 'tertiary' | 'error' | 'success';
