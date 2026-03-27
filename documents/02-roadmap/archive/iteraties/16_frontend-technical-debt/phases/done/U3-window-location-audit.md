# U3 — window.location Audit & Migratie

**Track:** U — UX Modernisatie
**Status:** ✅ Done
**Geschatte effort:** 3 uur

---

## Doel

Alle `window.location` gebruik auditen en waar mogelijk migreren naar React Router of data refetch patterns.

## Resultaat

**31 hits → 26 remaining (5 gemigreerd, 26 gedocumenteerd als legitimate)**

### Gemigreerde cases

| File | Was | Nu |
|------|-----|-----|
| `SeasonMediaTab.tsx:275` | `window.location.reload()` | `onMembersReload()` — callback was al een prop |
| `useSeasonMediaTabData.ts:113` | `window.location.reload()` | `onMembersReload?.()` — nieuwe param toegevoegd |
| `TeamOrganisationDetailPage.tsx:280` | `window.location.reload()` | `refetch()` — nieuw in `useTeamDetailData` |
| `ClubOrganisationDetailPage.tsx:293` | `window.location.reload()` | `refetch()` — nieuw in `useClubOrgDetailData` |

**Nieuw:** `refetch()` functie toegevoegd aan `useTeamDetailData` en `useClubOrgDetailData` via `refreshKey` state pattern.

### Categorisering remaining 26 hits

#### KEEP-ORIGIN (4 hits) — URL constructie, `window.location.origin` / `.hostname`

| File | Line | Reden |
|------|------|-------|
| `api/client.ts` | 42 | `new URL(path, origin)` — API client URL constructie |
| `components/ShareButton.tsx` | 40 | `origin + pathname` — absolute share URL |
| `components/Sidebar.tsx` | 165 | `new URL(path, origin)` — query param parsing |
| `utils/apiBase.ts` | 8 | `hostname` — environment detectie (localhost vs prod) |

> `useLocation()` biedt geen `origin` of `hostname`. Correct gebruik van `window.location`.

#### KEEP-AUTH (4 hits) — Auth redirects naar `/login`

| File | Line | Reden |
|------|------|-------|
| `layouts/AppShell.tsx` | 44 | 401 → hard redirect. Wist React state + auth tokens |
| `pages/config/credits/useCreditsData/fetchers.ts` | 80, 109, 238 | Zelfde 401 auth pattern |

> Intentioneel: full-page navigatie na auth failure om alle cached state te wissen.

#### KEEP-ERROR (6 hits) — Error recovery / retry

| File | Lines | Reden |
|------|-------|-------|
| `components/ErrorBoundary.tsx` | 59, 83 | React crash recovery — chunk reload + user retry |
| `components/RouteErrorBoundary.tsx` | 66 | Route-level error boundary |
| `components/CreateWizard/steps/SmartMatchStep.tsx` | 58 | Wizard error retry |
| `components/MatchWizardV2/steps/MatchSelectStep.tsx` | 35 | Wizard error retry |
| `components/MatchStep.tsx` | 36 | Match step error retry |
| `utils/lazyWithRetry.ts` | 32 | Code-split chunk failure recovery |

> Hard reload noodzakelijk voor JS bundle failures. Retry buttons hebben geen lokale refetch beschikbaar.

#### KEEP-EXTERNAL (4 hits) — Django-served routes (niet React)

| File | Line | URL | Reden |
|------|------|-----|-------|
| `pages/config/FeatureFlagsPage.tsx` | 156 | `/admin/login/` | Django admin login |
| `pages/docs/DeploymentPage.tsx` | 101 | `/health` | Django health endpoint |
| `pages/docs/DeploymentPage.tsx` | 102 | `/observability` | Django metrics |
| `pages/docs/DocsPage.tsx` | 74 | `/api-docs` | DRF Swagger UI |

> Geen React routes — volledige page navigatie vereist.

#### KEEP-ORG-SWITCH (4 hits) — Organisation context switch via localStorage

| File | Line | Pattern |
|------|------|---------|
| `pages/config/credits/useCreditsData/handlers.ts` | 55 | `localStorage.set` → `reload()` |
| `pages/config/RoutingRulesPage.tsx` | 72 | `localStorage.set` → `reload()` |
| `pages/config/useUsageEvents.ts` | 63 | `localStorage.set` → `reload()` |
| `pages/docs/NotificationRoutingLogsPage.tsx` | 73 | `localStorage.set` → `reload()` |

> **Cross-cutting concern:** `currentOrgId` wordt via localStorage gedeeld tussen alle hooks. Een reload zorgt dat álle consumers de nieuwe org oppikken. Migratie vereist het liften van `currentOrgId` naar React Context — toekomstige verbetering.

#### KEEP-POST-MUTATION (3 hits) — Reload na save/mutatie (geen refetch beschikbaar)

| File | Line | Context | Toekomstige fix |
|------|------|---------|-----------------|
| `pages/identity/OrgModals.tsx` | 314 | EntityEditModal `onSaved` | Voeg `refetch` toe aan `useOrgData` |
| `pages/periods/SeasonAssetsSettingsTab.tsx` | 78 | Na sponsor assets save | Voeg asset refetch toe aan parent |
| `components/AssetGenerationModal/useAssetGenModal.ts` | 148 | Na queued+approval | Voeg `onQueued` callback param toe |

> Pragmatische keuze: geen refetch beschikbaar zonder hook-architectuur wijzigingen. Gedocumenteerd als toekomstige verbeteringen.

---

## Acceptatiecriteria

- [x] Alle bestanden geaudit en gecategoriseerd
- [x] Navigate cases: geen van toepassing (alle `href =` gaan naar Django routes)
- [x] Read cases: geen van toepassing (allemaal `.origin`/`.hostname`, niet beschikbaar via `useLocation()`)
- [x] Reload cases: 5 gemigreerd naar data refetch, 13 gedocumenteerd als legitimate
- [x] External links gedocumenteerd
- [x] tsc clean (alleen 2 pre-existing errors)
