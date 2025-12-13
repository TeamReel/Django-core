import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from '../context/ThemeContext';

/**
 * Hook to access theme context.
 *
 * Provides access to current theme state (mode, brand) and control functions
 * (setTheme, toggleMode). Must be used within a ThemeProvider.
 *
 * @returns Theme context value
 * @throws Error if used outside ThemeProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { mode, resolvedMode, toggleMode } = useTheme();
 *
 *   return (
 *     <div>
 *       <p>Current mode: {mode}</p>
 *       <p>Resolved: {resolvedMode}</p>
 *       <button onClick={toggleMode}>Toggle Theme</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Setting theme explicitly
 * ```tsx
 * function ThemeSelector() {
 *   const { setTheme } = useTheme();
 *
 *   return (
 *     <select onChange={(e) => setTheme({ mode: e.target.value as ThemeMode })}>
 *       <option value="light">Light</option>
 *       <option value="dark">Dark</option>
 *       <option value="system">System</option>
 *     </select>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
