import { createTheme } from '@vanilla-extract/css';
import { themeVars } from './contract.css';
import { themeVars as dsThemeVars } from '@django-core/design-system';

const { color: colorVars, spacing: spacingVars, radius: radiusVars, shadow: shadowVars } = dsThemeVars;

/**
 * Dark theme implementation mapping F01 design-system tokens to theme contract.
 *
 * Color values follow WCAG 2.1 AA contrast requirements with inverted semantics:
 * - Text on dark backgrounds: adjusted luminance for readability
 * - Interactive elements: lighter shades for better visibility
 */
export const darkTheme = createTheme(themeVars, {
  color: {
    bg: {
      primary: colorVars.palette.neutral['900'], // dark
      secondary: colorVars.palette.neutral['800'], // medium dark
      tertiary: colorVars.palette.neutral['700'], // lighter dark
      inverse: colorVars.palette.neutral['50'], // almost white
      surface: colorVars.palette.neutral['800'], // dark surface
      overlay: 'rgba(0, 0, 0, 0.75)', // darker overlay
    },
    text: {
      primary: colorVars.palette.neutral['50'], // almost white
      secondary: colorVars.palette.neutral['400'], // medium gray
      tertiary: colorVars.palette.neutral['500'], // lighter gray
      inverse: colorVars.palette.neutral['900'], // dark
      link: colorVars.palette.primary['400'], // lighter blue
      linkHover: colorVars.palette.primary['300'], // even lighter blue
    },
    border: {
      default: colorVars.palette.neutral['700'], // dark gray
      subtle: colorVars.palette.neutral['800'], // darker gray
      strong: colorVars.palette.neutral['600'], // medium gray
      focus: colorVars.palette.primary['400'], // lighter blue
    },
    action: {
      primary: colorVars.palette.primary['500'], // blue
      primaryHover: colorVars.palette.primary['400'], // lighter blue
      secondary: colorVars.palette.neutral['700'], // dark gray
      secondaryHover: colorVars.palette.neutral['600'], // medium gray
      danger: colorVars.palette.error['500'], // red
      dangerHover: colorVars.palette.error['400'], // lighter red
    },
    state: {
      success: colorVars.palette.success['500'], // green
      warning: colorVars.palette.warning['500'], // yellow
      error: colorVars.palette.error['500'], // red
      info: colorVars.palette.primary['500'], // blue
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
