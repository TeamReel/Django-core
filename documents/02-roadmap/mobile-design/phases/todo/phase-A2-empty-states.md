# Phase A2 — Empty States Consistent

**Track:** A (Foundation)
**Status:** 📋 Planned

## Doel

`SmartEmptyState` consequent toepassen op alle pagina's die data tonen. Elke lege lijst krijgt een visuele empty state met icoon, tekst en CTA.

## Context

`SmartEmptyState` bestaat al met 8 preconfigured types:
`content`, `matches`, `members`, `files`, `images`, `videos`, `search`, `generic`.

Maar veel pagina's gebruiken nog `<Alert variant="info">No items found</Alert>` of platte tekst.

## Taken

- [ ] Audit: welke pagina's tonen `<Alert variant="info">` als empty state
- [ ] Catalogus: welke SmartEmptyState types nodig zijn (evt. nieuwe toevoegen)
- [ ] Migreer directory lijsten: ClubsList, TeamsList, UsersList, SeasonsList, MatchesList, CompetitionsList
- [ ] Migreer content pagina's: ContentList, ContentOverview, ContentLibraryView
- [ ] Migreer overige: CreditsPage, ApprovedContent, Queue
- [ ] DirectoryTableShell: `<Alert variant="info">{emptyMessage}</Alert>` → SmartEmptyState
- [ ] Verifieer dat elke SmartEmptyState een relevante CTA-knop heeft

## Bestaande componenten

| Component | Locatie | Hergebruiken |
|-----------|---------|-------------|
| `SmartEmptyState` | `components/SmartEmptyState.tsx` | ✅ Basis |
| `DirectoryTableShell` | `components/DirectoryTableShell.tsx` | ✅ Centraal punt voor directory lijsten |

## Checklist

- [ ] Audit compleet — alle empty-state plekken gelokaliseerd
- [ ] SmartEmptyState types uitgebreid waar nodig
- [ ] Directory lijsten gemigreerd
- [ ] Content pagina's gemigreerd
- [ ] Overige pagina's gemigreerd
- [ ] DirectoryTableShell upgraded
- [ ] Elke empty state heeft CTA
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
