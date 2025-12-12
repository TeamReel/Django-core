/**
 * Mock module for @django-core/context-switcher during tests
 */

import { vi } from 'vitest';

export const useContext = vi.fn();
