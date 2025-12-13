import type { ThemeMode, ThemeBrand } from '../types/theme';

export interface UseThemeReturn {
  mode: ThemeMode;
  brand: ThemeBrand;
  setMode: (mode: ThemeMode) => void;
  setBrand: (brand: ThemeBrand) => void;
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
