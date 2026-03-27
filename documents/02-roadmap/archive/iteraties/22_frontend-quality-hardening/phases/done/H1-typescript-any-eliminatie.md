# H1 — TypeScript `any` Eliminatie: Top 10 bestanden

> **Status:** 📋 Todo
> **Effort:** 3-4 uur
> **Impact:** ~80 van 180 `any` types → correcte types

---

## Doel

Vervang alle `any` types (inclusief `as any`, `Record<string, any>`, implicit any) door correcte TypeScript types in de top 10 bestanden met de meeste overtredingen.

## Doelbestanden

| # | Bestand | `any` count |
|---|---------|-------------|
| 1 | `demo/src/pages/platform/useFeatureFlagsData.ts` | 12 |
| 2 | `demo/src/pages/activities/match-detail/useMatchDerived.ts` | 8 |
| 3 | `demo/src/pages/identity/directory/useUserEditData.ts` | 8 |
| 4 | `demo/src/pages/identity/organisation/orgModalHandlers.ts` | 7 |
| 5 | `demo/src/pages/identity/directory/useUsersListFetchers.ts` | 7 |
| 6 | `demo/src/pages/identity/season/ProjectSeasonDetailPage.tsx` | 7 |
| 7 | `demo/src/pages/identity/teams/useTeamsListData.ts` | 7 |
| 8 | `demo/src/pages/platform/notifications/NotificationRoutingLogsPage.tsx` | 6 |
| 9 | `demo/src/pages/identity/season/SeasonOverviewTab.tsx` | 6 |
| 10 | `demo/src/components/dashboard/ContentProgressCard.tsx` | 5 |

## Werkwijze

1. **Per bestand:**
   - Zoek alle `any` (explicit en implicit)
   - Bepaal het juiste type op basis van API responses en usage
   - Definieer interfaces in het bestand of in `demo/src/types/`
   - Vervang `any` → concreet type
2. **Fix downstream type errors** — cascading type changes doorvoeren
3. **Verifieer** na elk bestand

## Veelvoorkomende patronen

```typescript
// ❌ Slecht
const data: any = response.data;
(item as any).name

// ✅ Goed
interface FeatureFlag { key: string; enabled: boolean; }
const data: FeatureFlag[] = response.data;
```

## Verificatie

```bash
cd demo && npx tsc --noEmit && npx vite build
```

## Acceptatiecriteria

- [ ] Alle 10 bestanden hebben 0 `any` types
- [ ] Geen nieuwe `any` geïntroduceerd elders
- [ ] `tsc --noEmit` slaagt zonder nieuwe errors
- [ ] `vite build` slaagt
- [ ] Geen runtime regressies

## Commit

```
refactor(types): eliminate any types in top 10 files — roadmap 22 H1
```
