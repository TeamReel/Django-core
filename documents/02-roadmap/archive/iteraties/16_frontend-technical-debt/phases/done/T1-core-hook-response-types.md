# T1 — Core Hook Response Types

**Track:** T — Type Safety
**Status:** ✅ Done
**Geschatte effort:** 3 uur

---

## Doel

De 5 meest-gebruikte hooks typen: alle `<any>` generic params vervangen door response interfaces.

## Scope

| Bestand | `<any>` hits | Actie |
|---------|------------:|-------|
| `components/useBreadcrumbsData.ts` | 9 | Response interfaces voor breadcrumb API calls |
| `hooks/useMatchesData/fetchers.ts` | 5 | `Match`, `MatchList` interfaces |
| `hooks/useAppSelection.ts` | 5 | Selection response types |
| `hooks/useVideoJobs.ts` | 5 | `VideoJob` interface |
| `hooks/useCompetitionsData/fetchers.ts` | 5 | `Competition`, `CompetitionList` interfaces |

**Totaal:** -29 `<any>` hits

## Aanpak

1. Maak `types.ts` per feature-area (of voeg toe aan bestaande)
2. Definieer response interfaces gebaseerd op API response shape
3. Vervang `api.get<any>(...)` → `api.get<BreadcrumbResponse>(...)`
4. Verify met `tsc --noEmit`

## Acceptatiecriteria

- [x] 0 `<any>` in de 5 genoemde bestanden
- [x] Alle response types in dedicated `types.ts` files
- [x] `tsc --noEmit` passeert zonder errors
- [x] Bestaande tests blijven groen
