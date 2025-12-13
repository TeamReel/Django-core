/**
 * LocalStorageAdapter tests.
 *
 * Validates localStorage-based theme persistence.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from '../../../src/storage/LocalStorageAdapter';

describe('LocalStorageAdapter', () => {
  let storage: LocalStorageAdapter;

  beforeEach(() => {
    storage = new LocalStorageAdapter();
    localStorage.clear();
  });

  describe('Theme Persistence', () => {
    it('should persist theme preference', async () => {
      await storage.setTheme({ mode: 'dark', brand: 'globex' });
      const theme = await storage.getTheme();

      expect(theme).toEqual({ mode: 'dark', brand: 'globex' });
    });

    it('should return null when no theme stored', async () => {
      const theme = await storage.getTheme();
      expect(theme).toBeNull();
    });

    it('should handle invalid JSON gracefully', async () => {
      localStorage.setItem('django_theme_pref', 'invalid-json');
      const theme = await storage.getTheme();

      expect(theme).toBeNull();
    });

    it('should clear theme preference', async () => {
      await storage.setTheme({ mode: 'light', brand: 'acme' });
      await storage.clearTheme();

      const theme = await storage.getTheme();
      expect(theme).toBeNull();
    });

    it('should overwrite existing preference', async () => {
      await storage.setTheme({ mode: 'light', brand: 'default' });
      await storage.setTheme({ mode: 'dark', brand: 'acme' });

      const theme = await storage.getTheme();
      expect(theme).toEqual({ mode: 'dark', brand: 'acme' });
    });
  });

  describe('Configuration', () => {
    it('should use custom storage key', async () => {
      const customStorage = new LocalStorageAdapter('my_custom_key');
      await customStorage.setTheme({ mode: 'dark', brand: 'globex' });

      const directValue = localStorage.getItem('my_custom_key');
      expect(directValue).toBeTruthy();
      expect(JSON.parse(directValue!)).toEqual({ mode: 'dark', brand: 'globex' });
    });

    it('should not interfere with default storage key', async () => {
      const defaultStorage = new LocalStorageAdapter();
      const customStorage = new LocalStorageAdapter('custom_key');

      await defaultStorage.setTheme({ mode: 'light', brand: 'default' });
      await customStorage.setTheme({ mode: 'dark', brand: 'acme' });

      const defaultTheme = await defaultStorage.getTheme();
      const customTheme = await customStorage.getTheme();

      expect(defaultTheme).toEqual({ mode: 'light', brand: 'default' });
      expect(customTheme).toEqual({ mode: 'dark', brand: 'acme' });
    });
  });

  describe('Error Handling', () => {
    it('should handle quota exceeded errors', async () => {
      // Mock localStorage to throw quota exceeded
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = () => {
        throw new DOMException('QuotaExceededError');
      };

      // Should not throw, just warn
      await expect(
        storage.setTheme({ mode: 'dark', brand: 'acme' })
      ).resolves.toBeUndefined();

      // Restore
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('SSR Safety', () => {
    it('should handle undefined window gracefully', async () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      const theme = await storage.getTheme();
      expect(theme).toBeNull();

      await storage.setTheme({ mode: 'dark', brand: 'acme' });
      await storage.clearTheme();

      // Restore
      global.window = originalWindow;
    });

    it('should handle missing localStorage API', async () => {
      const originalLocalStorage = global.window.localStorage;
      // @ts-expect-error - Testing missing API scenario
      delete global.window.localStorage;

      const theme = await storage.getTheme();
      expect(theme).toBeNull();

      await storage.setTheme({ mode: 'dark', brand: 'acme' });
      await storage.clearTheme();

      // Restore
      global.window.localStorage = originalLocalStorage;
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all theme mode values', async () => {
      const modes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];

      for (const mode of modes) {
        await storage.setTheme({ mode, brand: 'default' });
        const theme = await storage.getTheme();

        expect(theme?.mode).toBe(mode);
      }
    });

    it('should preserve brand variant names', async () => {
      const brands = ['default', 'acme', 'globex', 'initech'];

      for (const brand of brands) {
        await storage.setTheme({ mode: 'light', brand: brand as any });
        const theme = await storage.getTheme();

        expect(theme?.brand).toBe(brand);
      }
    });
  });
});
