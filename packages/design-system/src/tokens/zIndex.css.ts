import { createThemeContract } from '@vanilla-extract/css';

export const zIndexVars = createThemeContract({
  base: '',      // 0
  dropdown: '',  // 100
  sticky: '',    // 200
  modal: '',     // 300
  popover: '',   // 400
  tooltip: '',   // 500
});
