/**
 * Vitest global setup.
 *
 * Loaded via `vite.config.ts → test.setupFiles`.
 * Provides DOM polyfills and global mocks required by React component tests.
 */

import '@testing-library/jest-dom/vitest';

/* ------------------------------------------------------------------ */
/*  Polyfill / stubs for jsdom                                          */
/* ------------------------------------------------------------------ */

// jsdom doesn't implement matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// jsdom doesn't implement ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// jsdom doesn't implement IntersectionObserver
class MockIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: readonly number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Suppress React Router future flag warnings in test output
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const first = typeof args[0] === 'string' ? args[0] : '';
  if (first.includes('React Router Future Flag Warning')) return;
  originalWarn(...args);
};
