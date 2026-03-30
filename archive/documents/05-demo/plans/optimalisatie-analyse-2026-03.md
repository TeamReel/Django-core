# Frontend Optimization Analysis — March 2026

> **Date:** 2026-03-13 | **Scope:** `demo/src/` (852 source files, 277 CSS modules, 8 global CSS files)

---

## 1. UX Flow Optimization — Request Waterfalls & Deduplication

### Dashboard: 8 cards, ~18 independent API calls

Each dashboard card has its own `useEffect` → `api.list()` pattern. All 8 cards fire independently on mount:

| Card | API Calls | Endpoints |
|------|-----------|-----------|
| `ActiveMatchCard` | 3 | `/activities/` ×2, `/media/items/` |
| `AssetsOverviewCard` | 3 | `/branding/assets/`, members endpoint, `/generative/requests/` |
| `ContentOverviewCard` | 2 | `/generative/requests/`, `/media/items/` |
| `DashboardSummaries` | 3 | members endpoint, `/media/items/`, `/activities/` |
| `SmartActionsCard` | 3 | members, `/generative/requests/`, `/activities/` |
| `MemberContentProgressCard` | 2 | members, `/generative/requests/` |
| `ContentBreakdownCard` | 1 | `/generative/requests/` |
| `RecentContentCard` | 1 | `/media/items/` |

**Duplicated endpoints across cards:**
- `/generative/requests/` — called by **5 cards** (Assets, Content, SmartActions, MemberProgress, Breakdown)
- `/media/items/` — called by **4 cards** (ActiveMatch, Content, Summaries, Recent)
- `/activities/` — called by **3 cards** (ActiveMatch ×2, Summaries, SmartActions)
- Members — called by **3 cards** (Assets, Summaries, MemberProgress)

**Impact:** A dashboard page load triggers ~18 HTTP requests, many hitting the same endpoints with similar params. No request deduplication exists.

### Match Detail: 4 sequential waterfall useEffects

In `useMatchContentMedia.ts` (225 lines), there are 4 chained `useEffect` calls:
1. `fetchMatchMedia()` — triggered by `match?.id`
2. `fetchContentItems()` — triggered by `match?.id`
3. `fetchTemplateAvailabilityFlags()` — triggered by `org?.id`
4. `fetchAvailableTemplates()` — triggered by `templateFlagMap` (waits for #3!)

Calls #1 and #2 are independent but fire in separate effects. Call #4 depends on #3, creating a true waterfall: load flags → then load templates. This could be parallelized to: `(#1 + #2 + #3) parallel → then #4`.

### Caching

- **Custom in-memory cache** exists in `fetchAllPages.ts` with TTL-based entries (`Map<string, CacheEntry>`) — used by ~5 production files
- **No React Query / SWR / TanStack Query** — zero server-state library
- The `api` client (`api/client.ts`) has **zero caching** — every `api.get()` / `api.list()` is a fresh HTTP call
- `fetchAllPages` cache uses `invalidateFetchAllPagesCache()` as manual invalidation — called in ~8 places

### Promise.all Usage

Good: 20+ instances of `Promise.all` found across the codebase. Parallel fetching is used in hooks like `useSeasonData`, `useMatchDataFetching`, `useContentTemplatesData`, `useQueueCounts`, `useDirectoryFilters`.

### AbortController

`useAsync` hook properly uses `AbortController` for cleanup. However, many raw `useEffect` fetch patterns don't use abort signals.

---

## 2. State Management

### React Contexts (8 total)

| Context | Location | Scope |
|---------|----------|-------|
| `SeasonContext` | `providers/SeasonProvider.tsx` | App-wide (org/project/season selection) |
| `BackNavigationContext` | `providers/BackNavigationProvider.tsx` | App-wide |
| `ToastContext` | `components/ui/Toast.tsx` | App-wide |
| `ConfirmContext` | `components/ui/ConfirmDialog.tsx` | App-wide |
| `CreateWizardCtx` | `components/CreateWizard/CreateWizardContext.tsx` | Wizard-scoped |
| `MatchWizardContext` | `components/MatchWizardV2/MatchWizardContext.tsx` | Wizard-scoped |
| `WizardContext` | `components/Wizard/WizardContext.tsx` | Wizard-scoped |

**Assessment:** Context count is reasonable. No over-nesting or "context hell."

### State Primitives

| Primitive | Count | Assessment |
|-----------|-------|------------|
| `useState` | ~232 | Primary state mechanism |
| `useReducer` | 9 | Used via shared `formReducer` utility for complex forms |
| `useMemo` | ~133 | Good memoization coverage |
| `useCallback` | ~147 | Good callback stability |
| `React.memo` | ~109 | Strong component memoization |
| `useEffect` | ~144 | Data fetching + side effects |

### No Global State Library

- Zero usage of Zustand, Redux, Jotai, Recoil, or any state management library
- All server data is held in local `useState` within hooks/components
- Data is **not shared** between routes — navigating away and back re-fetches everything

### Prop Drilling Example

`useMatchContentMedia` accepts a params object with **12 setter functions** passed in. This is a mild code smell — the setter-passing pattern works but creates tight coupling.

---

## 3. Data Fetching Patterns

### Dual API Client Architecture

Two parallel fetch systems coexist:

1. **`apiFetch` + helpers** (`utils/apiFetch.ts`) — low-level `fetch` wrapper with CSRF/auth headers. Used directly in ~20 files (platform pages, polling, etc.)
2. **`api` client** (`api/client.ts`) — typed higher-level client with `.get<T>()`, `.list<T>()`, `.listAll<T>()`, `.upload<T>()`. Used via domain modules in `api/*.ts` (16 domain files: activities, branding, content, credits, files, media, etc.)

**Issue:** Some files use `apiFetch` directly, others use `api.*`. Mixing creates inconsistency in error handling and response unwrapping.

### Generic `useAsync` Hook

A well-built generic async hook (`hooks/useAsync.ts`, 85 lines) provides:
- AbortController cleanup
- Loading/error/data state
- `reload()` function
- `setData()` for optimistic updates

Used in **13 places**. Many other data-fetching hooks duplicate this pattern manually with raw `useState` + `useEffect`.

### Optimistic Updates

- `useAsync.setData()` supports optimistic updates
- `useNotifications.ts` has explicit "Optimistic update" comment
- `useQueueCounts.ts` uses custom events for optimistic increments
- `useApprovalsData.ts` has `optimisticApprovals` state

**Assessment:** Optimistic updates exist but are ad-hoc — no systematic pattern.

### No Data Cache Between Routes

When navigating away and back, all `useEffect`-based fetches re-fire. Only `fetchAllPages` has TTL caching (5 min default).

---

## 4. Form Handling

### No Form Library

- Zero usage of React Hook Form, Formik, or any form library
- Custom `useFormFields` hook (51 lines) provides basic grouped state management
- Used in only 2 places: `RegisterPage.tsx`, `OrganisationEditPage.tsx`

### Form Inventory

| Type | Files | Pattern |
|------|-------|---------|
| HTML `<form>` elements | 3 | `SearchBar`, `LoginPage`, `RegisterPage` |
| `handleSubmit` handlers | 7 unique files | Wizard steps, modals, follow-ups |
| Wizard "forms" | ~10+ | Create flows (Project, Period, Member, Match) use wizard context state |

### No Client-Side Validation Library

- No Zod, Yup, or schema validation
- Form validation is server-side (submit → check API error response)
- Minimal inline validation exists

**Assessment:** Form handling is lightweight because most data entry flows are wizard-based rather than traditional forms. Current approach is acceptable but lacks validation feedback before submission.

---

## 5. Testing

### Unit Tests (Vitest)

- **191 test files** in `demo/src/` (`.test.ts` / `.test.tsx`)
- 0 `.spec.ts` files inside `src/` (specs are E2E only)
- **852 source files** → **22.4% test file ratio**
- Test framework: **Vitest** with jsdom environment
- Setup file: `src/test/setup.ts`
- CSS testing disabled (`css: false` in vitest config)

### E2E Tests (Playwright)

- **28 spec files** in `demo/tests/e2e/`
- Covers: navigation sweep, platform pages, config, ops, frontend, auth flows, themes, design system, docs

### Test Coverage

No coverage thresholds configured in `vite.config.ts`. Coverage output exists in `htmlcov/` but appears to be for the Django backend, not the frontend.

**Assessment:** 191 unit tests is solid. Key gap: no frontend-specific coverage reporting or CI enforcement.

---

## 6. Image & Media Optimization

### `<img>` Tags

- **9 total `<img>` tags** across the codebase
- Only **2** have `loading="lazy"` (`StudioCards.tsx`, `RecentContentCard.tsx`)
- **7 img tags without lazy loading:**
  - `AssetCompletionMatrix.tsx` (×2) — thumbnails
  - `ContentStep.tsx` — content thumbnail
  - `NavbarQuickReviewModal.tsx` — preview
  - `ReviewStep.tsx` — review preview
  - `TopNavbar.tsx` — logo (above fold, correctly not lazy)
  - `FollowUpModals.tsx` — approved composite preview
  - `ProfileHubPage.tsx` — avatar
  - `ReviewModal.tsx` — variant media

**Excluding above-fold logo, 6 images could benefit from `loading="lazy"`.**

### `<video>` Tags

- 5 video elements across the codebase
- All use `preload="metadata"` — correct pattern
- All have `muted playsInline` — good mobile UX

### No `srcSet` / `sizes`

- Zero usage of `srcSet` or responsive `sizes` attributes
- No `<picture>` elements
- WebP detection exists in helpers (base64 sniffing) but not used for `<img>` optimization

---

## 7. CSS/Styling Architecture

### Module vs Global Split

| Type | Count |
|------|-------|
| CSS Modules (`.module.css`) | **277** |
| Global CSS files | **8** (all in `styles/` + `index.css`) |

**Ratio: 97% modular** — excellent isolation.

### Global Files

All 8 global files are intentional design-system layers:
- `tokens.css`, `theme.css` — design tokens
- `base.css`, `utility.css` — resets and utilities
- `layouts.css`, `responsive.css` — structural
- `design-system-interactive.css` — interactive components
- `index.css` — entry point

### Dead CSS Modules

**0 orphaned CSS modules** — every `.module.css` file is imported by at least one `.ts`/`.tsx` file in its directory tree.

### Vanilla Extract

Vite config includes `@vanilla-extract/vite-plugin` — suggests CSS-in-TS is available but the codebase primarily uses CSS Modules.

---

## 8. Bundle Composition

### Current Strategy (vite.config.ts)

**Vendor splits (5 chunks):**
- `vendor-react` (react-dom)
- `vendor-router` (react-router-dom)
- `vendor-icons` (lucide-react)
- `vendor-recharts` (recharts + d3)
- `vendor-virtualization` (react-window)
- `vendor` (everything else from node_modules)

**Feature splits (13 chunks):**
- `chunk-identity`, `chunk-periods`, `chunk-config`, `chunk-platform`
- `chunk-frontend-dev`, `chunk-docs`, `chunk-activities`
- `chunk-aistudio`, `chunk-studio`, `chunk-medialib`, `chunk-work`
- `chunk-create-wizard`, `chunk-match-wizard`

**Assessment:** Well-structured. Bundle visualization available via `ANALYZE=true pnpm build`.

---

## Prioritized Recommendations

### HIGH IMPACT — Should address next

| # | Area | Opportunity | Effort | Impact |
|---|------|-------------|--------|--------|
| 1 | **Data Fetching** | Introduce **TanStack Query (React Query)** to replace manual `useEffect` + `useState` fetch patterns. Eliminates: duplicate requests, missing caches, manual loading/error state, no stale-while-revalidate. | L | Critical |
| 2 | **Dashboard Dedup** | Even without React Query: extract a `useDashboardData` hook that fetches each endpoint once and distributes to cards. Eliminates 10+ redundant requests per page load. | M | High |
| 3 | **Waterfall → Parallel** | In `useMatchContentMedia.ts`: combine `fetchMatchMedia` + `fetchContentItems` + `fetchTemplateAvailabilityFlags` into one `Promise.all`. Saves ~2 round-trips per match page. | S | Medium |

### MEDIUM IMPACT — Good follow-ups

| # | Area | Opportunity | Effort | Impact |
|---|------|-------------|--------|--------|
| 4 | **Images** | Add `loading="lazy"` to ~6 `<img>` tags in modals/cards (below-fold content). | XS | Low-Med |
| 5 | **API Client Consolidation** | Migrate remaining ~20 `apiFetch()` call sites to use the typed `api.*` client. Ensures consistent error handling and response unwrapping. | M | Medium |
| 6 | **useAsync Adoption** | Replace manual `useState` + `useEffect` fetch patterns (in ~20 files) with `useAsync` or React Query hooks. Reduces boilerplate and ensures abort cleanup. | M | Medium |
| 7 | **Form Validation** | Add client-side validation (Zod schemas) to wizard flows. Users currently only get feedback after server round-trip. | M | Medium |
| 8 | **Test Coverage Reporting** | Configure Vitest coverage thresholds + CI gate. Current 191 tests exist but no enforcement. | S | Medium |

### LOWER PRIORITY — Nice to have

| # | Area | Opportunity | Effort | Impact |
|---|------|-------------|--------|--------|
| 9 | **Responsive Images** | Add `srcSet` / `sizes` to user-uploaded images. Currently all images are served at full resolution regardless of viewport. | M | Low |
| 10 | **Vanilla Extract Migration** | Plugin is installed but unused. Could migrate CSS Modules → Vanilla Extract for type-safe tokens. Low urgency given 277 working modules. | XL | Low |

---

## Key Numbers Summary

| Metric | Value |
|--------|-------|
| Source files (non-test) | 852 |
| Test files (Vitest) | 191 (22.4% ratio) |
| E2E specs (Playwright) | 28 |
| React contexts | 8 |
| `useState` usages | ~232 |
| `useReducer` usages | 9 |
| `React.memo` usages | ~109 |
| `useCallback` usages | ~147 |
| `useMemo` usages | ~133 |
| `useEffect` usages | ~144 |
| CSS Modules | 277 (97% of all CSS) |
| Global CSS files | 8 |
| Orphaned CSS modules | 0 |
| `<img>` tags total | 9 |
| `<img>` missing lazy | 6 |
| `<video>` tags | 5 (all properly configured) |
| API domain modules | 16 |
| Dashboard API calls per load | ~18 (with ~10 duplicates) |
| `Promise.all` usage sites | 20+ |
| `fetchAllPages` cache users | 5 files |
| Global state library | None |
| Form library | None |
| Validation library | None |
| Server-state cache library | None |
