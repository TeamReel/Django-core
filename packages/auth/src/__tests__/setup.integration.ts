import '@testing-library/jest-dom';
import { server } from './mocks/server';

/**
 * Integration Test Setup
 *
 * Configures MSW server to intercept API calls during integration tests.
 * The server lifecycle:
 * - beforeAll: Start listening for requests
 * - afterEach: Reset handlers to default state
 * - afterAll: Stop server and clean up
 */

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    // Fail tests if request is made that isn't mocked
    onUnhandledRequest: 'error',
  });
});

// Reset handlers after each test to ensure test isolation
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

// Suppress console errors in tests (optional, comment out if debugging)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    // Suppress MSW-related warnings
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
