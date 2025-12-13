// Core components
export { ThemeProvider } from './components/ThemeProvider';
export type { ThemeProviderProps } from './components/ThemeProvider';
export { ThemeToggle } from './components/ThemeToggle';
export type { ThemeToggleProps } from './components/ThemeToggle';

// Hooks
export { useTheme } from './hooks/useTheme';

// Themes
export { themeVars, lightTheme, darkTheme, brandConfig } from './themes';

// Types
export type { ThemeConfiguration, ThemeMode, ThemeTokenMap, ThemePreference } from './types/theme';
export type { BrandVariant, BrandVariantDefinition, BrandConfig } from './types/brand';

// Context (for advanced use cases)
export { ThemeContext } from './context/ThemeContext';
export type { ThemeContextValue } from './context/ThemeContext';

// Storage adapters
export {
  CookieStorage,
  LocalStorageAdapter,
  B12Adapter,
  ComposedStorage,
} from './storage';
export type {
  ThemeStorage,
  CookieStorageOptions,
  B12AdapterOptions,
} from './storage';
