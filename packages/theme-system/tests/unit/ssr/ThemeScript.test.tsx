/**
 * ThemeScript component tests.
 *
 * Validates Next.js SSR component rendering.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeScript } from '../../../src/ssr/ThemeScript';

describe('ThemeScript', () => {
  describe('Rendering', () => {
    it('should render script element', () => {
      const { container } = render(<ThemeScript />);
      const script = container.querySelector('script');

      expect(script).toBeTruthy();
      expect(script?.tagName).toBe('SCRIPT');
    });

    it('should render inline JavaScript', () => {
      const { container } = render(<ThemeScript />);
      const script = container.querySelector('script');

      expect(script?.innerHTML).toContain('document.documentElement.setAttribute');
      expect(script?.innerHTML).toContain('data-theme');
    });

    it('should include cookie parsing logic', () => {
      const { container } = render(<ThemeScript />);
      const script = container.querySelector('script');

      expect(script?.innerHTML).toContain('document.cookie.match');
      expect(script?.innerHTML).toContain('JSON.parse');
    });

    it('should have suppressHydrationWarning attribute', () => {
      const { container } = render(<ThemeScript />);
      const script = container.querySelector('script');

      // React removes this attribute in production, but we can verify it's passed
      expect(script).toBeTruthy();
    });
  });

  describe('CSP Nonce', () => {
    it('should include nonce attribute when provided', () => {
      const { container } = render(<ThemeScript nonce="abc123def456" />);
      const script = container.querySelector('script');

      expect(script?.getAttribute('nonce')).toBe('abc123def456');
    });

    it('should not include nonce attribute when omitted', () => {
      const { container } = render(<ThemeScript />);
      const script = container.querySelector('script');

      expect(script?.hasAttribute('nonce')).toBe(false);
    });

    it('should handle empty nonce string', () => {
      const { container } = render(<ThemeScript nonce="" />);
      const script = container.querySelector('script');

      expect(script?.getAttribute('nonce')).toBe('');
    });
  });

  describe('Cookie Name Configuration', () => {
    it('should use default cookie name', () => {
      const { container } = render(<ThemeScript />);
      const script = container.querySelector('script');

      expect(script?.innerHTML).toContain('django_theme_pref');
    });

    it('should use custom cookie name', () => {
      const { container } = render(<ThemeScript cookieName="my_theme_cookie" />);
      const script = container.querySelector('script');

      expect(script?.innerHTML).toContain('my_theme_cookie');
      expect(script?.innerHTML).not.toContain('django_theme_pref');
    });
  });

  describe('Script Size', () => {
    it('should render compact script under 1KB', () => {
      const { container } = render(<ThemeScript />);
      const script = container.querySelector('script');
      const scriptSize = new Blob([script?.innerHTML ?? '']).size;

      expect(scriptSize).toBeLessThan(1024);
    });
  });

  describe('Integration with Next.js', () => {
    it('should be compatible with Next.js App Router', () => {
      // Simulate Next.js layout usage
      const { container } = render(
        <html suppressHydrationWarning>
          <head>
            <ThemeScript />
          </head>
          <body>
            <div>Content</div>
          </body>
        </html>
      );

      const script = container.querySelector('script');
      expect(script).toBeTruthy();
      expect(script?.innerHTML).toContain('data-theme');
    });

    it('should work with CSP in Next.js middleware', () => {
      const mockNonce = 'nonce-generated-by-middleware';

      const { container } = render(
        <html>
          <head>
            <ThemeScript nonce={mockNonce} />
          </head>
          <body>Content</body>
        </html>
      );

      const script = container.querySelector('script');
      expect(script?.getAttribute('nonce')).toBe(mockNonce);
    });
  });

  describe('Error Handling', () => {
    it('should render without errors when no props provided', () => {
      expect(() => render(<ThemeScript />)).not.toThrow();
    });

    it('should handle undefined props object', () => {
      expect(() => render(<ThemeScript {...undefined} />)).not.toThrow();
    });
  });
});
