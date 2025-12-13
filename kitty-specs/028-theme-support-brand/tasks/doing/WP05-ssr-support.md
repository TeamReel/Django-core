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
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: "19776"
review_status: ""
reviewed_by: ""
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

*[This section is empty initially. Reviewers will populate it if work needs changes.]*

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
