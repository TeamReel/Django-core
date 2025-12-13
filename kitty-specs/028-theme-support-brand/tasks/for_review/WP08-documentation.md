---
work_package_id: "WP08"
subtasks:
  - "T065"
  - "T066"
  - "T067"
  - "T068"
  - "T069"
  - "T070"
  - "T071"
  - "T072"
  - "T073"
  - "T074"
  - "T075"
  - "T076"
title: "Documentation & Examples"
phase: "Phase 3 - Polish & Release"
lane: "for_review"
assignee: ""
agent: "system"
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-13T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP08 – Documentation & Examples

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

**Goal**: Provide comprehensive documentation and working examples for all integration scenarios.

**Success Criteria**:
- ✅ README.md with quickstart, installation, and API reference
- ✅ Integration guides for Next.js, Django, React SPA
- ✅ API documentation for all public exports
- ✅ Working examples in `examples/` directory
- ✅ Migration guide from manual theme implementations
- ✅ Troubleshooting guide with common issues
- ✅ CHANGELOG.md and versioning strategy

---

## Context & Constraints

**Prerequisites**:
- WP01-WP07 complete (all features implemented)

**References**:
- `quickstart.md` from planning phase (expand into full docs)
- F01 documentation structure (consistency)
- `spec.md` all user stories and requirements

**Constraints**:
- Documentation must be <10 minute read for quickstart
- All examples must be runnable without modifications
- API docs auto-generated from TypeScript types (TSDoc)

---

## Subtasks & Detailed Guidance

### Subtask T065 – Expand README.md

**Purpose**: Comprehensive package documentation

**Steps**:
1. Replace `packages/theme-system/README.md` with:
   ````markdown
   # @django-core/theme-system

   Token-driven theming infrastructure for Django Core-App frontend with light/dark mode, brand variants, and SSR support.

   ## Features

   - 🎨 **Semantic tokens** mapped to F01 design primitives
   - 🌓 **Light/dark/system modes** with instant switching
   - 🏢 **Brand variants** with hierarchical inheritance
   - ⚡ **Zero-flash SSR** with Next.js and Django
   - ♿ **WCAG 2.1 AA** contrast validation
   - 📦 **Zero runtime overhead** (vanilla-extract CSS variables)

   ## Installation

   ```bash
   pnpm add @django-core/theme-system @django-core/design-system
   ```

   ## Quick Start

   ### 1. Wrap your app with ThemeProvider

   ```tsx
   import { ThemeProvider } from '@django-core/theme-system';
   import { CookieStorage } from '@django-core/theme-system/storage';

   function App() {
     return (
       <ThemeProvider storage={new CookieStorage()}>
         <YourApp />
       </ThemeProvider>
     );
   }
   ```

   ### 2. Add theme toggle

   ```tsx
   import { ThemeToggle } from '@django-core/theme-system';

   function Header() {
     return (
       <nav>
         <ThemeToggle variant="icon" />
       </nav>
     );
   }
   ```

   ### 3. Use theme tokens in components

   ```tsx
   import { style } from '@vanilla-extract/css';
   import { themeVars } from '@django-core/theme-system';

   export const card = style({
     backgroundColor: themeVars.color.bg.surface,
     color: themeVars.color.text.primary,
     borderRadius: themeVars.radius.md,
   });
   ```

   ## API Reference

   - [ThemeProvider](./docs/api/ThemeProvider.md)
   - [useTheme Hook](./docs/api/useTheme.md)
   - [Storage Adapters](./docs/api/storage.md)
   - [SSR Utilities](./docs/api/ssr.md)
   - [Theme Tokens](./docs/api/tokens.md)

   ## Integration Guides

   - [Next.js App Router](./docs/guides/nextjs.md)
   - [Django Templates](./docs/guides/django.md)
   - [React SPA](./docs/guides/react-spa.md)
   - [Brand Customization](./docs/guides/brand-variants.md)

   ## Examples

   - [Basic Setup](../../examples/theme-basic/)
   - [SSR with Next.js](../../examples/theme-nextjs/)
   - [Custom Brand Variant](../../examples/theme-brand/)

   ## Contributing

   See [CONTRIBUTING.md](../../CONTRIBUTING.md)

   ## License

   MIT
   ````

**Files**: Update `packages/theme-system/README.md`

**Parallel?**: No (foundation for other docs)

---

### Subtask T066 – Create API documentation

**Purpose**: Detailed API reference for all exports

**Steps**:
1. Create `packages/theme-system/docs/api/ThemeProvider.md`:
   ```markdown
   # ThemeProvider

   React Context provider for theme management.

   ## Usage

   ```tsx
   import { ThemeProvider } from '@django-core/theme-system';
   import { CookieStorage } from '@django-core/theme-system/storage';

   <ThemeProvider
     storage={new CookieStorage()}
     defaultMode="system"
     defaultBrand="default"
   >
     <App />
   </ThemeProvider>
   ```

   ## Props

   | Prop | Type | Default | Description |
   |------|------|---------|-------------|
   | `children` | `ReactNode` | required | App content |
   | `storage` | `ThemeStorage` | `undefined` | Persistence adapter |
   | `defaultMode` | `ThemeMode` | `'system'` | Initial theme mode |
   | `defaultBrand` | `BrandVariant` | `'default'` | Initial brand variant |

   ## Behavior

   - Applies `data-theme` and `data-brand` attributes to `<html>`
   - Subscribes to system preference changes when `mode="system"`
   - Loads persisted preference from storage on mount
   - Persists changes via storage adapter

   ## SSR Considerations

   See [SSR Guide](../guides/ssr.md) for zero-flash setup.
   ```
2. Create similar docs for:
   - `docs/api/useTheme.md`
   - `docs/api/storage.md`
   - `docs/api/ssr.md`
   - `docs/api/tokens.md`
   - `docs/api/ThemeToggle.md`

**Files**: `docs/api/*.md` (6 files)

**Parallel?**: Yes (after T065)

---

### Subtask T067 – Write Next.js integration guide

**Purpose**: Step-by-step Next.js App Router setup

**Steps**:
1. Create `packages/theme-system/docs/guides/nextjs.md`:
   ````markdown
   # Next.js App Router Integration

   Complete guide for zero-flash theming in Next.js 13+ with App Router.

   ## Installation

   ```bash
   pnpm add @django-core/theme-system @django-core/design-system
   ```

   ## Setup

   ### 1. Create root layout with ThemeScript

   ```tsx
   // app/layout.tsx
   import { ThemeProvider } from '@django-core/theme-system';
   import { ThemeScript } from '@django-core/theme-system/ssr';
   import { CookieStorage } from '@django-core/theme-system/storage';
   import './globals.css';

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html suppressHydrationWarning>
         <head>
           <ThemeScript />
         </head>
         <body>
           <ThemeProvider storage={new CookieStorage()}>
             {children}
           </ThemeProvider>
         </body>
       </html>
     );
   }
   ```

   ### 2. Import theme CSS

   ```css
   /* app/globals.css */
   @import '@django-core/theme-system/themes';
   ```

   ### 3. Add theme toggle

   ```tsx
   // components/Header.tsx
   import { ThemeToggle } from '@django-core/theme-system';

   export function Header() {
     return (
       <header>
         <nav>
           <ThemeToggle variant="dropdown" />
         </nav>
       </header>
     );
   }
   ```

   ## Server-Side Theme Detection

   Optionally pre-render with user's theme:

   ```tsx
   // app/layout.tsx
   import { cookies } from 'next/headers';
   import { resolveServerTheme } from '@django-core/theme-system/ssr';

   export default function RootLayout({ children }) {
     const cookieStore = cookies();
     const theme = resolveServerTheme(cookieStore.get('django_theme_pref')?.value ?? null);

     return (
       <html
         data-theme={theme?.mode ?? 'light'}
         data-brand={theme?.brand ?? 'default'}
         suppressHydrationWarning
       >
         {/* ... */}
       </html>
     );
   }
   ```

   ## Troubleshooting

   - **Hydration warnings**: Ensure `suppressHydrationWarning` on `<html>`
   - **Flash of wrong theme**: Verify `<ThemeScript />` in `<head>`
   - **Cookies not persisting**: Check SameSite/Secure settings

   ## Example

   See [examples/theme-nextjs/](../../../examples/theme-nextjs/)
   ````

**Files**: `docs/guides/nextjs.md`

**Parallel?**: Yes (after T065)

---

### Subtask T068 – Write Django integration guide

**Purpose**: Django template setup instructions

**Steps**:
1. Create `packages/theme-system/docs/guides/django.md`:
   ````markdown
   # Django Templates Integration

   Integrate theme system with Django server-rendered templates.

   ## Installation

   ```bash
   pnpm add @django-core/theme-system @django-core/design-system
   ```

   ## Setup

   ### 1. Add theme script to base template

   ```django
   {# templates/base.html #}
   <!DOCTYPE html>
   <html>
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">

     <!-- Theme initialization (before React) -->
     <script>
       (function() {
         try {
           const cookie = document.cookie.match(/(^| )django_theme_pref=([^;]+)/);
           if (cookie) {
             const pref = JSON.parse(decodeURIComponent(cookie[2]));
             const mode = pref.mode === 'system'
               ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
               : pref.mode;
             document.documentElement.setAttribute('data-theme', mode);
             document.documentElement.setAttribute('data-brand', pref.brand || 'default');
           }
         } catch (e) {}
       })();
     </script>

     <!-- Theme CSS -->
     <link rel="stylesheet" href="{% static 'theme-system/themes.css' %}">
   </head>
   <body>
     <div id="root">{% block content %}{% endblock %}</div>

     <!-- React app bundle -->
     <script src="{% static 'app.js' %}"></script>
   </body>
   </html>
   ```

   ### 2. Wrap React root with ThemeProvider

   ```tsx
   // frontend/src/index.tsx
   import { createRoot } from 'react-dom/client';
   import { ThemeProvider } from '@django-core/theme-system';
   import { CookieStorage } from '@django-core/theme-system/storage';
   import App from './App';

   createRoot(document.getElementById('root')!).render(
     <ThemeProvider storage={new CookieStorage()}>
       <App />
     </ThemeProvider>
   );
   ```

   ### 3. Add theme toggle in React components

   ```tsx
   // frontend/src/components/Header.tsx
   import { ThemeToggle } from '@django-core/theme-system';

   export function Header() {
     return (
       <header>
         <ThemeToggle variant="icon" />
       </header>
     );
   }
   ```

   ## Backend Integration (B12)

   Optional: Sync theme preference to Django backend.

   ```tsx
   // frontend/src/index.tsx
   import { B12Adapter } from '@django-core/theme-system/storage';
   import { ComposedStorage } from '@django-core/theme-system/storage';
   import { apiClient } from '@django-core/api-client';

   const storage = new ComposedStorage([
     new CookieStorage(),
     new B12Adapter({ apiClient })
   ]);

   <ThemeProvider storage={storage}>
     <App />
   </ThemeProvider>
   ```

   ## Troubleshooting

   - **Theme not applied**: Check cookie name matches (`django_theme_pref`)
   - **CSP violations**: Add nonce to inline script
   - **Static files missing**: Run `collectstatic` after build

   ## Example

   See [examples/theme-django/](../../../examples/theme-django/)
   ````

**Files**: `docs/guides/django.md`

**Parallel?**: Yes (after T065)

---

### Subtask T069 – Write brand customization guide

**Purpose**: Custom brand variant implementation

**Steps**:
1. Create `packages/theme-system/docs/guides/brand-variants.md`:
   ````markdown
   # Brand Variant Customization

   Create custom brand variants with token overrides.

   ## Overview

   Brand variants allow organizations to override theme tokens while inheriting base theme structure.

   ## Creating a Custom Brand

   ### 1. Define brand variant

   ```typescript
   // src/themes/brands/acme.ts
   import type { BrandVariantDefinition } from '@django-core/theme-system';
   import { tokens } from '@django-core/design-system/tokens';

   export const acmeBrand: BrandVariantDefinition = {
     id: 'acme',
     name: 'ACME Corporation',
     overrides: {
       color: {
         action: {
           primary: '#e74c3c', // ACME red
           primaryHover: '#c0392b'
         },
         text: {
           link: '#e74c3c',
           linkHover: '#c0392b'
         }
       }
     }
   };
   ```

   ### 2. Register brand in config

   ```typescript
   // src/themes/brands/index.ts
   import { defaultBrand } from './default';
   import { acmeBrand } from './acme';

   export const brandConfig: BrandConfig = {
     variants: {
       default: defaultBrand,
       acme: acmeBrand
     },
     default: 'default'
   };
   ```

   ### 3. Use brand in app

   ```tsx
   <ThemeProvider defaultBrand="acme">
     <App />
   </ThemeProvider>
   ```

   ## Runtime Brand Switching

   ```tsx
   import { useTheme } from '@django-core/theme-system';

   function BrandSelector() {
     const { brand, setTheme } = useTheme();

     return (
       <select
         value={brand}
         onChange={(e) => setTheme({ brand: e.target.value as BrandVariant })}
       >
         <option value="default">Default</option>
         <option value="acme">ACME</option>
       </select>
     );
   }
   ```

   ## Contrast Validation

   Validate custom brand tokens:

   ```bash
   pnpm validate-theme src/themes/brands/acme.json
   ```

   ## Example

   See [examples/theme-brand/](../../../examples/theme-brand/)
   ````

**Files**: `docs/guides/brand-variants.md`

**Parallel?**: Yes (after T065)

---

### Subtask T070 – Write troubleshooting guide

**Purpose**: Common issues and solutions

**Steps**:
1. Create `packages/theme-system/docs/troubleshooting.md`:
   ````markdown
   # Troubleshooting

   Common issues and solutions for @django-core/theme-system.

   ## Flash of Unstyled Content (FOUC)

   **Symptom**: Page loads with wrong theme, then flickers to correct theme.

   **Cause**: Theme script not executed before React hydration.

   **Solution**:
   - Ensure `<ThemeScript />` in `<head>` (Next.js)
   - Verify inline script before `</head>` (Django)
   - Add `suppressHydrationWarning` to `<html>`

   ```tsx
   <html suppressHydrationWarning>
     <head>
       <ThemeScript /> {/* Must be here */}
     </head>
   ```

   ## Hydration Mismatch Warnings

   **Symptom**: React console warnings about server/client mismatch.

   **Cause**: SSR renders different theme than client expects.

   **Solution**:
   - Use `resolveServerTheme()` to read cookie server-side
   - Pre-render with correct `data-theme` attribute

   ```tsx
   const theme = resolveServerTheme(cookies().get('django_theme_pref')?.value);
   return <html data-theme={theme?.mode ?? 'light'} suppressHydrationWarning>;
   ```

   ## Storage Not Persisting

   **Symptom**: Theme resets on page reload.

   **Cause**: Storage adapter not configured or failing silently.

   **Solution**:
   - Pass `storage` prop to `<ThemeProvider>`
   - Check browser console for storage errors
   - Verify cookie/localStorage available

   ```tsx
   <ThemeProvider storage={new CookieStorage()}>
   ```

   ## TypeScript Errors with themeVars

   **Symptom**: `Property 'color' does not exist on type...`

   **Cause**: vanilla-extract types not properly exported.

   **Solution**:
   - Ensure `@vanilla-extract/css` installed
   - Import from correct path: `import { themeVars } from '@django-core/theme-system'`

   ## Build Fails with Contrast Violations

   **Symptom**: `❌ Theme contrast validation failed`

   **Cause**: Custom tokens don't meet WCAG 2.1 AA ratios.

   **Solution**:
   - Run `pnpm validate-theme <file.json>` to identify pairs
   - See [Contrast Fixing Guide](./contrast-fixing-guide.md)
   - Use darker shades for text, lighter for backgrounds

   ## System Mode Not Updating

   **Symptom**: Theme doesn't change when OS dark mode toggled.

   **Cause**: Media query listener not subscribed.

   **Solution**:
   - Set `mode="system"` (not `"light"` or `"dark"`)
   - Verify `prefers-color-scheme` media query supported (check browser compatibility)

   ## Need Help?

   - Check [API docs](./api/)
   - Review [examples](../../examples/)
   - Open issue: https://github.com/django-core/django-core/issues
   ````

**Files**: `docs/troubleshooting.md`

**Parallel?**: Yes (after T065)

---

### Subtask T071 – Create basic example app

**Purpose**: Minimal working example

**Steps**:
1. Create `examples/theme-basic/` directory structure:
   ```
   examples/theme-basic/
   ├── package.json
   ├── vite.config.ts
   ├── index.html
   ├── src/
   │   ├── main.tsx
   │   ├── App.tsx
   │   └── styles.css.ts
   └── README.md
   ```
2. Implement basic theme toggle demo with ThemeProvider and ThemeToggle
3. Add README.md with setup instructions:
   ```markdown
   # Theme System Basic Example

   Minimal example demonstrating theme system integration.

   ## Setup

   ```bash
   pnpm install
   pnpm dev
   ```

   ## Features

   - Light/dark mode toggle
   - Theme persistence with localStorage
   - Semantic token usage in styles
   ```

**Files**: `examples/theme-basic/**` (full working app)

**Parallel?**: Yes (independent of docs)

---

### Subtask T072 – Create Next.js example

**Purpose**: Complete Next.js App Router example

**Steps**:
1. Scaffold Next.js 14+ app with App Router
2. Integrate ThemeProvider with SSR
3. Add ThemeToggle in header
4. Demonstrate brand switching
5. Include README with deployment instructions

**Files**: `examples/theme-nextjs/**`

**Parallel?**: Yes (after WP05 complete)

---

### Subtask T073 – Create brand customization example

**Purpose**: Custom brand variant demo

**Steps**:
1. Create React app with two custom brands (ACME, Globex)
2. Implement brand selector dropdown
3. Show token overrides in action
4. Include contrast validation workflow

**Files**: `examples/theme-brand/**`

**Parallel?**: Yes (after WP02 complete)

---

### Subtask T074 – Create CHANGELOG.md

**Purpose**: Version history and migration notes

**Steps**:
1. Create `packages/theme-system/CHANGELOG.md`:
   ```markdown
   # Changelog

   All notable changes to `@django-core/theme-system` will be documented in this file.

   The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
   and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

   ## [0.1.0] - 2025-01-15

   ### Added

   - Initial release of theme system
   - ThemeProvider context with light/dark/system modes
   - ThemeToggle component (icon, switch, dropdown variants)
   - Storage adapters: Cookie, LocalStorage, B12, Composed
   - SSR support with zero-flash initialization
   - vanilla-extract theme contracts
   - WCAG 2.1 AA contrast validation
   - Brand variant system with hierarchical inheritance
   - Comprehensive documentation and examples

   ### Dependencies

   - React 18+
   - @django-core/design-system
   - @vanilla-extract/css ^1.14.0

   ### Peer Dependencies

   - @django-core/api-client (optional, for B12Adapter)

   ## [Unreleased]

   Nothing yet!
   ```

**Files**: `packages/theme-system/CHANGELOG.md`

**Parallel?**: Yes (update as features complete)

---

### Subtask T075 – Add JSDoc comments

**Purpose**: Inline API documentation

**Steps**:
1. Add TSDoc comments to all public exports:
   ```typescript
   /**
    * React Context provider for theme management.
    *
    * Manages theme state, applies data attributes to `<html>`, and persists
    * preferences via storage adapters.
    *
    * @example
    * ```tsx
    * import { ThemeProvider } from '@django-core/theme-system';
    * import { CookieStorage } from '@django-core/theme-system/storage';
    *
    * <ThemeProvider storage={new CookieStorage()}>
    *   <App />
    * </ThemeProvider>
    * ```
    *
    * @see {@link https://github.com/django-core/django-core/tree/main/packages/theme-system/docs/api/ThemeProvider.md | API Documentation}
    */
   export function ThemeProvider(props: ThemeProviderProps) {
     // ...
   }
   ```
2. Document all props, hooks, and utility functions
3. Run TypeDoc to generate API reference (optional)

**Files**: Update all `src/**/*.ts` and `src/**/*.tsx`

**Parallel?**: Yes (ongoing throughout implementation)

---

### Subtask T076 – Create migration guide

**Purpose**: Help teams migrate from manual theme implementations

**Steps**:
1. Create `packages/theme-system/docs/migration-guide.md`:
   ````markdown
   # Migration Guide

   Migrate from manual theme implementations to @django-core/theme-system.

   ## From CSS Variables

   **Before**:
   ```css
   :root {
     --color-bg: #ffffff;
     --color-text: #000000;
   }

   [data-theme="dark"] {
     --color-bg: #000000;
     --color-text: #ffffff;
   }
   ```

   **After**:
   ```typescript
   import { themeVars } from '@django-core/theme-system';

   export const card = style({
     backgroundColor: themeVars.color.bg.primary,
     color: themeVars.color.text.primary
   });
   ```

   ## From Context-Based Theme

   **Before**:
   ```tsx
   const ThemeContext = createContext({ theme: 'light', setTheme: () => {} });

   function App() {
     const [theme, setTheme] = useState('light');
     return (
       <ThemeContext.Provider value={{ theme, setTheme }}>
         <div className={theme === 'dark' ? 'dark' : 'light'}>
           <Content />
         </div>
       </ThemeContext.Provider>
     );
   }
   ```

   **After**:
   ```tsx
   import { ThemeProvider } from '@django-core/theme-system';

   function App() {
     return (
       <ThemeProvider>
         <Content />
       </ThemeProvider>
     );
   }
   ```

   ## From localStorage Direct Access

   **Before**:
   ```tsx
   const [theme, setTheme] = useState(() => localStorage.getItem('theme'));

   useEffect(() => {
     localStorage.setItem('theme', theme);
   }, [theme]);
   ```

   **After**:
   ```tsx
   import { LocalStorageAdapter } from '@django-core/theme-system/storage';

   <ThemeProvider storage={new LocalStorageAdapter()}>
     {/* Persistence handled automatically */}
   </ThemeProvider>
   ```

   ## Breaking Changes from Manual Implementations

   - **CSS classes replaced with data attributes**: Use `[data-theme="dark"]` selectors
   - **Theme tokens namespaced**: All tokens under `themeVars.color.*` hierarchy
   - **System mode built-in**: No need for manual `matchMedia` listeners

   ## Step-by-Step Migration

   1. Install package: `pnpm add @django-core/theme-system`
   2. Replace ThemeContext with ThemeProvider
   3. Migrate CSS variables to vanilla-extract theme contracts
   4. Replace manual localStorage with storage adapters
   5. Update component styles to use `themeVars`
   6. Run contrast validation: `pnpm validate-theme`
   7. Test SSR (if applicable) with ThemeScript
   8. Remove old theme code

   ## Need Help?

   Open migration issue: https://github.com/django-core/django-core/issues
   ````

**Files**: `docs/migration-guide.md`

**Parallel?**: Yes (independent of code)

---

## Test Strategy

**Documentation Review**:
- All links functional
- Code examples compilable
- Examples runnable without modifications

**Example Validation**:
- `pnpm build` succeeds in all examples
- `pnpm dev` starts dev server
- Theme toggle functional in each example

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Examples out of sync with API changes | Medium | Automate example builds in CI |
| Documentation becomes stale | Medium | Link to code when possible, version docs |
| Quickstart too complex | Low | User test with new developers |

---

## Definition of Done Checklist

- [ ] All T065-T076 subtasks completed
- [ ] README.md comprehensive and up-to-date
- [ ] API docs cover all public exports
- [ ] 3 integration guides (Next.js, Django, React SPA)
- [ ] 3 working examples (basic, nextjs, brand)
- [ ] Troubleshooting guide written
- [ ] CHANGELOG.md initialized
- [ ] JSDoc comments on all public APIs
- [ ] Migration guide from manual themes
- [ ] All examples build and run successfully
- [ ] `tasks.md` updated: WP08 checked off

---

## Review Guidance

**Key Checkpoints**:
1. Test quickstart with fresh project (follow README)
2. Verify all code examples compile
3. Run examples and test features
4. Check links in documentation (no 404s)
5. Validate examples in CI

---

## Activity Log

- 2025-12-13T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-13T17:40:02Z – system – shell_pid= – lane=doing – Started documentation and examples implementation
- 2025-12-13T18:38:04Z – system – shell_pid= – lane=for_review – Documentation complete - all 12 subtasks implemented
