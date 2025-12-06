import { createThemeContract } from '@vanilla-extract/css';

export const typographyVars = createThemeContract({
  fontFamily: {
    sans: '',
    mono: '',
  },
  fontSize: {
    xs: '',    // 12px
    sm: '',    // 14px
    md: '',    // 16px
    lg: '',    // 18px
    xl: '',    // 20px
    '2xl': '', // 24px
    '3xl': '', // 30px
    '4xl': '', // 36px
  },
  fontWeight: {
    normal: '',
    medium: '',
    semibold: '',
    bold: '',
  },
  lineHeight: {
    tight: '',
    normal: '',
    relaxed: '',
  },
});
