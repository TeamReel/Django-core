/**
 * SSR hydration integration tests.
 *
 * Validates zero-flash behavior with server-side rendering.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from '../../src/components/ThemeProvider';
import { getThemeInitScript } from '../../src/ssr/inlineScript';

describe('SSR Hydration', () => {
  let originalCookie: string;

  beforeEach(() => {
    // Save original cookie state
    originalCookie = document.cookie;

    // Clear document attributes
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-brand');
  });

  afterEach(() => {
    // Restore original cookie
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    document.cookie = originalCookie;

    // Clean up attributes
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-brand');
  });

  describe('Zero-Flash Initialization', () => {
    it('should apply theme before React hydration', () => {
      // 1. Simulate server setting cookie
      document.cookie = 'django_theme_pref=%7B%22mode%22%3A%22dark%22%2C%22brand%22%3A%22acme%22%7D';

      // 2. Execute inline script (simulates <script> in <head>)
      const script = getThemeInitScript();
      // eslint-disable-next-line no-eval
      eval(script);

      // 3. Verify theme applied BEFORE React
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(document.documentElement.getAttribute('data-brand')).toBe('acme');

      // 4. Hydrate ThemeProvider
      render(
        <ThemeProvider>
          <div>Content</div>
        </ThemeProvider>
      );

      // 5. Verify no change after hydration (no flash)
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(document.documentElement.getAttribute('data-brand')).toBe('acme');
    });

    it('should handle system mode before hydration', () => {
      // Set system mode in cookie
      document.cookie = 'django_theme_pref=%7B%22mode%22%3A%22system%22%2C%22brand%22%3A%22default%22%7D';

      // Mock prefers-color-scheme
      const matchMedia = window.matchMedia;
      window.matchMedia = (query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      });

      // Execute inline script
      const script = getThemeInitScript();
      // eslint-disable-next-line no-eval
      eval(script);

      // Should resolve system to dark (based on mock)
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      // Restore
      window.matchMedia = matchMedia;
    });

    it('should not throw when cookie is missing', () => {
      // No cookie set

      // Execute inline script
      const script = getThemeInitScript();
      expect(() => {
        // eslint-disable-next-line no-eval
        eval(script);
      }).not.toThrow();

      // Attributes should not be set
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
      expect(document.documentElement.getAttribute('data-brand')).toBeNull();
    });

    it('should handle invalid JSON in cookie', () => {
      // Set malformed cookie
      document.cookie = 'django_theme_pref=invalid-json';

      // Execute inline script
      const script = getThemeInitScript();
      expect(() => {
        // eslint-disable-next-line no-eval
        eval(script);
      }).not.toThrow();

      // Attributes should not be set
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });
  });

  describe('Hydration Consistency', () => {
    it('should maintain theme during React hydration', () => {
      // Set light mode
      document.cookie = 'django_theme_pref=%7B%22mode%22%3A%22light%22%2C%22brand%22%3A%22default%22%7D';

      // Apply theme via inline script
      const script = getThemeInitScript();
      // eslint-disable-next-line no-eval
      eval(script);

      const beforeHydration = document.documentElement.getAttribute('data-theme');
      expect(beforeHydration).toBe('light');

      // Hydrate
      render(
        <ThemeProvider>
          <div>Content</div>
        </ThemeProvider>
      );

      const afterHydration = document.documentElement.getAttribute('data-theme');
      expect(afterHydration).toBe(beforeHydration); // No change
    });

    it('should not cause hydration warnings', () => {
      // Set theme
      document.cookie = 'django_theme_pref=%7B%22mode%22%3A%22dark%22%2C%22brand%22%3A%22globex%22%7D';

      // Apply via inline script
      const script = getThemeInitScript();
      // eslint-disable-next-line no-eval
      eval(script);

      // Spy on console warnings
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Hydrate
      render(
        <ThemeProvider>
          <div>Content</div>
        </ThemeProvider>
      );

      // No hydration warnings expected
      const hydrationWarnings = consoleWarn.mock.calls.filter((call) =>
        call[0]?.toString().includes('hydrat')
      );
      expect(hydrationWarnings).toHaveLength(0);

      consoleWarn.mockRestore();
    });
  });

  describe('Brand Variant Handling', () => {
    it('should apply brand before hydration', () => {
      document.cookie = 'django_theme_pref=%7B%22mode%22%3A%22light%22%2C%22brand%22%3A%22acme%22%7D';

      const script = getThemeInitScript();
      // eslint-disable-next-line no-eval
      eval(script);

      expect(document.documentElement.getAttribute('data-brand')).toBe('acme');

      render(
        <ThemeProvider>
          <div>Content</div>
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-brand')).toBe('acme');
    });

    it('should use default brand if missing in cookie', () => {
      // Cookie without brand field
      document.cookie = 'django_theme_pref=%7B%22mode%22%3A%22dark%22%7D';

      const script = getThemeInitScript();
      // eslint-disable-next-line no-eval
      eval(script);

      expect(document.documentElement.getAttribute('data-brand')).toBe('default');
    });
  });

  describe('Custom Cookie Name', () => {
    it('should read from custom cookie name', () => {
      document.cookie = 'my_theme=%7B%22mode%22%3A%22dark%22%2C%22brand%22%3A%22acme%22%7D';

      const script = getThemeInitScript('my_theme');
      // eslint-disable-next-line no-eval
      eval(script);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(document.documentElement.getAttribute('data-brand')).toBe('acme');
    });
  });
});
