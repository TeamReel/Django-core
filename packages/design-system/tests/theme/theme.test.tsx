import { render, screen, act, renderHook } from '@testing-library/react';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { useTheme } from '../../src/theme/useTheme';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
const matchMediaMock = (matches: boolean) => ({
  matches,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  dispatchEvent: jest.fn(),
  media: '',
  onchange: null,
});

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorageMock.clear();
    window.matchMedia = jest.fn().mockImplementation((query) => {
      if (query === '(prefers-color-scheme: dark)') {
        return matchMediaMock(false);
      }
      if (query === '(prefers-reduced-motion: reduce)') {
        return matchMediaMock(false);
      }
      return matchMediaMock(false);
    });
  });

  it('renders children', () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('provides theme context', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.theme).toBe('light');
    expect(result.current.themeMode).toBe('system');
    expect(typeof result.current.setThemeMode).toBe('function');
    expect(typeof result.current.toggleTheme).toBe('function');
    expect(result.current.reducedMotion).toBe(false);
  });

  it('toggles theme', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
  });

  it('persists theme to localStorage', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setThemeMode('dark');
    });

    expect(localStorage.getItem('design-system-theme')).toBe('dark');
  });

  it('respects system dark mode preference', () => {
    window.matchMedia = jest.fn().mockImplementation((query) => {
      if (query === '(prefers-color-scheme: dark)') {
        return matchMediaMock(true);
      }
      return matchMediaMock(false);
    });

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.theme).toBe('dark');
  });

  it('detects reduced motion preference', () => {
    window.matchMedia = jest.fn().mockImplementation((query) => {
      if (query === '(prefers-reduced-motion: reduce)') {
        return matchMediaMock(true);
      }
      return matchMediaMock(false);
    });

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.reducedMotion).toBe(true);
  });

  it('throws error when useTheme is used outside provider', () => {
    // Suppress console error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });

  it('uses custom storage key', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeProvider storageKey="custom-theme">{children}</ThemeProvider>
      ),
    });

    act(() => {
      result.current.setThemeMode('dark');
    });

    expect(localStorage.getItem('custom-theme')).toBe('dark');
  });

  it('uses default theme when no localStorage value', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
      ),
    });

    expect(result.current.themeMode).toBe('dark');
  });

  it('applies theme class to document root', () => {
    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    );

    // Check that a theme class is applied (lightTheme or darkTheme)
    const root = document.documentElement;
    const hasThemeClass = root.classList.length > 0;
    expect(hasThemeClass).toBe(true);
  });

  it('applies reduce-motion class when reduced motion is preferred', () => {
    window.matchMedia = jest.fn().mockImplementation((query) => {
      if (query === '(prefers-reduced-motion: reduce)') {
        return matchMediaMock(true);
      }
      return matchMediaMock(false);
    });

    render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.classList.contains('reduce-motion')).toBe(true);
  });
});
