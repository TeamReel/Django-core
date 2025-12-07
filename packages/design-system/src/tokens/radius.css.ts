import { createThemeContract } from '@vanilla-extract/css';

export const radiusVars = createThemeContract({
  none: '',   // 0px
  sm: '',     // 2px
  md: '',     // 4px
  lg: '',     // 8px
  xl: '',     // 12px
  full: '',   // 9999px
});
