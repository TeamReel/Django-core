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

// Create a recipe function generator for exports
// Returns a function that generates mock className strings
// Uses hyphens instead of spaces to create valid single CSS tokens
const createMockRecipe = () => (props: Record<string, unknown> = {}) => {
  const parts = ['mock-recipe'];
  Object.entries(props).forEach(([key, value]) => {
    if (value) {
      parts.push(`${key}-${value}`);
    }
  });
  return parts.join('-'); // Join with hyphens not spaces
};

// Export vanilla-extract package functions as ESM named exports
// These are used by .css.ts files when they import from vanilla-extract packages
export const recipe = () => createMockRecipe();
export const style = () => 'mock-style';
export const globalStyle = () => {};
export const keyframes = () => 'mock-keyframes';
export const createTheme = () => ({});
export const createThemeContract = () => ({});

// Use module.exports with __esModule flag to support both CJS and ESM imports
// This allows Jest to handle any named import from .css.ts files dynamically
module.exports = new Proxy(
  {
    __esModule: true,
    recipe: () => createMockRecipe(),
    style: () => 'mock-style',
    globalStyle: () => {},
    keyframes: () => 'mock-keyframes',
    createTheme: () => ({}),
    createThemeContract: () => ({}),
  },
  {
    get(target: any, prop: string) {
      if (prop in target) {
        return target[prop];
      }
      // For any other property (CSS class names), return a mock
      return typeof prop === 'string' && prop !== 'then' ? createMockRecipe() : undefined;
    },
  }
);





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
