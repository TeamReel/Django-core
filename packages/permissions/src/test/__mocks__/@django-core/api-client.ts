/**
 * Mock module for @django-core/api-client during tests
 * This is a stub until the actual api-client package is refactored from F02
 */

import { vi } from 'vitest';

export const fetchWithCSRF = vi.fn();
