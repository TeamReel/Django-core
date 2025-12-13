/**
 * Inline script tests.
 *
 * Validates JavaScript generation for zero-flash SSR initialization.
 */

import { describe, it, expect } from 'vitest';
import { getThemeInitScript } from '../../../src/ssr/inlineScript';

describe('getThemeInitScript', () => {
  describe('Script Generation', () => {
    it('should generate valid JavaScript', () => {
      const script = getThemeInitScript();

      // Check for essential DOM manipulation
      expect(script).toContain('document.documentElement.setAttribute');
      expect(script).toContain('data-theme');
      expect(script).toContain('data-brand');
    });

    it('should include cookie parsing logic', () => {
      const script = getThemeInitScript();

      expect(script).toContain('document.cookie.match');
      expect(script).toContain('django_theme_pref'); // default cookie name
      expect(script).toContain('JSON.parse');
      expect(script).toContain('decodeURIComponent');
    });

    it('should handle system mode with media query', () => {
      const script = getThemeInitScript();

      expect(script).toContain('prefers-color-scheme: dark');
      expect(script).toContain('window.matchMedia');
      expect(script).toContain("pref.mode === 'system'");
    });

    it('should be wrapped in IIFE', () => {
      const script = getThemeInitScript();

      expect(script).toMatch(/^\(function\(\)/);
      expect(script).toMatch(/\}\)\(\);?$/);
    });

    it('should include try-catch for error handling', () => {
      const script = getThemeInitScript();

      expect(script).toContain('try {');
      expect(script).toContain('catch');
    });
  });

  describe('Configuration', () => {
    it('should use default cookie name', () => {
      const script = getThemeInitScript();

      expect(script).toContain('django_theme_pref');
    });

    it('should include custom cookie name', () => {
      const script = getThemeInitScript('custom_theme_cookie');

      expect(script).toContain('custom_theme_cookie');
      expect(script).not.toContain('django_theme_pref');
    });

    it('should handle cookie names with special characters', () => {
      const script = getThemeInitScript('theme-v2_pref');

      expect(script).toContain('theme-v2_pref');
    });
  });

  describe('Script Size', () => {
    it('should be under 1KB (performance budget)', () => {
      const script = getThemeInitScript();
      const sizeBytes = new Blob([script]).size;

      expect(sizeBytes).toBeLessThan(1024);
    });

    it('should be under 1KB with custom cookie name', () => {
      const script = getThemeInitScript('very_long_custom_cookie_name_for_testing');
      const sizeBytes = new Blob([script]).size;

      expect(sizeBytes).toBeLessThan(1024);
    });
  });

  describe('Script Content', () => {
    it('should not include source maps or comments', () => {
      const script = getThemeInitScript();

      expect(script).not.toContain('//# sourceMappingURL');
      expect(script).not.toContain('/*#');
    });

    it('should use var for IE11 compatibility', () => {
      const script = getThemeInitScript();

      // Should use 'var' not 'const' or 'let' for maximum compatibility
      expect(script).toContain('var ');
    });

    it('should handle missing cookie gracefully', () => {
      const script = getThemeInitScript();

      expect(script).toContain('if (cookie)');
    });

    it('should set default brand if missing', () => {
      const script = getThemeInitScript();

      expect(script).toContain("pref.brand || 'default'");
    });
  });
});
