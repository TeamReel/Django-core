// Placeholder theme exports - will be implemented in WP03
import type { ReactNode } from 'react';

export interface ThemeProviderProps {
  theme?: 'light' | 'dark' | 'system';
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps): ReactNode => {
  return children;
};

export const useTheme = () => {
  return {
    theme: 'light' as const,
    setTheme: () => {},
    resolvedTheme: 'light' as const,
  };
};
