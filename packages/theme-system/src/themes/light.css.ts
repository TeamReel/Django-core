import { createTheme } from '@vanilla-extract/css';
import { themeVars } from './contract.css';
// Import directly from source since design-system doesn't generate .d.ts files yet
import { colorVars } from '../../../design-system/src/tokens/colors.css';
import { spacingVars } from '../../../design-system/src/tokens/spacing.css';
import { radiusVars } from '../../../design-system/src/tokens/radius.css';
import { shadowVars } from '../../../design-system/src/tokens/shadows.css';

/**
 * Light theme implementation mapping F01 design-system tokens to theme contract.
 *
 * Color values follow WCAG 2.1 AA contrast requirements:
 * - Text on backgrounds: minimum 4.5:1 ratio
 * - Large text/UI components: minimum 3:1 ratio
 */
export const lightTheme = createTheme(themeVars, {
  color: {
    bg: {
      primary: colorVars.background.primary, // white
      secondary: colorVars.background.secondary, // light gray
      tertiary: colorVars.background.tertiary, // lighter gray
      inverse: colorVars.background.inverse, // dark
      surface: colorVars.background.primary, // white
      overlay: colorVars.background.overlay, // rgba(0,0,0,0.5)
    },
    text: {
      primary: colorVars.text.primary, // dark gray/black
      secondary: colorVars.text.secondary, // medium gray
      tertiary: colorVars.text.tertiary, // lighter gray
      inverse: colorVars.text.inverse, // white
      link: colorVars.text.link, // blue
      linkHover: colorVars.interactive.primaryHover, // darker blue
    },
    border: {
      default: colorVars.border.primary, // light gray
      subtle: colorVars.border.secondary, // lighter gray
      strong: colorVars.palette.neutral['400'], // medium gray
      focus: colorVars.border.focus, // blue
    },
    action: {
      primary: colorVars.interactive.primary, // blue
      primaryHover: colorVars.interactive.primaryHover, // darker blue
      secondary: colorVars.interactive.secondary, // light gray
      secondaryHover: colorVars.interactive.secondaryHover, // medium gray
      danger: colorVars.interactive.destructive, // red
      dangerHover: colorVars.interactive.destructiveHover, // darker red
    },
    state: {
      success: colorVars.text.success, // green
      warning: colorVars.text.warning, // yellow/orange
      error: colorVars.text.error, // red
      info: colorVars.interactive.primary, // blue
    },
  },
  spacing: {
    xs: spacingVars['1'], // 4px
    sm: spacingVars['2'], // 8px
    md: spacingVars['4'], // 16px
    lg: spacingVars['6'], // 24px
    xl: spacingVars['8'], // 32px
  },
  radius: {
    sm: radiusVars.sm,
    md: radiusVars.md,
    lg: radiusVars.lg,
    full: radiusVars.full,
  },
  shadow: {
    sm: shadowVars.sm,
    md: shadowVars.md,
    lg: shadowVars.lg,
  },
});
