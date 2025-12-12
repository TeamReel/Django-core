/**
 * Mock module for @django-core/auth-ui during tests
 */

import { vi } from 'vitest';

export const useAuth = vi.fn();
