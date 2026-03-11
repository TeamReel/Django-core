# C1 — Archive Purge

**Status:** ✅ Done
**Effort:** 1 uur
**Scope:** Verwijder `_archive/` directory + controleer unused imports

---

## Doel

Verwijder 5.404 regels dode code in `pages/_archive/`. Deze files zijn niet geïmporteerd en bestaan alleen als historische referentie.

## Current State

| File | Lines |
|------|-------|
| `ProjectDetailPage.identity.tsx` | 2.915 |
| `IntegrationStatusTabs.tsx` | 1.423 |
| `OrganisationDetailPage.organisations.tsx` | 555 |
| `ProjectDetailPage.projects.tsx` | 429 |
| Overige | ~82 |
| **Totaal** | **5.404** |

## Acties

1. Verwijder `demo/src/pages/_archive/` directory volledig
2. Zoek naar imports die naar `_archive` verwijzen (verwacht: 0)
3. Verifieer `tsc --noEmit` + `vitest run` nog steeds groen

## Verificatie

- [x] `_archive/` directory bestaat niet meer
- [x] Geen imports naar `_archive` in codebase
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green (123 files, 529 tests)
- [x] Gecommit + gepusht
