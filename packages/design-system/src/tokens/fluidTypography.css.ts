import { globalStyle, style, styleVariants, createVar } from '@vanilla-extract/css';

/**
 * Fluid Typography System
 *
 * Uses CSS clamp() for smooth font scaling between mobile and desktop.
 * Formula: clamp(min, preferred, max)
 * Preferred uses viewport width units for fluid scaling.
 *
 * Base: 16px (1rem)
 * Mobile min: 320px viewport
 * Desktop max: 1280px viewport
 */

// CSS custom property for base font size (allows runtime adjustment)
export const fluidBaseFontSize = createVar();

// Fluid type scale utilities
// Format: clamp(minSize, preferredSize, maxSize)
// Preferred: minSize + (maxSize - minSize) * ((100vw - 320px) / (1280 - 320))

export const fluidFontSize = {
  /** 12px → 14px (0.75rem → 0.875rem) */
  xs: 'clamp(0.75rem, 0.729rem + 0.1vw, 0.875rem)',
  /** 14px → 16px (0.875rem → 1rem) */
  sm: 'clamp(0.875rem, 0.854rem + 0.1vw, 1rem)',
  /** 16px → 18px (1rem → 1.125rem) */
  md: 'clamp(1rem, 0.979rem + 0.1vw, 1.125rem)',
  /** 18px → 20px (1.125rem → 1.25rem) */
  lg: 'clamp(1.125rem, 1.104rem + 0.1vw, 1.25rem)',
  /** 20px → 24px (1.25rem → 1.5rem) */
  xl: 'clamp(1.25rem, 1.208rem + 0.21vw, 1.5rem)',
  /** 24px → 30px (1.5rem → 1.875rem) */
  '2xl': 'clamp(1.5rem, 1.438rem + 0.31vw, 1.875rem)',
  /** 30px → 36px (1.875rem → 2.25rem) */
  '3xl': 'clamp(1.875rem, 1.813rem + 0.31vw, 2.25rem)',
  /** 36px → 48px (2.25rem → 3rem) */
  '4xl': 'clamp(2.25rem, 2.125rem + 0.63vw, 3rem)',
  /** 48px → 64px (3rem → 4rem) */
  '5xl': 'clamp(3rem, 2.833rem + 0.83vw, 4rem)',
} as const;

// Fluid line heights (tighter on mobile, more relaxed on desktop)
export const fluidLineHeight = {
  tight: 'clamp(1.2, 1.15 + 0.05vw, 1.25)',
  normal: 'clamp(1.4, 1.35 + 0.05vw, 1.5)',
  relaxed: 'clamp(1.6, 1.55 + 0.05vw, 1.75)',
} as const;

// Fluid spacing for text (paragraph margins, etc.)
export const fluidTextSpacing = {
  paragraph: 'clamp(0.75rem, 0.625rem + 0.63vw, 1.25rem)',
  section: 'clamp(1.5rem, 1.25rem + 1.25vw, 2.5rem)',
} as const;

/**
 * Fluid typography style variants
 * Use these classes for consistent fluid typography
 */
export const fluidText = styleVariants({
  xs: { fontSize: fluidFontSize.xs, lineHeight: fluidLineHeight.normal },
  sm: { fontSize: fluidFontSize.sm, lineHeight: fluidLineHeight.normal },
  md: { fontSize: fluidFontSize.md, lineHeight: fluidLineHeight.normal },
  lg: { fontSize: fluidFontSize.lg, lineHeight: fluidLineHeight.normal },
  xl: { fontSize: fluidFontSize.xl, lineHeight: fluidLineHeight.tight },
  '2xl': { fontSize: fluidFontSize['2xl'], lineHeight: fluidLineHeight.tight },
  '3xl': { fontSize: fluidFontSize['3xl'], lineHeight: fluidLineHeight.tight },
  '4xl': { fontSize: fluidFontSize['4xl'], lineHeight: fluidLineHeight.tight },
  '5xl': { fontSize: fluidFontSize['5xl'], lineHeight: fluidLineHeight.tight },
});

/**
 * Fluid heading styles
 */
export const fluidHeading = styleVariants({
  h1: {
    fontSize: fluidFontSize['4xl'],
    lineHeight: fluidLineHeight.tight,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: fluidFontSize['3xl'],
    lineHeight: fluidLineHeight.tight,
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: fluidFontSize['2xl'],
    lineHeight: fluidLineHeight.tight,
    fontWeight: 600,
  },
  h4: {
    fontSize: fluidFontSize.xl,
    lineHeight: fluidLineHeight.tight,
    fontWeight: 600,
  },
  h5: {
    fontSize: fluidFontSize.lg,
    lineHeight: fluidLineHeight.normal,
    fontWeight: 600,
  },
  h6: {
    fontSize: fluidFontSize.md,
    lineHeight: fluidLineHeight.normal,
    fontWeight: 600,
  },
});

/**
 * Apply fluid typography globally to all text elements
 * Import this file to enable fluid typography site-wide
 */
export const enableFluidTypography = style({
  // This is a marker class to apply to html/body
});

// Global fluid typography rules (optional - import to enable)
globalStyle(`${enableFluidTypography} h1`, {
  fontSize: fluidFontSize['4xl'],
  lineHeight: fluidLineHeight.tight,
});

globalStyle(`${enableFluidTypography} h2`, {
  fontSize: fluidFontSize['3xl'],
  lineHeight: fluidLineHeight.tight,
});

globalStyle(`${enableFluidTypography} h3`, {
  fontSize: fluidFontSize['2xl'],
  lineHeight: fluidLineHeight.tight,
});

globalStyle(`${enableFluidTypography} h4`, {
  fontSize: fluidFontSize.xl,
  lineHeight: fluidLineHeight.tight,
});

globalStyle(`${enableFluidTypography} h5`, {
  fontSize: fluidFontSize.lg,
  lineHeight: fluidLineHeight.normal,
});

globalStyle(`${enableFluidTypography} h6`, {
  fontSize: fluidFontSize.md,
  lineHeight: fluidLineHeight.normal,
});

globalStyle(`${enableFluidTypography} p`, {
  fontSize: fluidFontSize.md,
  lineHeight: fluidLineHeight.relaxed,
  marginBottom: fluidTextSpacing.paragraph,
});

globalStyle(`${enableFluidTypography} small`, {
  fontSize: fluidFontSize.sm,
});
