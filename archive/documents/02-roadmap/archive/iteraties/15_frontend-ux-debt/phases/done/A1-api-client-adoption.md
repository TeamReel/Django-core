# A1 — API Client Adoption

**Status:** ✅ Done
**Effort:** ~2 uur (research + implementatie)
**Bestanden:** 4 files geconverteerd, ~16 hardcoded call sites → centralized `api` client

## Context

Het project had 3 verschillende API-aanroeppatronen naast de centralized `api` client:

1. **`createApiClient({ baseUrl })`** — Aparte client library (`@django-core/api-client`) met `{ data, error }` response shape
2. **`getApiBaseUrl() + '/api/v1/'`** — Handmatige URL-constructie voor `fetchAllPages`
3. **`apiFetch('/api/v1/...')`** — Low-level fetch wrapper (correct voor non-v1 endpoints)

## Architectuur-inzicht

De centralized `api` client (`demo/src/api/client.ts`) gebruikt `buildUrl(path)` dat `getApiV1BaseUrl()` prepend voor relatieve paden. Dus `/search/` wordt `http://localhost:8001/api/v1/search/`.

**Niet-converteerbaar:** Platform pages (`ConstitutionPage`, `HealthCheckPage`, `ObservabilityPage`, `SecurityPage`, `ApiDocsPage`) gebruiken non-v1 endpoints (`/api/constitution/`, `/api/observability/`, etc.) — deze moeten `apiFetch` blijven gebruiken.

**Niet-converteerbaar (caching):** Files die `fetchAllPages` met `ttlMs`/`cacheKey` opties gebruiken (`useBreadcrumbsData`, `useDirectoryFilters`, `useMatchesData/fetchers`) — de `api.listAll()` heeft geen caching. Conversie zou een performance-regressie veroorzaken.

## Geconverteerde bestanden

### `contentGenerationVideoApi.ts` (4 call sites)
- `getApiBaseUrl()` import verwijderd
- 4× `postJson(\`\${getApiBaseUrl()}/api/v1/video/...\`)` → `postJson('/video/...')`
- `buildUrl` in de api client handelt URL-constructie af

### `useSearch.ts` (3 functies, ~4 call sites)
- `createApiClient` + `getApiBaseUrl` → `import { api } from '@/api'`
- Verwijderd: URL-juggling logica (`if (baseUrl.includes('/api/v1'))`)
- Verwijderd: Manual envelope unwrapping (`response.data.data`)
- `unwrapSingle` in de api client handelt DRF envelope shapes af
- Error handling: `try/catch` met `ApiError` i.p.v. `response.error`

### `useCreditsData/fetchers.ts` (5 call sites)
- `createApiClient` + `getApiBaseUrl` → `import { api, ApiError } from '@/api'`
- 5× `client.get('/api/v1/...')` → `api.get('/...')` met params object
- Error handling: `if (response.error) { ... }` → `catch (err) { if (err instanceof ApiError) { ... } }`
- Verwijderd: Manual envelope unwrapping (`response.data.data || response.data`)
- Status code checks behouden (401 → redirect, 403/404 → user-friendly messages)

### `useProjectsPageData.ts` (2 call sites)
- `fetchAllPages` + `getApiBaseUrl` imports verwijderd
- 2× `fetchAllPages(url, { credentials: 'include' })` → `api.listAll('/projects/', { params, pageSize })`
- Unused `apiBaseUrl` variabelen verwijderd

## Niet geconverteerd (bewuste keuze)

| File | Reden |
|------|-------|
| `useBreadcrumbsData.ts` | `fetchAllPages` met `ttlMs`/`cacheKey` caching |
| `useDirectoryFilters.ts` | `fetchAllPages` met `ttlMs`/`bypass` caching |
| `useMatchesData/fetchers.ts` | `fetchAllPages` met `ttlMs`/`cacheKey`/`maxItems` caching |
| `useOrgDataFetching.ts` | Mix: al deels geconverteerd, rest heeft custom headers of caching |
| `useEntityEditData.ts` | File upload met custom `X-Organization-ID` header (intentioneel `fetch`) |
| `KitsTab.tsx` | File upload met custom `X-Organization-ID` header (intentioneel `fetch`) |
| Platform pages | Non-v1 endpoints (`/api/constitution/` etc.) — `apiFetch` is correct |

## Toekomstig werk

- **React Query / SWR:** Client-side caching op abstractieniveau hoger dan `fetchAllPages`, waarna `fetchAllPages` volledig vervangen kan worden door `api.listAll()`
- **Custom headers in api client:** `ListAllOptions` uitbreiden met `headers` support zodat file uploads ook via `api.upload()` kunnen

## Verificatie

- 0 TypeScript errors in alle 4 geconverteerde bestanden
- 0 cascading errors in alle consumer directories
