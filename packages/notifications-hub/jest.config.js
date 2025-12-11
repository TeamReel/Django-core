module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@django-core/design-system$': '<rootDir>/__tests__/setup/__mocks__/@django-core/design-system.tsx',
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        paths: {
          '@/*': ['<rootDir>/src/*'],
          '@django-core/design-system': ['<rootDir>/__tests__/setup/__mocks__/@django-core/design-system.tsx'],
        },
      },
      isolatedModules: true,
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(msw)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};
