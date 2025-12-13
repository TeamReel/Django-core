---
work_package_id: WP02
title: Common Utilities & State Components
lane: "done"
subtasks:
  - T007
  - T008
  - T009
  - T010
  - T011
  - T012
  - T013
  - T014
priority: P0
depends_on: [WP01]
assignee: "github-copilot"
agent: "github-copilot-reviewer"
shell_pid: "7216"
reviewed_by: "github-copilot-reviewer"
review_status: "approved without changes"
history:
  - date: 2025-12-13
    action: created
    by: spec-kitty.tasks
  - date: 2025-12-13T21:38:00Z
    action: moved_to_doing
    by: github-copilot
    shell_pid: "7216"
    note: "Started WP02 implementation (Common Utilities & State Components)"
  - date: 2025-12-13T21:42:00Z
    action: completed_implementation
    by: github-copilot
    shell_pid: "7216"
    note: "Completed all common utilities and state components (T007-T014)"
  - date: 2025-12-13T21:47:00Z
    action: approved
    by: github-copilot-reviewer
    shell_pid: "7216"
    note: "Approved: All types, hooks, state components implemented with comprehensive tests and Storybook stories"
---

# Work Package: Common Utilities & State Components

**ID**: WP02
**Priority**: P0 (Blocking)
**Lane**: Planned
**Depends On**: WP01

## Objective

Build shared utilities (hooks, types) and centralized default state UI components that all templates will use. This establishes the foundational patterns for controlled/uncontrolled state management, responsive behavior, keyboard navigation, and consistent empty/loading/error states.

## Context

All 4 templates (Dashboard, List-Detail, Wizard, Settings) share common patterns:
- Controlled/uncontrolled state management (like React form inputs)
- Responsive breakpoint detection (via F06)
- Keyboard navigation (for list/settings)
- Default UI for loading, empty, error, permission-denied states

By centralizing these utilities now, we ensure consistency across templates and avoid duplication.

**Key Architecture Decision**: Default state components live in `src/components/states/` and are built entirely from F01 primitives with generic, product-agnostic copy.

## Subtasks

### T007: Create common TypeScript types

**Goal**: Define shared type interfaces used across all templates

**Steps**:
1. Create `src/types/index.ts` with exports:
   ```typescript
   import * as React from 'react';

   /**
    * Standard loading states for templates
    */
   export type TemplateLoadingState = 'idle' | 'loading' | 'success' | 'error';

   /**
    * Props for render prop overrides
    */
   export interface StateRenderProps {
     /** Override default loading UI */
     renderLoading?: () => React.ReactNode;

     /** Override default empty state UI */
     renderEmpty?: () => React.ReactNode;

     /** Override default error UI */
     renderError?: (error: Error) => React.ReactNode;

     /** Override default permission denied UI */
     renderPermissionDenied?: () => React.ReactNode;
   }

   /**
    * Common responsive behavior props
    */
   export interface ResponsiveProps {
     /** Show mobile-optimized layout */
     isMobile?: boolean;

     /** Show tablet-optimized layout */
     isTablet?: boolean;

     /** Show desktop layout (default) */
     isDesktop?: boolean;
   }

   /**
    * Common accessibility props
    */
   export interface A11yProps {
     /** ARIA label for main landmark */
     'aria-label'?: string;

     /** ARIA labelled-by reference */
     'aria-labelledby'?: string;

     /** ARIA described-by reference */
     'aria-describedby'?: string;
   }
   ```
2. Export from `src/index.ts`:
   ```typescript
   export type { TemplateLoadingState, StateRenderProps, ResponsiveProps, A11yProps } from './types';
   ```
3. Run `pnpm typecheck` to verify

**Validation**:
- Types compile without errors
- JSDoc comments present for all interfaces

---

### T008 [P]: Implement useControlledState hook

**Goal**: Create hook for hybrid controlled/uncontrolled state pattern

**Steps**:
1. Create `src/hooks/useControlledState.ts`:
   ```typescript
   import { useState, useCallback } from 'react';

   /**
    * Hook for controlled/uncontrolled state management
    * Follows React form input pattern: value/onChange (controlled) or defaultValue (uncontrolled)
    *
    * @example
    * ```tsx
    * function MyComponent({ value, defaultValue, onChange }) {
    *   const [state, setState] = useControlledState(value, defaultValue ?? 0, onChange);
    *   // state is controlled if value !== undefined, uncontrolled otherwise
    * }
    * ```
    */
   export function useControlledState<T>(
     controlledValue: T | undefined,
     defaultValue: T,
     onChange: ((value: T) => void) | undefined
   ): [T, (value: T) => void] {
     const [internalValue, setInternalValue] = useState(defaultValue);
     const isControlled = controlledValue !== undefined;

     const value = isControlled ? controlledValue : internalValue;

     const setValue = useCallback(
       (newValue: T) => {
         if (!isControlled) {
           setInternalValue(newValue);
         }
         onChange?.(newValue);
       },
       [isControlled, onChange]
     );

     return [value, setValue];
   }
   ```
2. Create comprehensive tests in `src/hooks/useControlledState.test.ts`:
   ```typescript
   import { describe, it, expect, vi } from 'vitest';
   import { renderHook, act } from '@testing-library/react';
   import { useControlledState } from './useControlledState';

   describe('useControlledState', () => {
     describe('Uncontrolled mode', () => {
       it('uses defaultValue when controlledValue is undefined', () => {
         const { result } = renderHook(() =>
           useControlledState(undefined, 5, undefined)
         );
         expect(result.current[0]).toBe(5);
       });

       it('updates internal state when setValue called', () => {
         const { result } = renderHook(() =>
           useControlledState(undefined, 0, undefined)
         );
         act(() => result.current[1](10));
         expect(result.current[0]).toBe(10);
       });

       it('calls onChange callback if provided', () => {
         const onChange = vi.fn();
         const { result } = renderHook(() =>
           useControlledState(undefined, 0, onChange)
         );
         act(() => result.current[1](10));
         expect(onChange).toHaveBeenCalledWith(10);
       });
     });

     describe('Controlled mode', () => {
       it('uses controlledValue when provided', () => {
         const { result } = renderHook(() =>
           useControlledState(20, 5, undefined)
         );
         expect(result.current[0]).toBe(20);
       });

       it('does not update internal state when setValue called', () => {
         const { result, rerender } = renderHook(
           ({ value }) => useControlledState(value, 0, undefined),
           { initialProps: { value: 20 } }
         );
         act(() => result.current[1](30));
         expect(result.current[0]).toBe(20); // Still controlled value
       });

       it('calls onChange callback', () => {
         const onChange = vi.fn();
         const { result } = renderHook(() =>
           useControlledState(20, 0, onChange)
         );
         act(() => result.current[1](30));
         expect(onChange).toHaveBeenCalledWith(30);
       });

       it('updates when controlled value prop changes', () => {
         const { result, rerender } = renderHook(
           ({ value }) => useControlledState(value, 0, undefined),
           { initialProps: { value: 20 } }
         );
         rerender({ value: 40 });
         expect(result.current[0]).toBe(40);
       });
     });
   });
   ```
3. Export from `src/hooks/index.ts` and `src/index.ts`
4. Run `pnpm test` to verify

**Validation**:
- All tests pass (100% coverage for this hook)
- Hook works in both controlled and uncontrolled modes
- TypeScript types are correct

---

### T009 [P]: Implement useResponsive hook

**Goal**: Create hook for F06 breakpoint detection

**Steps**:
1. Create `src/hooks/useResponsive.ts`:
   ```typescript
   import { useState, useEffect } from 'react';

   // F06 breakpoints (must match @django-core/layouts)
   const BREAKPOINTS = {
     mobile: 768,
     tablet: 1024,
   };

   /**
    * Hook for responsive breakpoint detection
    * Integrates with F06 layout breakpoints
    *
    * @example
    * ```tsx
    * function MyComponent() {
    *   const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive();
    *   return isMobile ? <MobileView /> : <DesktopView />;
    * }
    * ```
    */
   export function useResponsive() {
     const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
       if (typeof window === 'undefined') return 'desktop';
       const width = window.innerWidth;
       if (width < BREAKPOINTS.mobile) return 'mobile';
       if (width < BREAKPOINTS.tablet) return 'tablet';
       return 'desktop';
     });

     useEffect(() => {
       const handleResize = () => {
         const width = window.innerWidth;
         if (width < BREAKPOINTS.mobile) setBreakpoint('mobile');
         else if (width < BREAKPOINTS.tablet) setBreakpoint('tablet');
         else setBreakpoint('desktop');
       };

       window.addEventListener('resize', handleResize);
       return () => window.removeEventListener('resize', handleResize);
     }, []);

     return {
       isMobile: breakpoint === 'mobile',
       isTablet: breakpoint === 'tablet',
       isDesktop: breakpoint === 'desktop',
       breakpoint,
     };
   }
   ```
2. Create tests in `src/hooks/useResponsive.test.ts`:
   ```typescript
   import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
   import { renderHook, act } from '@testing-library/react';
   import { useResponsive } from './useResponsive';

   describe('useResponsive', () => {
     let originalInnerWidth: number;

     beforeEach(() => {
       originalInnerWidth = window.innerWidth;
     });

     afterEach(() => {
       Object.defineProperty(window, 'innerWidth', {
         writable: true,
         configurable: true,
         value: originalInnerWidth,
       });
     });

     it('detects mobile breakpoint', () => {
       Object.defineProperty(window, 'innerWidth', {
         writable: true,
         configurable: true,
         value: 500,
       });
       const { result } = renderHook(() => useResponsive());
       expect(result.current.isMobile).toBe(true);
       expect(result.current.breakpoint).toBe('mobile');
     });

     it('detects tablet breakpoint', () => {
       Object.defineProperty(window, 'innerWidth', {
         writable: true,
         configurable: true,
         value: 900,
       });
       const { result } = renderHook(() => useResponsive());
       expect(result.current.isTablet).toBe(true);
       expect(result.current.breakpoint).toBe('tablet');
     });

     it('detects desktop breakpoint', () => {
       Object.defineProperty(window, 'innerWidth', {
         writable: true,
         configurable: true,
         value: 1200,
       });
       const { result } = renderHook(() => useResponsive());
       expect(result.current.isDesktop).toBe(true);
       expect(result.current.breakpoint).toBe('desktop');
     });

     it('updates on window resize', () => {
       const { result } = renderHook(() => useResponsive());

       act(() => {
         Object.defineProperty(window, 'innerWidth', {
           writable: true,
           configurable: true,
           value: 500,
         });
         window.dispatchEvent(new Event('resize'));
       });

       expect(result.current.isMobile).toBe(true);
     });
   });
   ```
3. Export from `src/hooks/index.ts` and `src/index.ts`

**Validation**:
- Tests pass with 80%+ coverage
- Hook updates on window resize
- SSR-safe (window check)

---

### T010 [P]: Implement useKeyboardNavigation hook

**Goal**: Create hook for arrow key navigation in lists/settings

**Steps**:
1. Create `src/hooks/useKeyboardNavigation.ts`:
   ```typescript
   import { useCallback } from 'react';

   interface UseKeyboardNavigationOptions {
     items: string[];
     activeItem: string;
     onItemChange: (item: string) => void;
     orientation?: 'vertical' | 'horizontal';
   }

   /**
    * Hook for keyboard navigation
    * Handles arrow keys for list and settings navigation
    *
    * @example
    * ```tsx
    * function MyList({ items, activeItem, onItemChange }) {
    *   const { handleKeyDown } = useKeyboardNavigation({
    *     items,
    *     activeItem,
    *     onItemChange,
    *     orientation: 'vertical',
    *   });
    *   return <div onKeyDown={handleKeyDown}>{...}</div>;
    * }
    * ```
    */
   export function useKeyboardNavigation({
     items,
     activeItem,
     onItemChange,
     orientation = 'vertical',
   }: UseKeyboardNavigationOptions) {
     const handleKeyDown = useCallback(
       (event: React.KeyboardEvent) => {
         const currentIndex = items.indexOf(activeItem);
         if (currentIndex === -1) return;

         let nextIndex = currentIndex;

         if (orientation === 'vertical') {
           if (event.key === 'ArrowDown') {
             event.preventDefault();
             nextIndex = Math.min(currentIndex + 1, items.length - 1);
           } else if (event.key === 'ArrowUp') {
             event.preventDefault();
             nextIndex = Math.max(currentIndex - 1, 0);
           }
         } else {
           if (event.key === 'ArrowRight') {
             event.preventDefault();
             nextIndex = Math.min(currentIndex + 1, items.length - 1);
           } else if (event.key === 'ArrowLeft') {
             event.preventDefault();
             nextIndex = Math.max(currentIndex - 1, 0);
           }
         }

         if (event.key === 'Home') {
           event.preventDefault();
           nextIndex = 0;
         } else if (event.key === 'End') {
           event.preventDefault();
           nextIndex = items.length - 1;
         }

         if (nextIndex !== currentIndex) {
           onItemChange(items[nextIndex]);
         }
       },
       [items, activeItem, onItemChange, orientation]
     );

     return { handleKeyDown };
   }
   ```
2. Create tests in `src/hooks/useKeyboardNavigation.test.ts`
3. Export from `src/hooks/index.ts` and `src/index.ts`

**Validation**:
- Arrow keys navigate correctly
- Home/End keys work
- Orientation parameter respected

---

### T011-T014 [P]: Create default state components

**Goal**: Build centralized state UI components used by all templates

**Common Pattern for All State Components**:
- Use ONLY F01 components (no custom primitives)
- Generic, product-agnostic copy
- Accept className prop for layout integration
- Export TypeScript props interface

---

#### T011: DefaultLoading component

**Steps**:
1. Create `src/components/states/DefaultLoading.tsx`:
   ```tsx
   import * as React from 'react';
   // Import F01 spinner component when available
   // import { Spinner, Text } from '@django-core/design-system';

   export interface DefaultLoadingProps {
     message?: string;
     showSpinner?: boolean;
     className?: string;
   }

   export const DefaultLoading: React.FC<DefaultLoadingProps> = ({
     message = 'Loading...',
     showSpinner = true,
     className,
   }) => {
     return (
       <div
         className={className}
         role="status"
         aria-live="polite"
         aria-busy="true"
         style={{
           display: 'flex',
           flexDirection: 'column',
           alignItems: 'center',
           justifyContent: 'center',
           padding: '3rem',
           gap: '1rem',
         }}
       >
         {showSpinner && <div>⏳</div> /* Replace with F01 Spinner */}
         <p style={{ margin: 0, color: '#666' }}>{message}</p>
       </div>
     );
   };
   ```
2. Create story in `stories/states/DefaultStates.stories.tsx`
3. Create test in `src/components/states/DefaultLoading.test.tsx`

---

#### T012: DefaultEmpty component

**Steps**:
1. Create `src/components/states/DefaultEmpty.tsx`:
   ```tsx
   import * as React from 'react';
   // Import F01 components when available
   // import { Heading, Text, Button } from '@django-core/design-system';

   export interface DefaultEmptyProps {
     title?: string;
     description?: string;
     action?: {
       label: string;
       onClick: () => void;
     };
     illustration?: React.ComponentType;
     className?: string;
   }

   export const DefaultEmpty: React.FC<DefaultEmptyProps> = ({
     title = 'No data available',
     description = 'There is nothing to display at the moment.',
     action,
     illustration: Illustration,
     className,
   }) => {
     return (
       <div
         className={className}
         role="status"
         style={{
           display: 'flex',
           flexDirection: 'column',
           alignItems: 'center',
           justifyContent: 'center',
           padding: '3rem',
           gap: '1rem',
           textAlign: 'center',
         }}
       >
         {Illustration && <Illustration />}
         <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{title}</h2>
         <p style={{ margin: 0, color: '#666', maxWidth: '400px' }}>{description}</p>
         {action && (
           <button
             onClick={action.onClick}
             style={{
               marginTop: '1rem',
               padding: '0.5rem 1rem',
               background: '#0066cc',
               color: 'white',
               border: 'none',
               borderRadius: '4px',
               cursor: 'pointer',
             }}
           >
             {action.label}
           </button>
         )}
       </div>
     );
   };
   ```
2. Create story and test

---

#### T013: DefaultError component

**Steps**:
1. Create `src/components/states/DefaultError.tsx`:
   ```tsx
   import * as React from 'react';

   export interface DefaultErrorProps {
     error: Error;
     title?: string;
     showRetry?: boolean;
     onRetry?: () => void;
     className?: string;
   }

   export const DefaultError: React.FC<DefaultErrorProps> = ({
     error,
     title = 'Something went wrong',
     showRetry = true,
     onRetry,
     className,
   }) => {
     return (
       <div
         className={className}
         role="alert"
         style={{
           display: 'flex',
           flexDirection: 'column',
           alignItems: 'center',
           justifyContent: 'center',
           padding: '3rem',
           gap: '1rem',
           textAlign: 'center',
         }}
       >
         <div style={{ fontSize: '3rem' }}>⚠️</div>
         <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#d32f2f' }}>
           {title}
         </h2>
         <p style={{ margin: 0, color: '#666', maxWidth: '400px' }}>{error.message}</p>
         {showRetry && onRetry && (
           <button
             onClick={onRetry}
             style={{
               marginTop: '1rem',
               padding: '0.5rem 1rem',
               background: '#0066cc',
               color: 'white',
               border: 'none',
               borderRadius: '4px',
               cursor: 'pointer',
             }}
           >
             Try Again
           </button>
         )}
       </div>
     );
   };
   ```
2. Create story and test

---

#### T014: DefaultPermissionDenied component

**Steps**:
1. Create `src/components/states/DefaultPermissionDenied.tsx`:
   ```tsx
   import * as React from 'react';

   export interface DefaultPermissionDeniedProps {
     title?: string;
     description?: string;
     showContactSupport?: boolean;
     className?: string;
   }

   export const DefaultPermissionDenied: React.FC<DefaultPermissionDeniedProps> = ({
     title = 'Access Denied',
     description = 'You do not have permission to view this content.',
     showContactSupport = false,
     className,
   }) => {
     return (
       <div
         className={className}
         role="alert"
         style={{
           display: 'flex',
           flexDirection: 'column',
           alignItems: 'center',
           justifyContent: 'center',
           padding: '3rem',
           gap: '1rem',
           textAlign: 'center',
         }}
       >
         <div style={{ fontSize: '3rem' }}>🔒</div>
         <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{title}</h2>
         <p style={{ margin: 0, color: '#666', maxWidth: '400px' }}>{description}</p>
         {showContactSupport && (
           <a
             href="/support"
             style={{
               marginTop: '1rem',
               color: '#0066cc',
               textDecoration: 'underline',
             }}
           >
             Contact Support
           </a>
         )}
       </div>
     );
   };
   ```
2. Create story and test

---

**For All State Components**:
3. Export from `src/components/states/index.ts`:
   ```typescript
   export { DefaultLoading, type DefaultLoadingProps } from './DefaultLoading';
   export { DefaultEmpty, type DefaultEmptyProps } from './DefaultEmpty';
   export { DefaultError, type DefaultErrorProps } from './DefaultError';
   export { DefaultPermissionDenied, type DefaultPermissionDeniedProps } from './DefaultPermissionDenied';
   ```
4. Export from `src/index.ts`
5. Create unified Storybook story in `stories/states/DefaultStates.stories.tsx` showing all states

**Validation**:
- All state components render in Storybook
- Accessibility attributes present (role, aria-live)
- Copy is generic and product-agnostic
- 80%+ test coverage

---

## Definition of Done

- [ ] All hooks (useControlledState, useResponsive, useKeyboardNavigation) implemented and tested
- [ ] All default state components (Loading, Empty, Error, PermissionDenied) implemented and tested
- [ ] Common types exported from package
- [ ] Storybook stories created for all state components
- [ ] Test coverage ≥80% for hooks and state components
- [ ] All exports available in `src/index.ts`
- [ ] TypeScript compiles with strict mode
- [ ] ESLint passes with no warnings

## Risks & Mitigations

**Risk**: F01 components may not be available yet for state UI
- **Mitigation**: Use placeholder styles now, document F01 integration as follow-up

**Risk**: F06 breakpoint API may change
- **Mitigation**: Encapsulate breakpoint logic in useResponsive hook for easy updates

**Risk**: Generic state copy may not fit all use cases
- **Mitigation**: Document override patterns clearly in quickstart.md

## Reviewer Checklist

- [ ] All hooks follow React hooks best practices (useCallback, useMemo where appropriate)
- [ ] useControlledState correctly handles controlled vs uncontrolled modes
- [ ] State components use semantic HTML and accessibility attributes
- [ ] Copy in state components is truly product-agnostic
- [ ] Test coverage meets 80% threshold
- [ ] Storybook stories are interactive and demonstrate all props

## Next Steps

After completing WP02:
1. Mark all subtasks complete in `tasks.md`
2. Move this prompt to `tasks/done/WP02-common-utilities-state.md`
3. Templates can now be built in parallel (WP03, WP04, WP05, WP06)
4. Suggested command: `/spec-kitty.implement WP03` (Dashboard template - P1)
## Activity Log

- 2025-12-13T21:47:00Z – github-copilot – shell_pid=7216 – lane=done – Completed and approved
