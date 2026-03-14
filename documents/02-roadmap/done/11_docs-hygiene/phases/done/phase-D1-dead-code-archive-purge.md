# D1 — Dead Code & Archive Purge

**Status:** Todo
**Geschatte tijd:** 20 min
**Verificatie:** `npx tsc --noEmit` + `npx vitest run` (0 regressies)

---

## Scope

### 1. Dead code verwijderen (frontend)

| Bestand | Reden |
|---------|-------|
| `demo/src/pages/periods/CompetitionLegacyMatchCreateModal.tsx` | 0 imports, nooit gebruikt |
| `demo/src/pages/periods/CompetitionLegacyMatchCreateModal.module.css` | Alleen door bovenstaande |
| `demo/src/components/LazyChartBoundary.tsx` | Orphaned na recharts-migratie (R2) |

### 2. Archive-debris uit git untracken

| Map | Bestanden | Actie |
|-----|:---------:|-------|
| `documents/05-demo/archive/temp-docs/` | 10 tracked | `git rm --cached` (3 .py scripts, 7 .md) |
| `documents/05-demo/archive/csv-files/` | 12 tracked | `git rm --cached` (player data CSVs) |

Lokaal laten staan (alleen uit git index), toevoegen aan `.gitignore`.

### 3. Stale plans archiveren

| Bestand | Reden | Actie |
|---------|-------|-------|
| `plans/season-hub-refactor.md` | Datum 2025-02-28, refereert 4914-regels bestanden (max nu 435) | Verplaats naar `archive/` |
| `plans/frontend-refactoring-phases.md` | Volledig vervangen door `refactoring-status.md` (2026-03-12) | Verplaats naar `archive/` |

### 4. Lokale temp verwijderen

- `documents/05-demo/archive/temp-docs/database.sqlite` (299 KB, niet tracked maar rommel)

---

## Acceptatiecriteria

- [ ] `CompetitionLegacyMatchCreateModal` + CSS weg
- [ ] `LazyChartBoundary.tsx` weg
- [ ] 0 bestanden in `git ls-files documents/05-demo/archive/temp-docs/`
- [ ] 0 bestanden in `git ls-files documents/05-demo/archive/csv-files/`
- [ ] `season-hub-refactor.md` in `archive/`
- [ ] `frontend-refactoring-phases.md` in `archive/`
- [ ] TSC clean, tests groen
