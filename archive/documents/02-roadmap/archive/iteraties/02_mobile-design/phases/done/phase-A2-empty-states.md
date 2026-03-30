# Phase A2 — Empty States Consistent

**Track:** A (Foundation)
**Status:** ✅ Done — commit `5c46cf22`

## Doel

`SmartEmptyState` consequent toepassen op alle pagina's die data tonen. Elke lege lijst krijgt een visuele empty state met icoon, tekst en CTA.

## Context

`SmartEmptyState` bestond met 8 preconfigured types.
Uitgebreid naar **17 types** met 9 nieuwe: `projects`, `teams`, `clubs`, `users`, `seasons`, `competitions`, `audit`, `transactions`, `media`.

## Resultaat

- **28 bestanden** gewijzigd
- **25+ locaties** gemigreerd van `<Alert variant="info">` / platte tekst → `SmartEmptyState`
- `DirectoryTableShell` upgraded: rendert nu SmartEmptyState i.p.v. Alert
- CSS tokens gecorrigeerd: `--color-*` → `--app-*`
- Compact variant + `hideActions` prop toegevoegd voor inline/filter contexten
- Duplicate empty state bug gefixt in ProjectListPage

## Gemigreerde locaties

| Categorie | Bestanden |
|-----------|-----------|
| Directory lijsten | UsersList, TeamsList, ClubsList, MatchesList, SeasonsList, CompetitionsList, ContentList |
| Pagina's | ProjectsPage, ProjectListPage, OrganisationListPage, SearchPage, MediaLib |
| Perioden | CompetitionContentTab, CompetitionMatchesTable, CompetitionHierarchyTab, ProjectSeasonSquadPage |
| Componenten | MatchWizard, MatchWizardLineupStep, MemberMediaMatrix, AuditLogTable, AuditLogViewer, TransactionWidget, TransactionsPanel, MemberList |

## Checklist

- [x] Audit compleet — alle empty-state plekken gelokaliseerd
- [x] SmartEmptyState types uitgebreid (8 → 17)
- [x] Directory lijsten gemigreerd
- [x] Content pagina's gemigreerd
- [x] Overige pagina's gemigreerd
- [x] DirectoryTableShell upgraded
- [x] Compact variant + hideActions toegevoegd
- [x] CSS tokens gecorrigeerd
- [x] `npx tsc --noEmit` — pass
- [x] `npx vite build` — pass
- [x] Gecommit + pushed naar `main`
