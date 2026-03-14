# A2 — Remaining URLs + getApiBaseUrl Elimination

**Track:** A — API Centralisatie
**Status:** 📋 Todo
**Geschatte effort:** 5 uur

---

## Doel

Alle resterende hardcoded `/api/v1/` strings en directe `getApiBaseUrl()` calls elimineren.

## Scope

| Categorie | Files | Hits |
|-----------|------:|-----:|
| Resterende `/api/v1/` (na A1) | ~28 | ~60 |
| Directe `getApiBaseUrl()` calls | 27 | 63 |
| **Overlap** | ~15 | — |
| **Netto unieke files** | ~40 | ~100 |

### Bekende files

- `components/useBreadcrumbsData.ts` (4)
- `components/CreateWizard/flows/MemberAddFlow.tsx` (4)
- `pages/config/credits/useCreditsData/handlers.ts` (3)
- `pages/platform/CachePerformancePage.tsx` (3)
- `pages/medialib/useMediaLibData/effects.ts` (3)
- `pages/identity/useLinkUserModal.ts` (3)
- `pages/identity/useTeamDetailData.ts` (3)
- `hooks/useGenerationHistory.ts` (3)
- + ~32 files met 1-2 hits elk

## Aanpak

1. Sweep per directory: `pages/`, `hooks/`, `components/`
2. Vervang alle directe URL constructie → `api.*` calls
3. Waar `getApiBaseUrl()` echt nodig is (external URLs): documenteer
4. Verify met grep: 0 matches

## Acceptatiecriteria

- [ ] 0 hardcoded `/api/v1/` in productiebestanden
- [ ] 0 directe `getApiBaseUrl()` (of gedocumenteerde uitzonderingen)
- [ ] Alle calls via gecentraliseerde API client
- [ ] Tests groen
