# Package Audit Report — Honest Code Assessment

**Date:** 2026-03-02
**Scope:** All 9 packages in `packages/` vs actual `demo/src/` usage

> ⚠️ **UPDATE 2026-03-12:** `notifications-hub`, `permissions` en `resource-display-alerts` zijn inmiddels gearchiveerd naar `archive/packages/`. Er zijn nu **6 actieve packages** in `packages/`: api-client, auth, context-switcher, design-system, page-templates, theme-system. De audit-conclusies voor die 3 (ARCHIVE) zijn uitgevoerd. `page-templates` REWORK is nog openstaand.
**Method:** Direct source code reading, not guessing

---

## 1. `@django-core/api-client` (v0.1.0)

### What It Exports
- `createApiClient()` — Factory returning typed `get/post/put/patch/delete` methods
- `getCsrfToken()` — Extract CSRF token from cookie
- `fetchWithCSRF()` — Legacy fetch wrapper with auto CSRF injection
- `normalizeError()` — B13 error envelope normalizer (field errors, form errors)
- `isApiError()` / `isApiSuccess()` — TypeScript type guards
- Full type exports: `ApiClientConfig`, `RequestOptions`, `ApiResponse`, `ApiError`

### Code Quality: ⭐⭐⭐⭐ Production-quality
- Clean, focused, ~200 lines total across 6 files
- Zero dependencies (pure fetch wrapper)
- Proper TypeScript generics (`ApiResponse<T>`)
- B13 error envelope normalization is genuinely useful
- Good defaults (credentials: 'include', auto CSRF for mutating methods)
- Both modern (`createApiClient`) and legacy (`fetchWithCSRF`) APIs
- Type guards are well-designed for discriminated union pattern

### What Demo Does Instead
**Mixed bag — partial adoption with massive duplication:**

- `useSearch.ts` → Uses `createApiClient` from the package ✅
- `MemberList.tsx` → Uses `fetchWithCSRF` from the package ✅
- `useSeasonsData.ts` → Imports `getCsrfToken` from the package ✅
- BUT: **5+ files define their own `getCsrfToken()`** inline:
  - `EditClubModal.tsx` → `function getCsrfToken(): string`
  - `useVideoJobs.ts` → `function getCsrfToken(): string`
  - `KitsTab.tsx` → `const getCsrfToken = (): string =>`
  - `SeasonAssetsCard.tsx` → `const getCsrfToken = (): string =>`
  - `useNotifications.ts` → `function getCsrfToken(): string`
  - `EntityEditModal.tsx` → `function getCsrfToken(): string`
- Most files do raw `fetch()` with manual headers instead of using `createApiClient`
- Error handling is ad-hoc per file (no B13 normalization in demo code)

### Verdict: **INTEGRATE — High value, low effort**
The package is small, clean, and solves a real duplication problem. The demo has 5+ copy-pasted `getCsrfToken` functions. Replacing scattered `fetch()` calls with `createApiClient` would eliminate ~200 lines of duplicated boilerplate and standardize error handling.

---

## 2. `@django-core/design-system` (v0.0.1)

### What It Exports
- **Theme:** `ThemeProvider`, `useTheme`, `lightTheme`, `darkTheme`
- **Tokens:** `colorVars`, `typographyVars`, `spacingVars`, `radiusVars`, `shadowVars`, `zIndexVars`, `motionVars`, `breakpoints`, `themeVars`, fluid typography helpers
- **Form Components:** `Button`, `Input`, `Textarea`, `Checkbox`, `Radio/RadioGroup`, `FileUpload`, `Select`
- **Data Display:** `Badge`, `Card`, `Modal`, `Tabs`, `Tooltip`, `Alert`, `Progress`, `Spinner`
- **Layout:** `Container`, `Grid`, `Stack`
- **Typography:** `Heading`, `Text`
- **Interaction:** `BottomSheet`, `PullToRefresh`, `Tabs/TabList/Tab/TabPanel`
- **Hooks:** `useSwipeGesture`, `useSwipeNavigation`, `useSwipeToDismiss`

22 component directories. Comprehensive token system with CSS variables.

### Code Quality: ⭐⭐⭐⭐ Production-quality (with caveats)
- 12,354 lines, 105 files — substantial investment
- Uses vanilla-extract for CSS-in-JS tokens (professional choice)
- Components are properly typed with forwardRef, variant props, size props
- Good patterns: `Button.css` variant/size recipes, `Button.tsx` clean component
- Token system is solid: colors, spacing, radius, shadows, z-index, motion, fluid typography
- The `ThemeProvider` here is simpler than theme-system's (see below)
- Version 0.0.1 suggests it's still considered unstable

### What Demo Does Instead
**Actively adopted — the most-used package:**

- ~157 imports across demo (Button, Alert, Badge, Card, Input, etc.)
- `import { Alert, Badge, Card } from '@django-core/design-system'` appears in 15+ page files
- `tokens.css` is imported in `main.tsx`
- However: demo still has ~3,300 inline `style={{}}` declarations
- CSS Modules used in only 5 files (vs 30+ goal)
- Many badge/card patterns are still hand-rolled with inline styles (e.g., ApprovalsPage)
- The `ThemeProvider` from this package is NOT used — `theme-system`'s is used instead

### Verdict: **KEEP & EXPAND — Already delivering value**
This is the only package with genuine traction. The ~3,300 inline styles represent the migration backlog. Continue expanding usage. The ThemeProvider here should be deprecated in favor of theme-system's (or vice versa — resolve the overlap).

---

## 3. `@django-core/notifications-hub` (v1.0.0)

### What It Exports
- **Components:** `ToastHost`, `NotificationList`, `NotificationPanel`, `UnreadBadge`, `ErrorBoundary`, `PerformanceMonitor`
- **Context:** `NotificationsProvider` (useReducer-based state machine)
- **Hooks:** `useNotifications`, `useUnreadCount`, `useNotificationsActions`, `usePolling`
- **Types:** Full notification type system (severity levels, config, filters, pagination)

### Code Quality: ⭐⭐⭐ Over-engineered prototype
- Version "1.0.0" but has hard `@ts-ignore` dependency on `@django-core/auth-ui` and `@django-core/context-switcher`
- 445-line `NotificationsProvider.tsx` — a full state machine with reducer, polling, optimistic updates, rollback, structured error logging
- Many "T0XX" task reference comments (e.g., `// T017: Fetch notifications from API`)
- Includes a `PerformanceMonitor` component — premature optimization signal
- References internal APIs that must match exactly: `/api/v1/user-notifications/`
- Console logging everywhere (`console.debug('[F04]...'`)
- **Not imported ANYWHERE in the demo** except one single import in `TemplatesPage.tsx` (a demo/showcase page)

### What Demo Does Instead
**Completely independent implementation:**

- `demo/src/hooks/useNotifications.ts` — 283-line hook that handles everything:
  - Fetch from `/api/v1/user-notifications/`
  - CSRF token management
  - Polling (30s interval)
  - Mark read/unread, mark all read
  - Optimistic updates
  - Cross-component sync via `window.dispatchEvent(new Event('notificationChanged'))`
- The demo's implementation is simpler, works, and is battle-tested in production
- No toast system in demo at all — just notification inbox UI

### Verdict: **ARCHIVE — Demo already solves this better**
The package is over-engineered for the actual need. It tries to be a generic notification platform with severity levels, toast queues, performance monitoring, and structured logging. The demo's 283-line hook does everything the app actually needs. The package would need significant trimming and decoupling from auth/context-switcher dependencies to be useful. The "Version 1.0.0" label is aspirational.

---

## 4. `@django-core/permissions` (v0.1.0)

### What It Exports
- **Provider:** `PermissionsProvider` — Fetches from `/api/permissions/current/`, caches per-context with 5min TTL
- **Hook:** `usePermissions` — Returns `hasPermission(code)`, fail-closed defaults if outside provider
- **Components:** `PermissionGate`, `PermissionMatrix`, `ActivityFeed`, `ResendInviteButton`
- **Utils:** `checkPermission`, `checkAllPermissions`, `checkAnyPermission`
- **Types:** `PermissionCode`, `PermissionScope`, `PermissionMap`, etc.

### Code Quality: ⭐⭐⭐ Well-designed but disconnected from reality
- Clean architecture: provider fetches, hook consumes, gate component hides/shows
- Per-context caching with TTL is smart
- Fail-closed `usePermissions` (returns false if no provider) is good security default
- BUT: Has `@ts-ignore` for imports from `@django-core/auth-ui` and `@django-core/context-switcher`
- **`PermissionsProvider` is commented out in `main.tsx`**: `// import { PermissionsProvider } from '@django-core/permissions';`
- Fetches from `/api/permissions/current/` — this endpoint may not exist or return the expected shape
- `ActivityFeed` and `ResendInviteButton` are business components, not permission primitives — they don't belong here

### What Demo Does Instead
**Complete inline permission system:**

- `demo/src/utils/permissions.ts` — 186-line module with:
  - `canPerformAction(action, resource, context)` — role-based RBAC
  - Convenience: `canEditProject()`, `canDeleteProject()`, `canEditOrganisation()`, `canInviteMembers()`
  - Role hierarchy: superadmin > admin > member/coach > viewer
- `demo/src/components/PermissionGuards.tsx` — Route-level guards:
  - `useUserRole()` — derives `isSystemAdmin`, `isLandAdmin`, `isOrgAdmin`, `isCoach`, `isPlayer`
  - `AdminOnlyRoute`, `OrgAdminRoute`, `SecurityRoute`, `ProtectedRoute`
- `SeasonProvider.tsx` — calculates `userCanEditProject`, `userCanDeleteProject` from context
- All permission checks are synchronous (derived from user object), no API call needed

### Verdict: **ARCHIVE — Demo's approach is simpler and already works**
The package assumes permissions come from a dedicated API endpoint. The demo derives permissions from the user's role in their organisation membership — no extra API call, no caching complexity, no TTL. The demo's pattern is simpler, faster (synchronous), and covers all current needs. The package's `PermissionGate` component pattern is nice in theory but adds indirection for minimal benefit when `{canEdit && <EditButton />}` works fine.

---

## 5. `@django-core/theme-system` (v0.1.0)

### What It Exports
- **Components:** `ThemeProvider`, `ThemeToggle`
- **Hook:** `useTheme`
- **Themes:** `themeVars`, `lightTheme`, `darkTheme`, `brandConfig`
- **Types:** `ThemeConfiguration`, `ThemeMode`, `ThemeTokenMap`, `ThemePreference`, `BrandVariant`, `BrandConfig`
- **Context:** `ThemeContext`
- **Storage adapters:** `CookieStorage`, `LocalStorageAdapter`, `B12Adapter`, `ComposedStorage`

### Code Quality: ⭐⭐⭐⭐ Production-quality, well-architected
- 181-line `ThemeProvider` with SSR support (reads data attributes set by inline scripts)
- Pluggable storage adapters (localStorage, cookies, composed)
- Supports brand variants alongside light/dark — forward-thinking for club branding
- `subscribeToSystemTheme()` utility for OS preference changes
- Data-attribute-based theming (`data-theme`, `data-brand`) — proper CSS approach
- Sub-path exports: `./storage`, `./validation`, `./ssr`

### What Demo Does Instead
**Actually uses this package!**

- `main.tsx` imports `ThemeProvider` and `LocalStorageAdapter` from `@django-core/theme-system`
- `main.tsx` imports `@django-core/theme-system/dist/style.css`
- `useTheme` is used in `TopNavigation.tsx`, `ProfileAvatarDropdown.tsx`, `ThemePage.tsx`, `usePreferencesData.tsx`, `useTopNavbarData.tsx`
- This is a genuinely integrated package

### ThemeProvider Overlap with design-system
- `design-system` has its own `ThemeProvider` (simpler: localStorage only, no brand support)
- `theme-system`'s `ThemeProvider` is what's actually mounted in the app
- `design-system`'s `ThemeProvider` is exported but NOT used in the demo
- This creates a confusing dual-export: `useTheme` exists in both packages

### Verdict: **KEEP — Already integrated and delivering value**
One of only 3 packages actually used in production. The brand variant support aligns with TeamReel's club-branding requirements. Resolve the overlap with design-system's ThemeProvider (deprecate design-system's version, or move everything into design-system).

---

## 6. `@django-core/auth-ui` (v1.0.0, published as `@django-core/auth-ui`)

### What It Exports
- **Provider:** `AuthProvider` — Session management, CSRF, `/auth/me` on mount, 401 redirect
- **Hooks:** `useAuth`, `useAuthStatus`, `useCurrentUser`, `useSignIn`, `useSignUp`, `useSignOut`, `useRequestPasswordReset`, `useConfirmPasswordReset`, `useUpdateProfile`
- **Components:** `SignInForm`, `SignInPage`, `RequestPasswordResetForm/Page`, `ConfirmPasswordResetForm/Page`, `ProfilePage`
- **Types:** `AuthConfig`, `AuthState`, `User`, `ApiError`

### Code Quality: ⭐⭐⭐⭐ Production-quality
- 286-line `AuthProvider` with full lifecycle: load → verify → authenticate → redirect
- Debounced session verification (60s cooldown)
- Duplicate request prevention via ref
- B13 error normalization
- Configurable endpoint URLs and routes
- Pre-built form components (sign-in, password reset, profile)
- Proper version export

### What Demo Does Instead
**Actually uses this package!**

- `main.tsx` wraps app in `<AuthProvider config={authConfig}>`
- `useAuth` imported in 10+ files: `App.tsx`, `PermissionGuards.tsx`, `SeasonProvider.tsx`, `ProfileAvatarDropdown.tsx`, `useDirectoryFilters.ts`, `useCreditBalance.ts`, `useUserRole.ts`, `useFeatureFlag.ts`
- `useSignOut` used in `ProfileAvatarDropdown.tsx`
- This is the authentication backbone of the app

### Verdict: **KEEP — Core infrastructure, already integrated**
This is foundational. Everything auth-related flows through this package. No duplication in the demo — the demo uses it correctly.

---

## 7. `@django-core/context-switcher` (v0.1.0)

### What It Exports
- **Provider:** `ContextSwitcherProvider` — URL-synced org/project selection with localStorage fallback
- **Hook:** `useContextSwitcher` (+ legacy alias `useContext`)
- **Components:** `ContextSwitcher`, `ContextIndicator`, `OrganisationPicker`, `ProjectPicker`
- **Utility hooks:** `useDebouncedValue`, `useKeyboardShortcut`
- **Types:** `Organisation`, `Project`, `UserContext`, `RouterAdapter`, `ContextSwitcherConfig`

### Code Quality: ⭐⭐⭐⭐ Production-quality (complex but necessary)
- 503-line `ContextSwitcherProvider` — substantial but handles real complexity:
  - URL parsing for org/project context
  - localStorage persistence
  - Auto-selecting first org
  - Slug-based URL navigation
  - API calls to fetch orgs/projects
- `RouterAdapter` pattern lets it work with any router (demo provides `useReactRouterAdapter`)
- `VirtualizedList` component for long org/project lists (react-window)
- `useKeyboardShortcut` hook is a nice bonus

### What Demo Does Instead
**Actually uses this package!**

- `main.tsx` wraps app in `<ContextSwitcherProvider config={contextConfig}>`
- `useContextSwitcher` used in `useDirectoryFilters.ts`, `usePersistedContext.ts`, `SeasonProvider.tsx`
- `useReactRouterAdapter` in `demo/src/adapters/` bridges React Router to the package
- The `ContextSwitcherPage` is a demo/showcase page for the package
- This is core multi-tenancy infrastructure

### Verdict: **KEEP — Core infrastructure, already integrated**
Essential for multi-tenancy. The demo uses it correctly through the adapter pattern. The provider is complex but the complexity is inherent to the problem (URL sync + localStorage + API + auto-selection).

---

## 8. `@django-core/page-templates` (v0.1.0)

### What It Exports
- **Layout:** `PageHeader`, `PageContent`, `BreadcrumbContextSwitcher`
- **Templates:** `Dashboard` (+ `DashboardHeader`, `DashboardGrid`, `DashboardFilterBar`), `ListDetail`, `Wizard`, `Settings`
- **State components:** (empty/loading/error states)
- **Hooks:** `useBreadcrumbContextSwitcher`, other template-specific hooks

### Code Quality: ⭐⭐⭐ Prototype-quality
- `PageHeader` is 118 lines — uses inline styles throughout (`style={{ padding: '24px' }}`)
- `renderBreadcrumbs` is hardcoded to `false` — breadcrumbs are defined but disabled
- Dashboard/ListDetail/Wizard/Settings templates exist but are thin wrappers
- No CSS variables/tokens used — hardcoded pixel values and `var(--app-...)` references
- Version 0.1.0 is accurate — it's an early prototype

### What Demo Does Instead
**Partial adoption:**

- `ApprovalsPage.tsx` imports `PageContent, PageHeader` from `@django-core/page-templates`
- `AuditLogPage.tsx` imports `PageHeader, PageContent, BreadcrumbContextSwitcher`
- `BillingPage.tsx` imports `PageHeader, PageContent`
- BUT: Most pages roll their own headers with inline styles
- The demo's page-level layout is ad-hoc — no consistent template pattern

### Verdict: **REWORK — Good idea, weak execution**
The concept of page templates is valuable (consistent headers, breadcrumbs, content areas). But the current implementation uses inline styles, has disabled breadcrumbs, and doesn't leverage the design system's tokens. Worth keeping as a concept but needs a rewrite to actually use the design system components and tokens.

---

## 9. `@django-core/resource-display-alerts` (v0.1.0, published as `@django-core/resource-alerts`)

### What It Exports
- **Components:** `Alert` (re-exports design-system's Alert), `ResourceUsageBar`, `HealthStatus`, `Badge` (separate from design-system), `ResourceCard`, `AlertStack`
- **Hooks:** `useAlertDismissal`, `useResourceUsage`, `useHealthStatus`
- **Utils:** localStorage helpers for dismissed alerts
- **Types:** `Severity`, `ResourceUsageData`, `HealthStatusType`, `HealthStatusData`

### Code Quality: ⭐⭐ Prototype with identity crisis
- `Alert` component is literally a re-export: `export { Alert } from '@django-core/design-system'`
- `Badge` duplicates the design-system's Badge component
- `ResourceUsageBar` is decent (105 lines, proper ARIA, severity-based colors)
- The package is a grab-bag: some components are novel (ResourceUsageBar, HealthStatus), some are duplicates (Alert, Badge)
- Has Storybook setup and vitest config — infrastructure is there, but the components are thin
- **Not imported ANYWHERE in the demo** — zero usage

### What Demo Does Instead
- Uses `Alert` and `Badge` directly from `@django-core/design-system`
- No resource usage bars or health status indicators in the demo
- Custom badge patterns with inline styles in ApprovalsPage
- No alert dismissal persistence anywhere

### Verdict: **ARCHIVE — Duplicates design-system with no unique value**
The only novel components (ResourceUsageBar, HealthStatus) aren't needed by the demo. The Alert and Badge re-exports create confusion. If ResourceUsageBar or HealthStatus are needed later, move them into design-system.

---

## Summary Matrix

| # | Package | Quality | Demo Uses It? | Duplicate? | Verdict |
|---|---------|---------|---------------|------------|---------|
| 1 | `api-client` | ⭐⭐⭐⭐ | Partially (3 files, 5+ have dupes) | Yes — 5+ inline getCsrfToken | **INTEGRATE** |
| 2 | `design-system` | ⭐⭐⭐⭐ | Yes (157 imports) | ThemeProvider overlaps theme-system | **KEEP & EXPAND** |
| 3 | `notifications-hub` | ⭐⭐⭐ | No (1 showcase import) | Yes — demo has useNotifications.ts | **ARCHIVE** |
| 4 | `permissions` | ⭐⭐⭐ | No (commented out) | Yes — demo has utils/permissions.ts + PermissionGuards.tsx | **ARCHIVE** |
| 5 | `theme-system` | ⭐⭐⭐⭐ | Yes (ThemeProvider in main.tsx) | ThemeProvider overlaps design-system | **KEEP** |
| 6 | `auth` (`auth-ui`) | ⭐⭐⭐⭐ | Yes (core auth backbone) | No | **KEEP** |
| 7 | `context-switcher` | ⭐⭐⭐⭐ | Yes (core multi-tenancy) | No | **KEEP** |
| 8 | `page-templates` | ⭐⭐⭐ | Partially (3 pages) | No (but weak impl) | **REWORK** |
| 9 | `resource-display-alerts` | ⭐⭐ | No (zero imports) | Yes — Alert/Badge duplicate design-system | **ARCHIVE** |

---

## Recommended Actions

### Immediate (Low effort, high impact)
1. **api-client**: Replace all 5+ inline `getCsrfToken()` with `import { getCsrfToken } from '@django-core/api-client'`. Migrate raw `fetch()` calls to `createApiClient()` incrementally.
2. **design-system ThemeProvider**: Remove/deprecate the ThemeProvider export from design-system. The app uses theme-system's version.

### Short-term (Medium effort)
3. **page-templates**: Rewrite PageHeader/PageContent to use design-system tokens and components. Enable breadcrumbs. Stop using inline styles.
4. **Consolidate tokens**: Ensure all design-system tokens are consistently used instead of `var(--app-...)` custom properties.

### Archive (Clean up)
5. Move `notifications-hub`, `permissions`, `resource-display-alerts` to `archive/packages/` or delete. Document why — the demo already solves these problems more simply.

### Keep as-is
6. `auth-ui`, `context-switcher`, `theme-system` — these are core infrastructure, well-integrated, and working. Don't touch them unless bugs arise.
