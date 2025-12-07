import { globalStyle } from '@vanilla-extract/css';

// Reduce motion for users who prefer reduced motion
globalStyle('.reduce-motion *, .reduce-motion *::before, .reduce-motion *::after', {
  animationDuration: '0.01ms !important',
  animationIterationCount: '1 !important',
  transitionDuration: '0.01ms !important',
});
