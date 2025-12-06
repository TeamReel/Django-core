// Placeholder theme exports - will be implemented in WP03

export interface ThemeProviderProps {
  theme?: 'light' | 'dark' | 'system';
  children: React.ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  return <>{children}</>;
};

export const useTheme = () => {
  return {
    theme: 'light' as const,
    setTheme: () => {},
    resolvedTheme: 'light' as const,
  };
};
