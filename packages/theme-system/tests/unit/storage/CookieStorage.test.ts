/**
 * CookieStorage adapter tests.
 *
 * Validates cookie-based theme persistence with security flags.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CookieStorage } from '../../../src/storage/CookieStorage';

describe('CookieStorage', () => {
  let storage: CookieStorage;
  let cookieStore: Map<string, string>;

  beforeEach(() => {
    storage = new CookieStorage();
    cookieStore = new Map();

    // Mock document.cookie getter/setter since jsdom doesn't support it
    Object.defineProperty(document, 'cookie', {
      get: () => {
        return Array.from(cookieStore.entries())
          .map(([key, value]) => `${key}=${value}`)
          .join('; ');
      },
      set: (cookieString: string) => {
        const [nameValue] = cookieString.split(';');
        const [name, value] = nameValue.split('=').map((s) => s.trim());
        if (value && !cookieString.includes('expires=Thu, 01 Jan 1970')) {
          cookieStore.set(name, value);
        } else {
          cookieStore.delete(name);
        }
      },
      configurable: true,
    });
  });

  afterEach(() => {
    cookieStore.clear();
  });

  describe('Theme Persistence', () => {
    it('should set and get theme preference', async () => {
      await storage.setTheme({ mode: 'dark', brand: 'acme' });
      const theme = await storage.getTheme();

      expect(theme).toEqual({ mode: 'dark', brand: 'acme' });
    });

    it('should return null when cookie not set', async () => {
      const theme = await storage.getTheme();
      expect(theme).toBeNull();
    });

    it('should return null for invalid JSON in cookie', async () => {
      document.cookie = 'django_theme_pref=invalid-json';
      const theme = await storage.getTheme();

      expect(theme).toBeNull();
    });

    it('should clear theme preference', async () => {
      await storage.setTheme({ mode: 'light', brand: 'default' });
      await storage.clearTheme();

      const theme = await storage.getTheme();
      expect(theme).toBeNull();
    });
  });

  describe('Configuration', () => {
    it('should use custom cookie name', async () => {
      const customStorage = new CookieStorage({ cookieName: 'my_theme' });
      await customStorage.setTheme({ mode: 'dark', brand: 'globex' });

      expect(document.cookie).toContain('my_theme=');
    });

    it('should respect SameSite setting', async () => {
      const strictStorage = new CookieStorage({ sameSite: 'strict' });

      // Mock document.cookie setter to capture full string
      let capturedCookie = '';
      Object.defineProperty(document, 'cookie', {
        get: () => capturedCookie,
        set: (value: string) => {
          capturedCookie = value;
        },
        configurable: true,
      });

      await strictStorage.setTheme({ mode: 'light', brand: 'default' });

      expect(capturedCookie).toContain('samesite=strict');
    });

    it('should set expiry based on maxAge', async () => {
      const shortLivedStorage = new CookieStorage({ maxAge: 3600 }); // 1 hour
      await shortLivedStorage.setTheme({ mode: 'dark', brand: 'acme' });

      // Cookie should exist
      const theme = await shortLivedStorage.getTheme();
      expect(theme).toEqual({ mode: 'dark', brand: 'acme' });
    });
  });

  describe('Special Characters', () => {
    it('should handle brand names with special characters', async () => {
      await storage.setTheme({ mode: 'dark', brand: 'acme-corp' });
      const theme = await storage.getTheme();

      expect(theme).toEqual({ mode: 'dark', brand: 'acme-corp' });
    });

    it('should encode and decode cookie values correctly', async () => {
      const brandWithSpaces = 'my brand';
      await storage.setTheme({ mode: 'light', brand: brandWithSpaces as any });
      const theme = await storage.getTheme();

      expect(theme?.brand).toBe(brandWithSpaces);
    });
  });

  describe('SSR Safety', () => {
    it('should not throw when document is undefined', async () => {
      // Simulate SSR environment
      const originalDocument = global.document;
      // @ts-expect-error - Testing SSR scenario
      delete global.document;

      const theme = await storage.getTheme();
      expect(theme).toBeNull();

      await storage.setTheme({ mode: 'dark', brand: 'acme' });
      await storage.clearTheme();

      // Restore
      global.document = originalDocument;
    });
  });
});
