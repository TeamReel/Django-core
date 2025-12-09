export default {
  displayName: '@django-core/auth-ui',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': [
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
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/packages/auth',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx)',
    '**/tests/**/*.(test|spec).(ts|tsx)',
  ],
  // Separate test patterns for unit vs integration
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'jsdom',
      transform: {
        '^.+\\.(ts|tsx)$': [
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
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      testMatch: ['**/tests/**/*.test.(ts|tsx)', '!**/__tests__/integration/**'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },
    {
      displayName: 'integration',
      testEnvironment: 'jsdom',
      transform: {
        '^.+\\.(ts|tsx)$': [
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
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(msw)/)',
      ],
      testMatch: ['**/__tests__/integration/**/*.test.(ts|tsx)'],
      setupFilesAfterEnv: [
        '<rootDir>/jest.setup.js',
        '<rootDir>/src/__tests__/setup.integration.ts',
      ],
      // Integration tests focus on user journeys, not code coverage
      // Coverage is measured by unit tests
      coverageThreshold: undefined,
    },
  ],
};
