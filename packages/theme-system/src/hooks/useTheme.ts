import type { ThemeMode } from '../types/theme';

export interface UseThemeReturn {
  mode: ThemeMode;
  brand: string;
  setMode: (mode: ThemeMode) => void;
  setBrand: (brand: string) => void;
}

// Placeholder - will be implemented in WP03
export function useTheme(): UseThemeReturn {
  return {
    mode: 'light',
    brand: 'default',
    setMode: () => {},
    setBrand: () => {},
  };
}
