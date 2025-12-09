require('@testing-library/jest-dom');
require('whatwg-fetch');

// jest-axe matchers for accessibility testing
const { toHaveNoViolations } = require('jest-axe');
expect.extend(toHaveNoViolations);

// Mock window.matchMedia (required for F01 components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
