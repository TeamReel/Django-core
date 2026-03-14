# A1 — Top URL Hotspots → API Client

**Track:** A — API Centralisatie
**Status:** 📋 Todo
**Geschatte effort:** 4 uur

---

## Doel

De 7 files met de meeste hardcoded `/api/v1/` strings migreren naar de gecentraliseerde API client.

## Scope

| Bestand | `/api/v1/` hits | Actie |
|---------|----------------:|-------|
| `main.tsx` | **7** | Health check + startup calls → `api.*` |
| `hooks/useMatchesData/fetchers.ts` | **6** | Match API calls → `api.list/get` |
| `hooks/useDirectoryFilters.ts` | **5** | Directory filter calls → `api.list` |
| `pages/identity/useUserDetailApi.ts` | **5** | User detail calls → `api.get/patch` |
| `pages/periods/useSeasonBulkActions.ts` | **4** | Bulk action calls → `api.post` |
| `hooks/useAppSelection.ts` | **4** | Selection calls → `api.get/list` |
| `hooks/useCompetitionsData/fetchers.ts` | **4** | Competition calls → `api.list/get` |

**Totaal:** -35 hardcoded URLs

## Aanpak

1. Per file: identificeer welke `api.*` method past (get/list/post/patch/delete)
2. Vervang `getApiBaseUrl() + '/api/v1/...'` → `api.get('/endpoint')`
3. Waar nodig: voeg nieuwe API client methods toe
4. Verify: alle API calls werken identiek

## Acceptatiecriteria

- [ ] 0 hardcoded `/api/v1/` in de 7 genoemde bestanden
- [ ] Alle calls via `api.*` methods
- [ ] API responses ongewijzigd
- [ ] Tests groen
