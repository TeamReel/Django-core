/**
 * Jest configuration for the design system package
 *
 * Key challenge: vanilla-extract integration
 * - vanilla-extract compiles .css.ts files to CSS at build-time (via Vite/Webpack)
 * - Jest runs in Node without build-time compilation
 * - Solution: Mock .css.ts imports to return functions that generate test-friendly classNames
 *
 * Configuration approach:
 * 1. Use moduleNameMapper to intercept .css.ts imports BEFORE ts-jest processes them
 * 2. Point them to our mock file that provides recipe functions
 * 3. Order matters: .css.ts pattern MUST come before .css pattern
 * 4. transformIgnorePatterns ensures .css.ts files skip ts-jest transform
 */

export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Module name mapping - order matters!
  // Process .css.ts files first (more specific pattern)
  moduleNameMapper: {
    // vanilla-extract .css.ts files → mock implementation
    // Need to match both './Button.css' (extensionless import) and './Button.css.ts' (full path)
    '(.+)\\.css$': '<rootDir>/tests/mocks/vanillaExtractMock.ts',
    // Mock vanilla-extract packages
    '^@vanilla-extract/recipes$': '<rootDir>/tests/mocks/vanillaExtractMock.ts',
    '^@vanilla-extract/css$': '<rootDir>/tests/mocks/vanillaExtractMock.ts',
  },

  // Transforms - @swc/jest for TypeScript (but NOT .css.ts files)
  // @swc/jest has better ESM + moduleNameMapper support than ts-jest
  transform: {
    // Match .ts and .tsx but explicitly exclude .css.ts
    '^.+\\.(?!css\\.)(?:ts|tsx)$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
          },
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
      },
    ],
  },

  // Test file patterns
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.stories.tsx',
    '!src/**/index.ts',
    '!src/**/*.css.ts', // Exclude style files from coverage
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // File extensions Jest should recognize
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // Paths to ignore
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
