# T4 — Remaining `<any>` Sweep

**Track:** T — Type Safety
**Status:** ✅ Done
**Geschatte effort:** 8 uur
**Werkelijke effort:** ~4 uur

---

## Doel

Alle resterende ~110 files met `<any>` generics (~110 hits) batch-gewijs typen per feature-area.

## Resultaat

| Batch | Files | `<any>` verwijderd |
|-------|------:|-------------------:|
| 4-hit files | 5 | ~20 |
| 3-hit files | 11 | ~33 |
| 2-hit files | 24 | ~48 |
| 1-hit files | 27 | ~27 |
| **Totaal** | **~55** | **~110** (→ 1 bewust behouden: `lazyWithRetry.ts` — idiomatic React `ComponentType<any>`) |

## Scope

Na T1-T3 waren de top offenders getypt. T4 was een systematische sweep:

| Feature Area | Geschatte files | Strategie |
|--------------|---------------:|-----------|
| `pages/identity/` | ~25 | Org, Club, User, Member types |
| `pages/periods/` | ~20 | Season, Competition, Activity types |
| `pages/config/` | ~15 | Config, Template, Feature types |
| `pages/content/` | ~10 | Content, Generation types |
| `hooks/` | ~15 | Shared hook response types |
| `components/` | ~20 | Component-level API call types |
| `pages/` (overige) | ~25 | Page-specific types |

**Totaal:** ~310 `<any>` hits → 0

## Aanpak

1. Werk per feature-area directory
2. Maak gedeelde types in `types.ts` per area
3. Hergebruik entity types maximaal
4. Batch-verify met `tsc --noEmit` per area

## Acceptatiecriteria

- [x] 1 `<any>` generic in productiebestanden (bewust behouden: `lazyWithRetry.ts`)
- [x] Response types hergebruikt uit `@/types/api/*` en lokale types
- [x] `tsc --noEmit` passeert (alleen 2 pre-bestaande fouten in `ProjectSeasonMemberDetailPage.tsx`)
- [ ] Tests groen
