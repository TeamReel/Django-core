/**
 * Storage adapters for theme persistence.
 *
 * Provides multiple strategies for storing theme preferences:
 * - **CookieStorage**: SSR-compatible, server-readable cookies
 * - **LocalStorageAdapter**: Client-only, fast local storage
 * - **B12Adapter**: Backend API integration
 * - **ComposedStorage**: Multi-strategy composition
 *
 * @module storage
 */

export type { ThemeStorage, ThemePreference } from './types';
export { CookieStorage } from './CookieStorage';
export type { CookieStorageOptions } from './CookieStorage';
export { LocalStorageAdapter } from './LocalStorageAdapter';
export { B12Adapter } from './B12Adapter';
export type { B12AdapterOptions } from './B12Adapter';
export { ComposedStorage } from './ComposedStorage';
