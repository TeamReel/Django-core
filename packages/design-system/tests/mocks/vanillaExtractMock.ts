/**
 * Mock for vanilla-extract .css.ts files in Jest tests
 *
 * Why this mock exists:
 * - vanilla-extract compiles CSS at build time using Vite/Webpack plugins
 * - Jest runs in Node without build-time transforms
 * - The official @vanilla-extract/jest-transform had issues with recipe() exports
 *
 * How it works:
 * - Intercepts imports of *.css.ts files via Jest's moduleNameMapper
 * - Provides mock implementations that return deterministic className strings
 * - Recipe functions return className strings based on variant props
 * - This allows testing component logic without actual CSS compilation
 *
 * Pattern:
 * - Real code: `const className = button({ variant: 'primary', size: 'md' })`
 * - Mock returns: "mock-recipe mock-variant-primary mock-size-md"
 * - Tests can verify className presence and component behavior
 */

/**
 * Mock implementation of vanilla-extract's recipe() function
 * Returns a function that accepts variant props and returns a className string
 */
export const recipe = () => {
  // Return the actual className-generating function
  // (not a factory - this IS the function that components call)
  return (props: Record<string, unknown> = {}) => {
    const classNames = ['mock-recipe'];
    Object.entries(props).forEach(([key, value]) => {
      if (value) {
        classNames.push(`mock-${key}-${value}`);
      }
    });
    return classNames.join(' ');
  };
};

// Mock other vanilla-extract utilities
export const style = () => 'mock-style';
export const globalStyle = () => {};
export const createTheme = () => ({});
export const createThemeContract = () => ({});

// Default export for recipe-based stylesheets
export default {
  recipe,
  style,
};

// Pre-instantiated recipe mocks for each component
// These are used when component .css.ts files export: `export const button = recipe({ ... })`
// The mock doesn't need the actual recipe config - just needs to return a function
export const button = recipe();
export const input = recipe();
export const label = recipe();
export const helperText = recipe();
export const textarea = recipe();
export const checkbox = recipe();
export const container = recipe();
export const checkboxWrapper = recipe();
export const hiddenInput = recipe();
export const checkIcon = recipe();
export const radio = recipe();
export const radioGroup = recipe();
export const radioWrapper = recipe();
