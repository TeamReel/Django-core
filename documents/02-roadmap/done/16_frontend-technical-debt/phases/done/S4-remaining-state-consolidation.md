# S4 — Remaining State Consolidation

**Track:** S — State Management
**Status:** 📋 Todo
**Geschatte effort:** 4 uur

---

## Doel

Overige ~48 files met 8-18 useState calls triageren en waar zinvol consolideren.

## Scope

Files met 8-18 useState die niet in S1-S3 behandeld zijn. Triage per file:

| Uitkomst | Criterium |
|----------|-----------|
| **Migreer** | >12 useState OF logisch gerelateerde state |
| **Accepteer** | <12 useState EN state is onafhankelijk |
| **Split hook** | Hook doet te veel → split in 2+ focused hooks |

### Bekende kandidaten (>15 useState)

- `pages/periods/useSeasonFormState.ts` (19)
- `pages/content/useContentLibraryData.ts` (19)
- `pages/identity/useProjectsPageData.ts` (19)
- `pages/identity/useSeasonSquadAddMemberData.ts` (18)
- `components/MatchWizardV2/MatchWizardContext.tsx` (18)
- `pages/config/useContentTemplatesData.ts` (18)
- `hooks/useDirectoryFilters.ts` (18)

## Aanpak

1. Triage alle 48 files → migreer / accepteer / split
2. Migreer top-priority files naar useReducer
3. Documenteer geaccepteerde files met rationale
4. Verify geen regressies

## Acceptatiecriteria

- [ ] Alle 48 files getriaged
- [ ] Files met >15 useState gemigreerd of gesplit
- [ ] Totaal files met >8 useState gedaald van 68 → <10
- [ ] Tests groen
