import { createThemeContract } from '@vanilla-extract/css';

/**
 * Theme contract defining semantic tokens for the theme system.
 * Maps to F01 design-system primitives via light/dark theme implementations.
 *
 * This contract ensures type-safe access to theme values and generates
 * CSS custom properties at build time (zero runtime overhead).
 */
export const themeVars = createThemeContract({
  color: {
    bg: {
      primary: null,
      secondary: null,
      tertiary: null,
      inverse: null,
      surface: null,
      overlay: null,
    },
    text: {
      primary: null,
      secondary: null,
      tertiary: null,
      inverse: null,
      link: null,
      linkHover: null,
    },
    border: {
      default: null,
      subtle: null,
      strong: null,
      focus: null,
    },
    action: {
      primary: null,
      primaryHover: null,
      secondary: null,
      secondaryHover: null,
      danger: null,
      dangerHover: null,
    },
    state: {
      success: null,
      warning: null,
      error: null,
      info: null,
    },
  },
  spacing: {
    xs: null,
    sm: null,
    md: null,
    lg: null,
    xl: null,
  },
  radius: {
    sm: null,
    md: null,
    lg: null,
    full: null,
  },
  shadow: {
    sm: null,
    md: null,
    lg: null,
  },
});
