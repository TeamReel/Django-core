/**
 * B12Adapter tests.
 *
 * Validates backend API integration for theme persistence.
 */

import { describe, it, expect, vi } from 'vitest';
import { B12Adapter } from '../../../src/storage/B12Adapter';
import type { ThemeStorage } from '../../../src/storage/types';

describe('B12Adapter', () => {
  describe('Theme Fetching', () => {
    it('should fetch theme from API', async () => {
      const apiClient = {
        get: vi.fn().mockResolvedValue({ mode: 'dark', brand: 'acme' }),
        post: vi.fn(),
      };
      const storage = new B12Adapter({ apiClient });

      const theme = await storage.getTheme();
      expect(theme).toEqual({ mode: 'dark', brand: 'acme' });
      expect(apiClient.get).toHaveBeenCalledWith('/api/preferences/theme');
    });

    it('should use custom endpoint', async () => {
      const apiClient = {
        get: vi.fn().mockResolvedValue({ mode: 'light', brand: 'default' }),
        post: vi.fn(),
      };
      const storage = new B12Adapter({
        apiClient,
        endpoint: '/api/v2/user/theme',
      });

      await storage.getTheme();
      expect(apiClient.get).toHaveBeenCalledWith('/api/v2/user/theme');
    });

    it('should return null on API error (offline-first)', async () => {
      const apiClient = {
        get: vi.fn().mockRejectedValue(new Error('Network error')),
        post: vi.fn(),
      };
      const storage = new B12Adapter({ apiClient });

      const theme = await storage.getTheme();
      expect(theme).toBeNull();
    });

    it('should return null on 404 response', async () => {
      const apiClient = {
        get: vi.fn().mockRejectedValue({ status: 404, message: 'Not Found' }),
        post: vi.fn(),
      };
      const storage = new B12Adapter({ apiClient });

      const theme = await storage.getTheme();
      expect(theme).toBeNull();
    });
  });

  describe('Theme Saving', () => {
    it('should post theme to API', async () => {
      const apiClient = {
        get: vi.fn(),
        post: vi.fn().mockResolvedValue({}),
      };
      const storage = new B12Adapter({ apiClient });

      await storage.setTheme({ mode: 'light', brand: 'default' });
      expect(apiClient.post).toHaveBeenCalledWith('/api/preferences/theme', {
        mode: 'light',
        brand: 'default',
      });
    });

    it('should fail silently on API error', async () => {
      const apiClient = {
        get: vi.fn(),
        post: vi.fn().mockRejectedValue(new Error('Server error')),
      };
      const storage = new B12Adapter({ apiClient });

      // Should not throw
      await expect(
        storage.setTheme({ mode: 'dark', brand: 'acme' })
      ).resolves.toBeUndefined();
    });

    it('should use custom endpoint for saving', async () => {
      const apiClient = {
        get: vi.fn(),
        post: vi.fn().mockResolvedValue({}),
      };
      const storage = new B12Adapter({
        apiClient,
        endpoint: '/api/custom/theme',
      });

      await storage.setTheme({ mode: 'dark', brand: 'globex' });
      expect(apiClient.post).toHaveBeenCalledWith('/api/custom/theme', {
        mode: 'dark',
        brand: 'globex',
      });
    });
  });

  describe('Theme Clearing', () => {
    it('should reset to system defaults', async () => {
      const apiClient = {
        get: vi.fn(),
        post: vi.fn().mockResolvedValue({}),
      };
      const storage = new B12Adapter({ apiClient });

      await storage.clearTheme();
      expect(apiClient.post).toHaveBeenCalledWith('/api/preferences/theme', {
        mode: 'system',
        brand: 'default',
      });
    });

    it('should fail silently on clear error', async () => {
      const apiClient = {
        get: vi.fn(),
        post: vi.fn().mockRejectedValue(new Error('Server error')),
      };
      const storage = new B12Adapter({ apiClient });

      // Should not throw
      await expect(storage.clearTheme()).resolves.toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    it('should cast API response to correct types', async () => {
      const apiClient = {
        get: vi.fn().mockResolvedValue({ mode: 'dark', brand: 'acme' }),
        post: vi.fn(),
      };
      const storage: ThemeStorage = new B12Adapter({ apiClient });

      const theme = await storage.getTheme();
      expect(theme).toBeDefined();
      expect(theme?.mode).toBe('dark');
      expect(theme?.brand).toBe('acme');
    });
  });

  describe('Integration Patterns', () => {
    it('should work with offline-first composed storage', async () => {
      const apiClient = {
        get: vi.fn().mockResolvedValue({ mode: 'dark', brand: 'acme' }),
        post: vi.fn().mockResolvedValue({}),
      };
      const storage = new B12Adapter({ apiClient });

      // Simulate offline-first: try API first
      const theme = await storage.getTheme();
      expect(theme).toEqual({ mode: 'dark', brand: 'acme' });

      // Save should work
      await storage.setTheme({ mode: 'light', brand: 'default' });
      expect(apiClient.post).toHaveBeenCalled();
    });

    it('should handle authentication errors gracefully', async () => {
      const apiClient = {
        get: vi.fn().mockRejectedValue({ status: 401, message: 'Unauthorized' }),
        post: vi.fn().mockRejectedValue({ status: 401, message: 'Unauthorized' }),
      };
      const storage = new B12Adapter({ apiClient });

      // Should return null instead of throwing
      const theme = await storage.getTheme();
      expect(theme).toBeNull();

      // Should not throw on save
      await expect(
        storage.setTheme({ mode: 'dark', brand: 'acme' })
      ).resolves.toBeUndefined();
    });
  });
});
