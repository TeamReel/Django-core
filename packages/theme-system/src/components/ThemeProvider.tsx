import React from 'react';

export interface ThemeProviderProps {
  children: React.ReactNode;
}

// Placeholder - will be implemented in WP03
export function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  return <>{children}</>;
}
