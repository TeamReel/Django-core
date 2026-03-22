# H2 — Seizoen & competitie overzicht

| | |
|---|---|
| Status | TODO |
| Effort | ~5 uur |
| Blokkeerd door | H1 |

## Doel

Overview tab toont alle seizoenen en competities van het team als interactieve accordions. De user kan vanuit de hub direct tussen seizoenen switchen en competitie-detail bekijken.

## Context

**Data al beschikbaar via `useTeamTabData`:**
- `hierarchySeasons` → array van alle `Period` seizoenen van het team
- `hierarchyCompetitionsBySeasonId` → map van seizoen-id → competities
- `hierarchyMatchesCountBySeasonId` → wedstrijden per seizoen
- `hierarchyMatchesCountByCompetitionId` → wedstrijden per competitie

**Geen extra API calls nodig** — `useHierarchyData` haalt dit al op.

## Taken

### 1. Seizoenen-accordion op Overview (`MyTeamHubPage.tsx`)
- [ ] Nieuwe accordion-sectie "Seizoenen" in de Overview tab
- [ ] Per seizoen tonen:
  - Naam (bijv. "2025-2026")
  - Datum range (start – eind, of "Lopend" badge)
  - Wedstrijden count (`hierarchyMatchesCountBySeasonId[season.id]`)
  - Competities count (`hierarchyCompetitionsBySeasonId[season.id]?.length`)
- [ ] Actief (geselecteerd) seizoen visueel gemarkeerd: badge "Actief" + highlight
- [ ] Andere seizoenen: `onTap` → roept `handleSeasonSwitch(season.id)` aan
- [ ] Max 5 weergegeven; bij meer: "Alle {n} seizoenen →" link (expandable of sheet)
- [ ] Lege staat: "Nog geen seizoenen" met CTA om seizoen aan te maken

### 2. Competities-accordion op Overview (`MyTeamHubPage.tsx`)
- [ ] Nieuwe accordion-sectie "Competities" in de Overview tab
- [ ] Toont competities van het **huidig geselecteerde** seizoen
- [ ] Per competitie tonen:
  - Naam
  - Type badge (competitie/beker/vriendschappelijk)
  - Wedstrijden count
- [ ] `onTap` → opent `CompetitionSummarySheet` (zie stap 3)
- [ ] Lege staat: "Geen competities voor dit seizoen" met CTA
- [ ] Accordions update automatisch bij seizoen-switch

### 3. `CompetitionSummarySheet` (nieuw component)
- [ ] Locatie: `demo/src/components/CompetitionSummarySheet/CompetitionSummarySheet.tsx`
- [ ] Pattern: volgt `MemberSummarySheet` of `MatchSummarySheet` structuur
- [ ] Inhoud:
  - Competitie naam + type
  - Datum range
  - Aantal wedstrijden
  - Datum van volgende wedstrijd (als beschikbaar)
  - "Alle wedstrijden bekijken →" link
- [ ] Bottom sheet op mobile, side panel op desktop (volgt bestaande Sheet pattern)
- [ ] Props: `competition: Period`, `onClose: () => void`

### 4. Positie in Overview accordion-volgorde
Gewenste volgorde van accordions op Overview tab:
1. Team info (al aanwezig)
2. **Seizoenen** (nieuw, H2)
3. **Competities** (nieuw, H2)
4. Selectie preview (al aanwezig)
5. Assets preview (verbeterd in H4)
6. Beheer (al aanwezig, verbeterd in H4)

### 5. Styling (`MyTeamHubPage.module.css`)
- [ ] Seizoen-rij stijling: naam + meta + chevron
- [ ] "Actief" badge: `var(--color-success-100)` achtergrond, `var(--color-success-700)` tekst
- [ ] "Lopend" badge: `var(--color-primary-100)` voor huidig jaar
- [ ] Competitie-rij: naam + type badge + wedstrijden count
- [ ] Empty states: gecentreerde tekst + CTA knop

## Verificatie

- [ ] Overview tab: "Seizoenen" accordion toont alle seizoenen van het team
- [ ] Actief seizoen gemarkeerd met badge
- [ ] Tap op ander seizoen → hub data wisselt naar dat seizoen (zonder navigatie)
- [ ] "Competities" accordion toont competities van het geselecteerde seizoen
- [ ] Na seizoen-switch: Competities-accordion updaten naar nieuwe seizoen
- [ ] Tap op competitie → CompetitionSummarySheet opent
- [ ] Mobile (375px): accordions werken, touch targets ≥ 44px
- [ ] TypeScript: `npx tsc --noEmit` clean
