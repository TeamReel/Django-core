---
work_package_id: "WP03"
subtasks:
  - "T020"
  - "T021"
  - "T022"
  - "T023"
  - "T024"
  - "T025"
  - "T026"
  - "T027"
  - "T028"
title: "ThemeProvider Context & Hooks"
phase: "Phase 1 - Core Theme System"
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: "28624"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-13T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP03 – ThemeProvider Context & Hooks

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: Update `review_status: acknowledged` when addressing feedback.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if work needs changes.]*

---

## Objectives & Success Criteria

**Goal**: Implement React Context provider for theme state management with data-attribute-based switching.

**Success Criteria**:
- ✅ ThemeProvider wraps app and injects `data-theme`/`data-brand` attributes
- ✅ `useTheme()` hook returns `{ mode, brand, setTheme, toggleMode }`
- ✅ Theme changes propagate instantly (no React re-renders required)
- ✅ System preference detection with `prefers-color-scheme` media query
- ✅ Initial theme applied before React hydration (SSR compatibility)
- ✅ Tests validate context behavior and hook API

---

## Context & Constraints

**Prerequisites**:
- WP01 complete (package scaffold)
- WP02 complete (theme contracts)

**References**:
- `research.md` Q2 - Data attribute switching mechanism
- `data-model.md` - ThemeConfiguration entity
- `contracts/theme-storage.ts` - ThemeStorage interface

**Constraints**:
- Zero React re-renders on theme switch (CSS-only via data attributes)
- SSR-safe initialization (no client-only side effects in provider setup)
- ThemeStorage abstraction (inject via props, no localStorage direct calls)

---

## Subtasks & Detailed Guidance

### Subtask T020 – Define ThemeContext interface

**Purpose**: Type-safe context API

**Steps**:
1. Create `src/context/ThemeContext.ts`:
   ```typescript
   import { createContext } from 'react';
   import type { ThemeMode, BrandVariant } from '../types';

   export interface ThemeContextValue {
     mode: ThemeMode;
     resolvedMode: 'light' | 'dark'; // system resolved to actual mode
     brand: BrandVariant;
     setTheme: (config: { mode?: ThemeMode; brand?: BrandVariant }) => void;
     toggleMode: () => void;
   }

   export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
   ```

**Files**: `src/context/ThemeContext.ts`

**Parallel?**: No (foundation for T021-T023)

---

### Subtask T021 – Implement system preference detection

**Purpose**: Detect OS dark mode preference

**Steps**:
1. Create `src/utils/systemPreference.ts`:
   ```typescript
   export function getSystemTheme(): 'light' | 'dark' {
     if (typeof window === 'undefined') {
       return 'light'; // SSR fallback
     }
     return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
   }

   export function subscribeToSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
     if (typeof window === 'undefined') {
       return () => {}; // no-op for SSR
     }

     const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
     const listener = (e: MediaQueryListEvent) => {
       callback(e.matches ? 'dark' : 'light');
     };

     mediaQuery.addEventListener('change', listener);
     return () => mediaQuery.removeEventListener('change', listener);
   }
   ```

**Files**: `src/utils/systemPreference.ts`

**Parallel?**: Can proceed with T022 after T020

---

### Subtask T022 – Implement theme resolution logic

**Purpose**: Resolve `system` mode to actual `light`/`dark`

**Steps**:
1. Create `src/utils/resolveTheme.ts`:
   ```typescript
   import type { ThemeMode } from '../types';
   import { getSystemTheme } from './systemPreference';

   export function resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
     if (mode === 'system') {
       return getSystemTheme();
     }
     return mode;
   }

   export function getThemeClassName(resolvedMode: 'light' | 'dark'): string {
     return resolvedMode === 'dark' ? 'darkTheme' : 'lightTheme';
   }
   ```

**Files**: `src/utils/resolveTheme.ts`

**Parallel?**: Can proceed with T023 after T020-T021

---

### Subtask T023 – Implement ThemeProvider component

**Purpose**: Context provider with data-attribute injection

**Steps**:
1. Create `src/components/ThemeProvider.tsx`:
   ```typescript
   import React, { useState, useEffect, useMemo, useCallback } from 'react';
   import { ThemeContext, type ThemeContextValue } from '../context/ThemeContext';
   import { resolveThemeMode } from '../utils/resolveTheme';
   import { subscribeToSystemTheme } from '../utils/systemPreference';
   import { lightTheme, darkTheme } from '../themes';
   import type { ThemeMode, BrandVariant } from '../types';
   import type { ThemeStorage } from '../storage/types';

   export interface ThemeProviderProps {
     children: React.ReactNode;
     storage?: ThemeStorage;
     defaultMode?: ThemeMode;
     defaultBrand?: BrandVariant;
   }

   export function ThemeProvider({
     children,
     storage,
     defaultMode = 'system',
     defaultBrand = 'default'
   }: ThemeProviderProps) {
     const [mode, setMode] = useState<ThemeMode>(defaultMode);
     const [brand, setBrand] = useState<BrandVariant>(defaultBrand);
     const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>(() =>
       resolveThemeMode(defaultMode)
     );

     // Load persisted preference
     useEffect(() => {
       if (!storage) return;

       storage.getTheme().then((saved) => {
         if (saved) {
           setMode(saved.mode);
           setBrand(saved.brand);
         }
       });
     }, [storage]);

     // Apply data attributes to <html>
     useEffect(() => {
       const root = document.documentElement;
       const themeClass = resolvedMode === 'dark' ? darkTheme : lightTheme;

       root.setAttribute('data-theme', resolvedMode);
       root.setAttribute('data-brand', brand);
       root.className = themeClass;
     }, [resolvedMode, brand]);

     // Subscribe to system preference changes
     useEffect(() => {
       if (mode !== 'system') return;

       const unsubscribe = subscribeToSystemTheme((systemTheme) => {
         setResolvedMode(systemTheme);
       });

       return unsubscribe;
     }, [mode]);

     // Resolve mode whenever it changes
     useEffect(() => {
       setResolvedMode(resolveThemeMode(mode));
     }, [mode]);

     const setTheme = useCallback<ThemeContextValue['setTheme']>(
       ({ mode: newMode, brand: newBrand }) => {
         if (newMode !== undefined) {
           setMode(newMode);
           storage?.setTheme({ mode: newMode, brand: newBrand ?? brand });
         }
         if (newBrand !== undefined) {
           setBrand(newBrand);
           storage?.setTheme({ mode: newMode ?? mode, brand: newBrand });
         }
       },
       [mode, brand, storage]
     );

     const toggleMode = useCallback(() => {
       const newMode = resolvedMode === 'light' ? 'dark' : 'light';
       setTheme({ mode: newMode });
     }, [resolvedMode, setTheme]);

     const contextValue = useMemo<ThemeContextValue>(
       () => ({
         mode,
         resolvedMode,
         brand,
         setTheme,
         toggleMode
       }),
       [mode, resolvedMode, brand, setTheme, toggleMode]
     );

     return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
   }
   ```

**Files**: `src/components/ThemeProvider.tsx`

**Parallel?**: After T020-T022

---

### Subtask T024 – Implement useTheme hook

**Purpose**: Consumer API for accessing theme state

**Steps**:
1. Create `src/hooks/useTheme.ts`:
   ```typescript
   import { useContext } from 'react';
   import { ThemeContext } from '../context/ThemeContext';

   export function useTheme() {
     const context = useContext(ThemeContext);

     if (!context) {
       throw new Error('useTheme must be used within ThemeProvider');
     }

     return context;
   }
   ```

**Files**: `src/hooks/useTheme.ts`

**Parallel?**: After T023

---

### Subtask T025 – Export public API

**Purpose**: Update package entry point

**Steps**:
1. Update `src/index.ts`:
   ```typescript
   // Components
   export { ThemeProvider } from './components/ThemeProvider';
   export type { ThemeProviderProps } from './components/ThemeProvider';

   // Hooks
   export { useTheme } from './hooks/useTheme';

   // Themes
   export { themeVars, lightTheme, darkTheme, brandConfig } from './themes';

   // Types
   export type {
     ThemeMode,
     ThemeConfiguration,
     ThemeTokenMap,
     BrandVariant,
     BrandVariantDefinition
   } from './themes';
   ```

**Files**: `src/index.ts`

**Parallel?**: After T024

---

### Subtask T026 [P] – Write ThemeProvider tests

**Purpose**: Validate provider behavior and data attributes

**Steps**:
1. Create `tests/unit/components/ThemeProvider.test.tsx`:
   ```typescript
   import { describe, it, expect, vi } from 'vitest';
   import { render, screen } from '@testing-library/react';
   import { ThemeProvider } from '../../../src/components/ThemeProvider';

   describe('ThemeProvider', () => {
     it('should apply data-theme attribute to html element', () => {
       render(
         <ThemeProvider defaultMode="light">
           <div>Content</div>
         </ThemeProvider>
       );

       expect(document.documentElement.getAttribute('data-theme')).toBe('light');
     });

     it('should apply data-brand attribute', () => {
       render(
         <ThemeProvider defaultBrand="acme">
           <div>Content</div>
         </ThemeProvider>
       );

       expect(document.documentElement.getAttribute('data-brand')).toBe('acme');
     });

     it('should resolve system mode to light or dark', () => {
       const matchMediaMock = vi.fn().mockReturnValue({
         matches: true, // dark mode
         addEventListener: vi.fn(),
         removeEventListener: vi.fn()
       });
       vi.stubGlobal('matchMedia', matchMediaMock);

       render(
         <ThemeProvider defaultMode="system">
           <div>Content</div>
         </ThemeProvider>
       );

       expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
     });
   });
   ```

**Files**: `tests/unit/components/ThemeProvider.test.tsx`

**Parallel?**: Yes (after T023)

---

### Subtask T027 [P] – Write useTheme hook tests

**Purpose**: Validate hook API and context requirement

**Steps**:
1. Create `tests/unit/hooks/useTheme.test.tsx`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { renderHook } from '@testing-library/react';
   import { ThemeProvider } from '../../../src/components/ThemeProvider';
   import { useTheme } from '../../../src/hooks/useTheme';

   describe('useTheme', () => {
     it('should throw error when used outside ThemeProvider', () => {
       expect(() => {
         renderHook(() => useTheme());
       }).toThrow('useTheme must be used within ThemeProvider');
     });

     it('should return theme context value', () => {
       const { result } = renderHook(() => useTheme(), {
         wrapper: ({ children }) => (
           <ThemeProvider defaultMode="dark">{children}</ThemeProvider>
         )
       });

       expect(result.current.mode).toBe('dark');
       expect(result.current.resolvedMode).toBe('dark');
       expect(result.current.brand).toBe('default');
       expect(typeof result.current.setTheme).toBe('function');
       expect(typeof result.current.toggleMode).toBe('function');
     });
   });
   ```

**Files**: `tests/unit/hooks/useTheme.test.tsx`

**Parallel?**: Yes (after T024)

---

### Subtask T028 [P] – Write integration tests

**Purpose**: Validate theme switching behavior

**Steps**:
1. Create `tests/integration/theme-switching.test.tsx`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { render, act } from '@testing-library/react';
   import { ThemeProvider } from '../../src/components/ThemeProvider';
   import { useTheme } from '../../src/hooks/useTheme';

   function TestComponent() {
     const { resolvedMode, toggleMode } = useTheme();
     return (
       <div>
         <span data-testid="mode">{resolvedMode}</span>
         <button onClick={toggleMode}>Toggle</button>
       </div>
     );
   }

   describe('Theme Switching', () => {
     it('should toggle between light and dark', async () => {
       const { getByTestId, getByRole } = render(
         <ThemeProvider defaultMode="light">
           <TestComponent />
         </ThemeProvider>
       );

       expect(getByTestId('mode')).toHaveTextContent('light');

       await act(async () => {
         getByRole('button').click();
       });

       expect(getByTestId('mode')).toHaveTextContent('dark');
       expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
     });
   });
   ```

**Files**: `tests/integration/theme-switching.test.tsx`

**Parallel?**: Yes (after T023-T024)

---

## Test Strategy

**Unit Tests**:
- ThemeProvider renders and applies attributes (T026)
- useTheme hook behavior (T027)
- System preference detection mocked

**Integration Tests**:
- Full theme switching workflow (T028)
- Storage persistence (deferred to WP04)

**Visual Tests** (WP06):
- Storybook stories for light/dark toggle

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SSR hydration mismatch | High | Initialize from cookie/header in SSR (WP05) |
| Performance: excessive re-renders | Medium | Use useMemo/useCallback, data attributes prevent cascading |
| System preference listener memory leak | Low | Cleanup in useEffect return |

---

## Definition of Done Checklist

- [ ] All T020-T028 subtasks completed
- [ ] ThemeProvider applies `data-theme` and `data-brand` attributes
- [ ] useTheme hook returns functional API
- [ ] System mode detection works
- [ ] Tests pass (`pnpm test`)
- [ ] No React re-renders on theme switch (validate with React DevTools)
- [ ] `tasks.md` updated: WP03 checked off

---

## Review Guidance

**Key Checkpoints**:
1. Verify `data-theme` attribute changes in browser DevTools
2. Confirm CSS custom properties update instantly (no flicker)
3. Test system preference toggle (OS settings)
4. Check useTheme hook throws error outside provider
5. Validate no console warnings for SSR hydration

---

## Activity Log

- 2025-12-13T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-13T13:08:49Z – claude – shell_pid=28624 – lane=doing – Started WP03 implementation: ThemeProvider & hooks
- 2025-12-13T14:17:03Z – claude – shell_pid=28624 – lane=doing – Completed T020-T028: ThemeProvider, useTheme, system preference detection, comprehensive tests (40/40), matchMedia mock added. Quality gates: typecheck ✅, lint ✅, test ✅, build ✅
