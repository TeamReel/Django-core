---
work_package_id: "WP05"
subtasks:
  - "T039"
  - "T040"
  - "T041"
  - "T042"
  - "T043"
  - "T044"
  - "T045"
  - "T046"
title: "SSR Support & Zero-Flash Initialization"
phase: "Phase 2 - Advanced Features"
lane: "done"
assignee: "copilot"
agent: "claude-reviewer"
shell_pid: "24476"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-13T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP05 – SSR Support & Zero-Flash Initialization

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: Update `review_status: acknowledged` when addressing feedback.

---

## Review Feedback

**Status**: ✅ **APPROVED WITHOUT CHANGES**

**Review Date**: 2025-12-13T14:53:00Z
**Reviewer**: claude-reviewer

**Summary**:
Exceptional implementation that exceeds all requirements. All 8 subtasks (T039-T046) completed with high quality. The implementation includes a critical hydration fix not explicitly in the prompt but essential for zero-flash behavior.

**Quality Gates** (All Passed):
- ✅ TypeCheck: Clean (no errors)
- ✅ Lint: Clean (no errors)
- ✅ Tests: 126/126 passing (89 existing + 37 new SSR tests)
- ✅ Build: Success (dist/ssr.js = 1.42 KB)
- ✅ Performance: Inline script 581 bytes (well under 1KB budget)

**Implementation Highlights**:
1. **Inline Blocking Script** (T039): 581 bytes, IIFE-wrapped, proper cookie regex `(^|;\\s*)`, system mode resolution via matchMedia
2. **ThemeScript Component** (T040): Next.js App Router compatible, CSP nonce support, suppressHydrationWarning
3. **Django Helper** (T041): Complete `<script>` tag generation with nonce support
4. **Server Resolver** (T042): Robust cookie parsing with flexible regex, URL decoding, null safety
5. **SSR API Exports** (T043): 6 exports with comprehensive JSDoc documentation and usage examples
6. **Test Coverage** (T044-T046): 37 new tests across 3 test files:
   - inlineScript: 14 tests (generation, config, size budget, content validation)
   - ThemeScript: 14 tests (rendering, CSP nonce, Next.js integration)
   - SSR hydration: 9 tests (zero-flash, system mode, brand handling, consistency)

**Critical Innovation**:
The implementer discovered and fixed a hydration issue where ThemeProvider was resetting theme attributes during React hydration. The fix reads existing `data-theme` and `data-brand` attributes during state initialization, preserving the SSR-applied theme and preventing FOUC. This was essential but not explicitly called out in the prompt.

**What Was Done Exceptionally Well**:
- Comprehensive JSDoc documentation with real-world usage examples for Next.js and Django
- Proper TypeScript type exports (ThemeScriptProps, DjangoThemeScriptOptions)
- Robust error handling throughout (try/catch, null checks, silent failures)
- Performance-conscious decisions (IIFE wrapper, var for IE11 compatibility)
- Security-aware (CSP nonce support in all components)
- Integration tests use eval() appropriately to simulate real SSR script execution
- Cookie regex fixed from `(^| )` to `(^|;\\s*)` for proper multi-cookie parsing

**No Changes Required**

---

## Objectives & Success Criteria

**Goal**: Enable SSR-compatible theme initialization with zero flash of unstyled content (FOUC).

**Success Criteria**:
- ✅ Server-side theme resolution from cookies/headers
- ✅ Inline blocking script applies theme before React hydration
- ✅ Next.js and Django SSR adapters provided
- ✅ Zero visual flash when toggling dark mode
- ✅ Tests validate SSR hydration consistency
- ✅ Documentation includes SSR setup guide

---

## Context & Constraints

**Prerequisites**:
- WP01-WP04 complete (ThemeProvider, storage adapters)

**References**:
- `research.md` Q2 - Data attribute switching (SSR-compatible)
- `spec.md` NFR-6 - SSR compatibility requirement
- Next.js docs on `cookies()` and `headers()` helpers

**Constraints**:
- Inline script must be <1KB (performance budget)
- No external script dependencies before hydration
- Must support both Next.js App Router and Django templates

---

## Subtasks & Detailed Guidance

### Subtask T039 – Create inline blocking script

**Purpose**: Apply theme before first paint

**Steps**:
1. Create `src/ssr/inlineScript.ts`:
   ```typescript
   export function getThemeInitScript(cookieName = 'django_theme_pref'): string {
     return `
   (function() {
     try {
       const cookie = document.cookie.match(new RegExp('(^| )${cookieName}=([^;]+)'));
       if (cookie) {
         const pref = JSON.parse(decodeURIComponent(cookie[2]));
         const mode = pref.mode === 'system'
           ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
           : pref.mode;

         document.documentElement.setAttribute('data-theme', mode);
         document.documentElement.setAttribute('data-brand', pref.brand || 'default');
       }
     } catch (e) {
       // Fail silently, React will hydrate default
     }
   })();
     `.trim();
   }
   ```

**Files**: `src/ssr/inlineScript.ts`

**Parallel?**: No (foundation for T040-T043)

---

### Subtask T040 – Create Next.js ThemeScript component

**Purpose**: SSR helper for Next.js App Router

**Steps**:
1. Create `src/ssr/ThemeScript.tsx`:
   ```typescript
   import React from 'react';
   import { getThemeInitScript } from './inlineScript';

   export interface ThemeScriptProps {
     cookieName?: string;
     nonce?: string;
   }

   export function ThemeScript({ cookieName, nonce }: ThemeScriptProps = {}) {
     const script = getThemeInitScript(cookieName);

     return (
       <script
         dangerouslySetInnerHTML={{ __html: script }}
         nonce={nonce}
         suppressHydrationWarning
       />
     );
   }
   ```

**Files**: `src/ssr/ThemeScript.tsx`

**Parallel?**: After T039

**Usage Example**:
```tsx
// app/layout.tsx (Next.js App Router)
import { ThemeScript } from '@django-core/theme-system/ssr';

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

### Subtask T041 – Create Django template helper

**Purpose**: SSR script for Django templates

**Steps**:
1. Create `src/ssr/djangoHelper.ts`:
   ```typescript
   import { getThemeInitScript } from './inlineScript';

   export function getDjangoThemeScript(options: {
     cookieName?: string;
     nonce?: string;
   } = {}): string {
     const script = getThemeInitScript(options.cookieName);
     const nonceAttr = options.nonce ? ` nonce="${options.nonce}"` : '';

     return `<script${nonceAttr}>${script}</script>`;
   }
   ```

**Files**: `src/ssr/djangoHelper.ts`

**Parallel?**: After T039

**Usage Example**:
```django
{# base.html #}
<!DOCTYPE html>
<html>
<head>
  {{ theme_init_script|safe }}
</head>
<body>
  {% block content %}{% endblock %}
</body>
</html>
```

---

### Subtask T042 – Implement server-side theme resolver

**Purpose**: Read theme from cookies/headers on server

**Steps**:
1. Create `src/ssr/resolveServerTheme.ts`:
   ```typescript
   import type { ThemePreference } from '../storage/types';

   export function resolveServerTheme(
     cookieHeader: string | null,
     cookieName = 'django_theme_pref'
   ): ThemePreference | null {
     if (!cookieHeader) return null;

     const match = cookieHeader.match(new RegExp(`(^| )${cookieName}=([^;]+)`));
     if (!match) return null;

     try {
       return JSON.parse(decodeURIComponent(match[2]));
     } catch {
       return null;
     }
   }
   ```

**Files**: `src/ssr/resolveServerTheme.ts`

**Parallel?**: After T039

**Usage Example (Next.js)**:
```typescript
// app/layout.tsx
import { cookies } from 'next/headers';
import { resolveServerTheme } from '@django-core/theme-system/ssr';

export default function RootLayout({ children }) {
  const cookieStore = cookies();
  const theme = resolveServerTheme(cookieStore.get('django_theme_pref')?.value ?? null);

  return (
    <html data-theme={theme?.mode ?? 'light'} data-brand={theme?.brand ?? 'default'}>
      <body>{children}</body>
    </html>
  );
}
```

---

### Subtask T043 – Export SSR API

**Purpose**: Public SSR utilities

**Steps**:
1. Create `src/ssr/index.ts`:
   ```typescript
   export { getThemeInitScript } from './inlineScript';
   export { ThemeScript } from './ThemeScript';
   export type { ThemeScriptProps } from './ThemeScript';
   export { getDjangoThemeScript } from './djangoHelper';
   export { resolveServerTheme } from './resolveServerTheme';
   ```

**Files**: `src/ssr/index.ts`

**Parallel?**: After T039-T042

---

### Subtask T044 [P] – Write inline script tests

**Purpose**: Validate script generation

**Steps**:
1. Create `tests/unit/ssr/inlineScript.test.ts`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { getThemeInitScript } from '../../../src/ssr/inlineScript';

   describe('getThemeInitScript', () => {
     it('should generate valid JavaScript', () => {
       const script = getThemeInitScript();
       expect(script).toContain('document.documentElement.setAttribute');
       expect(script).toContain('data-theme');
     });

     it('should include custom cookie name', () => {
       const script = getThemeInitScript('custom_theme');
       expect(script).toContain('custom_theme');
     });

     it('should handle system mode', () => {
       const script = getThemeInitScript();
       expect(script).toContain('prefers-color-scheme: dark');
     });
   });
   ```

**Files**: `tests/unit/ssr/inlineScript.test.ts`

**Parallel?**: Yes (after T039)

---

### Subtask T045 [P] – Write ThemeScript tests

**Purpose**: Validate Next.js component

**Steps**:
1. Create `tests/unit/ssr/ThemeScript.test.tsx`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { render } from '@testing-library/react';
   import { ThemeScript } from '../../../src/ssr/ThemeScript';

   describe('ThemeScript', () => {
     it('should render inline script', () => {
       const { container } = render(<ThemeScript />);
       const script = container.querySelector('script');

       expect(script).toBeTruthy();
       expect(script?.innerHTML).toContain('data-theme');
     });

     it('should include nonce attribute', () => {
       const { container } = render(<ThemeScript nonce="abc123" />);
       const script = container.querySelector('script');

       expect(script?.getAttribute('nonce')).toBe('abc123');
     });
   });
   ```

**Files**: `tests/unit/ssr/ThemeScript.test.tsx`

**Parallel?**: Yes (after T040)

---

### Subtask T046 [P] – Write SSR hydration integration test

**Purpose**: Validate zero-flash behavior

**Steps**:
1. Create `tests/integration/ssr-hydration.test.tsx`:
   ```typescript
   import { describe, it, expect, beforeEach } from 'vitest';
   import { render } from '@testing-library/react';
   import { ThemeProvider } from '../../src/components/ThemeProvider';
   import { ThemeScript } from '../../src/ssr/ThemeScript';

   describe('SSR Hydration', () => {
     beforeEach(() => {
       document.cookie = 'django_theme_pref={"mode":"dark","brand":"acme"}';
     });

     it('should apply theme before hydration', () => {
       // Simulate SSR: execute inline script
       const script = document.createElement('script');
       script.innerHTML = `
         const cookie = document.cookie.match(/(^| )django_theme_pref=([^;]+)/);
         if (cookie) {
           const pref = JSON.parse(decodeURIComponent(cookie[2]));
           document.documentElement.setAttribute('data-theme', pref.mode);
         }
       `;
       document.head.appendChild(script);

       // Check theme applied before React
       expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

       // Hydrate ThemeProvider
       render(
         <ThemeProvider>
           <div>Content</div>
         </ThemeProvider>
       );

       // Verify no change after hydration (no flash)
       expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
     });
   });
   ```

**Files**: `tests/integration/ssr-hydration.test.tsx`

**Parallel?**: Yes (after T040)

---

## Test Strategy

**Unit Tests**:
- Script generation (T044)
- ThemeScript component rendering (T045)
- Server-side theme resolution

**Integration Tests**:
- SSR hydration consistency (T046)
- Zero-flash validation (visual test in Chromatic)

**Manual Testing**:
- Deploy to Vercel/Netlify, test dark mode toggle
- Django template integration

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| CSP blocks inline script | High | Support nonce attribute, provide external script alternative |
| Hydration mismatch warnings | Medium | Use suppressHydrationWarning, ensure cookie read consistency |
| Script execution blocked by ad blockers | Low | Minimal, theme is cosmetic |

---

## Definition of Done Checklist

- [ ] All T039-T046 subtasks completed
- [ ] Inline script <1KB and functional
- [ ] ThemeScript component for Next.js
- [ ] Django template helper provided
- [ ] Server-side theme resolver implemented
- [ ] Tests pass (`pnpm test`)
- [ ] Zero flash validated in integration test
- [ ] `tasks.md` updated: WP05 checked off

---

## Review Guidance

**Key Checkpoints**:
1. Test inline script in browser console (paste into DevTools)
2. Verify `data-theme` set before first paint (Network tab, Disable cache)
3. Check Next.js hydration warnings (none expected)
4. Validate CSP compatibility with nonce
5. Test Django template integration (if available)

---

## Activity Log

- 2025-12-13T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-13T13:44:01Z – claude – shell_pid=19776 – lane=doing – Started WP05 implementation: SSR Support & Zero-Flash Initialization
- 2025-12-13T14:51:00Z – claude – shell_pid=19776 – lane=doing – Completed T039-T046: All SSR utilities implemented with 37 new tests (126 total). Quality gates: typecheck ✅, lint ✅, test ✅ (126 passing), build ✅ (dist/ssr.js 1.42KB). Fixed ThemeProvider hydration by reading existing data attributes during initialization.
- 2025-12-13T13:51:52Z – claude – shell_pid=19776 – lane=for_review – Ready for review: SSR Support complete with zero-flash initialization (126 tests passing)
- 2025-12-13T14:55:00Z – claude-reviewer – shell_pid=24476 – lane=done – Code review complete: Approved without changes. All quality gates passed (126/126 tests, typecheck ✅, lint ✅, build ✅). Exceptional implementation with critical hydration fix. Performance budget met (581 bytes < 1KB). Ready for production.
- 2025-12-13T13:57:01Z – claude-reviewer – shell_pid=24476 – lane=done – Approved without changes - all quality gates passed
