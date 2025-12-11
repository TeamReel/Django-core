export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
  testPathIgnorePatterns: ['/node_modules/', '__tests__/setup.ts', '__tests__/mocks/', '__tests__/testUtils/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@django-core/api-client$': '<rootDir>/../api-client/src/index.ts',
    '^@django-core/design-system$': '<rootDir>/../design-system/src/index.ts',
    // vanilla-extract .css.ts files → mock implementation (must come before other CSS patterns)
    '(.+)\\.css$': '<rootDir>/../design-system/tests/mocks/vanillaExtractMock.ts',
    '^@vanilla-extract/recipes$': '<rootDir>/../design-system/tests/mocks/vanillaExtractMock.ts',
    '^@vanilla-extract/css$': '<rootDir>/../design-system/tests/mocks/vanillaExtractMock.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(msw)/)',
  ],
};
