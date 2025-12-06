---
work_package_id: "WP03"
subtasks:
  - "T026"
  - "T027"
  - "T028"
  - "T029"
  - "T030"
  - "T031"
  - "T032"
  - "T033"
  - "T034"
  - "T035"
title: "Theming Infrastructure"
phase: "Phase 0 - Foundation"
lane: "done"
assignee: "GitHub Copilot"
agent: "github-copilot-claude-reviewer"
shell_pid: "review-session-13-30"
review_status: "approved without changes"
reviewed_by: "github-copilot-claude-reviewer"
history:
  - timestamp: "2025-12-06T13:35:00Z"
    lane: "for_review"
    agent: "github-copilot-claude-reviewer"
    shell_pid: "review-session-13-30"
    action: "Code review complete - approved without changes"
  - timestamp: "2025-12-06T13:30:00Z"
    lane: "for_review"
    agent: "github-copilot-claude"
    shell_pid: "implement-session"
    action: "Completed implementation - ready for review"
  - timestamp: "2025-12-06T01:10:00Z"
    lane: "doing"
    agent: "github-copilot-claude"
    shell_pid: "implement-session"
    action: "Started implementation"
  - timestamp: "2025-12-05T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---
*Path: [kitty-specs/022-frontend-design-system/tasks/planned/WP03-theming-infrastructure.md](kitty-specs/022-frontend-design-system/tasks/planned/WP03-theming-infrastructure.md)*

# Work Package Prompt: WP03 – Theming Infrastructure

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback, update `review_status: acknowledged` in the frontmatter.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

### Objectives
1. Create light and dark theme implementations using vanilla-extract
2. Build a ThemeProvider component for React applications
3. Implement `useTheme` hook for theme access and toggling
4. Respect user system preferences (`prefers-color-scheme`, `prefers-reduced-motion`)
5. Document brand theme extension patterns

### Success Criteria
- [ ] Light and dark themes implemented with all token values
- [ ] ThemeProvider wraps app and applies theme class to root
- [ ] `useTheme` hook returns current theme and toggle function
- [ ] System `prefers-color-scheme` is detected and applied
- [ ] `prefers-reduced-motion` disables/minimizes animations
- [ ] Theme switching has no visible flicker
- [ ] Storybook decorator enables theme switching in stories
- [ ] Brand theme extension pattern documented

---

## Context & Constraints

### Reference Documents
- Constitution: `.kittify/memory/constitution.md` (Principles I, VI, VIII)
- Data Model: `kitty-specs/022-frontend-design-system/data-model.md`
- Spec: `kitty-specs/022-frontend-design-system/spec.md` (FR-005 through FR-009)

### Technical Constraints
- **vanilla-extract**: Use `createTheme` to implement theme variants
- **No Flash**: Theme class must be applied before React hydrates
- **System Preferences**: Use `matchMedia` for preference detection
- **Reduced Motion**: All motion tokens should respect `prefers-reduced-motion`

### Dependencies
- Requires WP02 (token contracts must exist)

---

## Subtasks & Detailed Guidance

### Subtask T026 – Create light.css.ts
- **Purpose**: Define light theme values for all token contracts
- **Steps**:
  1. Create `packages/design-system/src/theme/themes/light.css.ts`
  2. Use `createTheme` with the theme contract from WP02
  3. Define all light mode color values
  4. Export theme class name
- **Files**:
  - `packages/design-system/src/theme/themes/light.css.ts`
- **Parallel?**: No (establishes pattern)

```typescript
import { createTheme } from '@vanilla-extract/css';
import { themeVars } from '../../tokens/theme.css';

export const lightTheme = createTheme(themeVars, {
  color: {
    text: {
      primary: '#1a1a1a',
      secondary: '#525252',
      tertiary: '#737373',
      disabled: '#a3a3a3',
      inverse: '#ffffff',
      link: '#2563eb',
      error: '#dc2626',
      success: '#16a34a',
      warning: '#ca8a04',
    },
    background: {
      primary: '#ffffff',
      secondary: '#f5f5f5',
      tertiary: '#e5e5e5',
      inverse: '#1a1a1a',
      overlay: 'rgba(0, 0, 0, 0.5)',
      success: '#dcfce7',
      warning: '#fef9c3',
      error: '#fee2e2',
      info: '#dbeafe',
    },
    border: {
      primary: '#e5e5e5',
      secondary: '#d4d4d4',
      focus: '#2563eb',
      error: '#dc2626',
    },
    interactive: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      primaryActive: '#1e40af',
      secondary: '#f5f5f5',
      secondaryHover: '#e5e5e5',
      secondaryActive: '#d4d4d4',
      destructive: '#dc2626',
      destructiveHover: '#b91c1c',
      destructiveActive: '#991b1b',
      disabled: '#e5e5e5',
    },
  },
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
      mono: 'JetBrains Mono, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  spacing: {
    '0': '0px',
    '1': '4px',
    '2': '8px',
    '3': '12px',
    '4': '16px',
    '5': '20px',
    '6': '24px',
    '8': '32px',
    '10': '40px',
    '12': '48px',
    '16': '64px',
    '20': '80px',
    '24': '96px',
  },
  radius: {
    none: '0px',
    sm: '2px',
    md: '4px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
  zIndex: {
    base: '0',
    dropdown: '100',
    sticky: '200',
    modal: '300',
    popover: '400',
    tooltip: '500',
  },
  motion: {
    duration: {
      fast: '100ms',
      normal: '200ms',
      slow: '300ms',
    },
    easing: {
      default: 'ease',
      in: 'ease-in',
      out: 'ease-out',
      inOut: 'ease-in-out',
    },
  },
});
```

### Subtask T027 – Create dark.css.ts [P]
- **Purpose**: Define dark theme values for all token contracts
- **Steps**:
  1. Create `packages/design-system/src/theme/themes/dark.css.ts`
  2. Use `createTheme` with the theme contract
  3. Define all dark mode color values (inverted from light)
  4. Export theme class name
- **Files**:
  - `packages/design-system/src/theme/themes/dark.css.ts`
- **Parallel?**: Yes

```typescript
import { createTheme } from '@vanilla-extract/css';
import { themeVars } from '../../tokens/theme.css';

export const darkTheme = createTheme(themeVars, {
  color: {
    text: {
      primary: '#fafafa',
      secondary: '#a3a3a3',
      tertiary: '#737373',
      disabled: '#525252',
      inverse: '#1a1a1a',
      link: '#60a5fa',
      error: '#f87171',
      success: '#4ade80',
      warning: '#facc15',
    },
    background: {
      primary: '#171717',
      secondary: '#262626',
      tertiary: '#404040',
      inverse: '#fafafa',
      overlay: 'rgba(0, 0, 0, 0.75)',
      success: '#14532d',
      warning: '#422006',
      error: '#450a0a',
      info: '#1e3a5f',
    },
    border: {
      primary: '#404040',
      secondary: '#525252',
      focus: '#60a5fa',
      error: '#f87171',
    },
    interactive: {
      primary: '#3b82f6',
      primaryHover: '#60a5fa',
      primaryActive: '#2563eb',
      secondary: '#262626',
      secondaryHover: '#404040',
      secondaryActive: '#525252',
      destructive: '#ef4444',
      destructiveHover: '#f87171',
      destructiveActive: '#dc2626',
      disabled: '#404040',
    },
  },
  // typography, spacing, radius, shadow, zIndex, motion remain the same
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
      mono: 'JetBrains Mono, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  spacing: {
    '0': '0px',
    '1': '4px',
    '2': '8px',
    '3': '12px',
    '4': '16px',
    '5': '20px',
    '6': '24px',
    '8': '32px',
    '10': '40px',
    '12': '48px',
    '16': '64px',
    '20': '80px',
    '24': '96px',
  },
  radius: {
    none: '0px',
    sm: '2px',
    md: '4px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.2)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.2)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.2)',
  },
  zIndex: {
    base: '0',
    dropdown: '100',
    sticky: '200',
    modal: '300',
    popover: '400',
    tooltip: '500',
  },
  motion: {
    duration: {
      fast: '100ms',
      normal: '200ms',
      slow: '300ms',
    },
    easing: {
      default: 'ease',
      in: 'ease-in',
      out: 'ease-out',
      inOut: 'ease-in-out',
    },
  },
});
```

### Subtask T028 – Create ThemeProvider
- **Purpose**: React context provider for theme management
- **Steps**:
  1. Create `packages/design-system/src/theme/ThemeProvider.tsx`
  2. Define `ThemeContext` with current theme and setter
  3. Apply theme class to document root on mount/change
  4. Support controlled and uncontrolled modes
- **Files**:
  - `packages/design-system/src/theme/ThemeProvider.tsx`
- **Parallel?**: No (core infrastructure)

```typescript
import React, { createContext, useEffect, useState, useMemo, useCallback } from 'react';
import { lightTheme } from './themes/light.css';
import { darkTheme } from './themes/dark.css';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  reducedMotion: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'design-system-theme',
}: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    return (localStorage.getItem(storageKey) as ThemeMode) || defaultTheme;
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect system preferences
  useEffect(() => {
    const colorQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    setSystemTheme(colorQuery.matches ? 'dark' : 'light');
    setReducedMotion(motionQuery.matches);

    const handleColorChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    colorQuery.addEventListener('change', handleColorChange);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      colorQuery.removeEventListener('change', handleColorChange);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  const theme = themeMode === 'system' ? systemTheme : themeMode;
  const themeClass = theme === 'dark' ? darkTheme : lightTheme;

  // Apply theme class to root
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(lightTheme, darkTheme);
    root.classList.add(themeClass);

    if (reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [themeClass, reducedMotion]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem(storageKey, mode);
  }, [storageKey]);

  const toggleTheme = useCallback(() => {
    setThemeMode(theme === 'light' ? 'dark' : 'light');
  }, [theme, setThemeMode]);

  const value = useMemo(
    () => ({ theme, themeMode, setThemeMode, toggleTheme, reducedMotion }),
    [theme, themeMode, setThemeMode, toggleTheme, reducedMotion]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

### Subtask T029 – Create useTheme hook
- **Purpose**: Hook for components to access theme context
- **Steps**:
  1. Create `packages/design-system/src/theme/useTheme.ts`
  2. Consume ThemeContext with error if used outside provider
  3. Return all context values
- **Files**:
  - `packages/design-system/src/theme/useTheme.ts`
- **Parallel?**: No (depends on T028)

```typescript
import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

### Subtask T030 – Implement prefers-color-scheme
- **Purpose**: Detect and respond to system color scheme preference
- **Steps**:
  1. Already implemented in T028 ThemeProvider
  2. Add test coverage for system preference detection
- **Files**:
  - `packages/design-system/src/theme/ThemeProvider.tsx` (verify)
- **Parallel?**: No (verification of T028)

### Subtask T031 – Implement prefers-reduced-motion
- **Purpose**: Respect user's reduced motion preference
- **Steps**:
  1. Already implemented in T028 ThemeProvider
  2. Create global CSS rule for `.reduce-motion` class
  3. Ensure components check `reducedMotion` from context
- **Files**:
  - `packages/design-system/src/theme/global.css.ts`
- **Parallel?**: No

```typescript
// global.css.ts
import { globalStyle } from '@vanilla-extract/css';

globalStyle('.reduce-motion *, .reduce-motion *::before, .reduce-motion *::after', {
  animationDuration: '0.01ms !important',
  animationIterationCount: '1 !important',
  transitionDuration: '0.01ms !important',
});
```

### Subtask T032 – Create theme index.ts
- **Purpose**: Barrel export all theme-related modules
- **Steps**:
  1. Create `packages/design-system/src/theme/index.ts`
  2. Export ThemeProvider, useTheme, theme classes, types
- **Files**:
  - `packages/design-system/src/theme/index.ts`
- **Parallel?**: No (depends on T026-T031)

```typescript
export { ThemeProvider, ThemeContext, type ThemeMode } from './ThemeProvider';
export { useTheme } from './useTheme';
export { lightTheme } from './themes/light.css';
export { darkTheme } from './themes/dark.css';
```

### Subtask T033 – Write theme tests
- **Purpose**: Unit tests for ThemeProvider and useTheme
- **Steps**:
  1. Create `packages/design-system/src/theme/theme.test.tsx`
  2. Test ThemeProvider renders children
  3. Test useTheme returns context
  4. Test theme toggle functionality
  5. Mock matchMedia for preference tests
- **Files**:
  - `packages/design-system/src/theme/theme.test.tsx`
- **Parallel?**: No (depends on all theme subtasks)

### Subtask T034 – Create Storybook decorator
- **Purpose**: Enable theme switching in Storybook stories
- **Steps**:
  1. Update `packages/design-system/.storybook/preview.ts`
  2. Add ThemeProvider decorator
  3. Add toolbar addon for theme switching
- **Files**:
  - `packages/design-system/.storybook/preview.ts`
- **Parallel?**: No

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import { ThemeProvider } from '../src/theme';
import '../src/theme/themes/light.css';
import '../src/theme/themes/dark.css';

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark', 'system'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => (
      <ThemeProvider defaultTheme={context.globals.theme}>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;
```

### Subtask T035 – Document theme extension
- **Purpose**: Document how downstream products create brand themes
- **Steps**:
  1. Create `packages/design-system/docs/theming.md`
  2. Document `createTheme` usage for brand themes
  3. Provide example brand theme implementation
- **Files**:
  - `packages/design-system/docs/theming.md`
- **Parallel?**: No

---

## Test Strategy

### Verification Commands
```bash
pnpm --filter design-system test -- --testPathPattern=theme
pnpm --filter design-system storybook
```

### Expected Outcomes
- Theme tests pass
- Storybook shows theme toggle in toolbar
- Switching themes updates all component colors without flicker

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Flash of unstyled content | Apply theme class in `<script>` before React hydrates |
| localStorage not available (SSR) | Check for `window` before accessing localStorage |
| Reduced motion not respected | Global CSS rule catches all animations |

---

## Definition of Done Checklist

- [ ] Light and dark themes created with all values
- [ ] ThemeProvider implemented and tested
- [ ] useTheme hook implemented
- [ ] System preferences detected and applied
- [ ] Reduced motion global style added
- [ ] Storybook decorator enables theme switching
- [ ] Theme extension documented
- [ ] All tests pass
- [ ] `tasks.md` updated with WP03 status

---

## Review Guidance

Reviewers should verify:
1. All token values are defined in both themes
2. Theme switching has no visible flicker
3. System preferences are correctly detected
4. Reduced motion class disables all animations
5. Storybook theme toggle works

---

## Activity Log

- 2025-12-05T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
