import { createThemeContract } from '@vanilla-extract/css';

export const motionVars = createThemeContract({
  duration: {
    fast: '',    // 100ms
    normal: '',  // 200ms
    slow: '',    // 300ms
  },
  easing: {
    default: '',  // ease
    in: '',       // ease-in
    out: '',      // ease-out
    inOut: '',    // ease-in-out
  },
});
