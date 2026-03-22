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

**Content per seizoen (ContentItem):**
- `ContentItem.template.template_type = 'season'` → gekoppeld aan seizoen via `activity.period`
- Subtypes: `transformation` (then vs now), `season_recap`
- API: `GET /api/v1/content-generation/?project_id={teamId}&template_type=season`

**Content per wedstrijd (ContentItem):**
- `ContentItem.template.template_type = 'pre_match'` + `template_subtype = 'lineup'`
- Gekoppeld aan wedstrijd via `activity_id` (Activity type='match')
- API: `GET /api/v1/content-generation/?project_id={teamId}&template_type=pre_match`

**Geen extra API calls nodig voor hiërarchie** — `useHierarchyData` haalt seizoenen + competities al op.

## Taken

### 1. Seizoenen-accordion op Overview (`MyTeamHubPage.tsx`)
- [ ] Nieuwe accordion-sectie "Seizoenen" in de Overview tab
- [ ] Per seizoen tonen:
  - Naam (bijv. "2025-2026")
  - Datum range (start – eind, of "Lopend" badge)
  - Wedstrijden count (`hierarchyMatchesCountBySeasonId[season.id]`)
  - Competities count (`hierarchyCompetitionsBySeasonId[season.id]?.length`)
  - **Content badge**: "Seizoenscontent aanwezig" als er `ContentItem`s zijn met `template.template_type='season'` voor dit seizoen (bijv. transformation / season_recap)
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
  - **Content badge per wedstrijd**: indicator hoeveel wedstrijden in deze competitie al een `lineup` ContentItem hebben (`template.template_subtype='lineup'`, `template_type='pre_match'`)
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
  - Content progress: "X van Y wedstrijden hebben een lineup video" (ContentItem met `template_subtype='lineup'`)
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

### 5. Sub-component extractie (500-lijn grens)

`MyTeamHubPage.tsx` is al ~860 regels en overschrijdt de 500-lijn grens uit de frontend instructions. Deze componenten extracten als eigen bestanden:

| Nieuw bestand | Inhoud |
|--------------|--------|
| `SeasonAccordion.tsx` | Seizoenen-lijst met switch handler |
| `CompetitionAccordion.tsx` | Competities-lijst met sheet trigger |
| `CompetitionSummarySheet.tsx` | Sheet component (eigen map) |

### 6. Styling (`MyTeamHubPage.module.css`)
- [ ] Seizoen-rij: naam + meta + chevron — `min-height: 44px` (touch target)
- [ ] **"Actief" badge: `var(--app-success)` — semantisch token** (NIET `--color-success-100`)
- [ ] **"Lopend" badge: `var(--app-primary)` — semantisch token** (NIET `--color-primary-100`)
- [ ] Competitie-rij: naam + type badge + wedstrijden count
- [ ] Empty states: gebruik `EmptyState` ui-primitive of eigen layout met `var(--app-muted-text)`
- [ ] Alle kleur-tokens: uitsluitend `var(--app-*)` semantische tokens, nooit `var(--color-*)`
- [ ] Animaties: `transition: opacity var(--duration-fast) var(--ease-default)` + `@media (prefers-reduced-motion: reduce)` block

### 7. Loading states & UX bij seizoen-switch
- [ ] **Optimistic UI**: geselecteerde seizoen-rij krijgt direct `aria-selected="true"` + visuele highlight (geen wachten op data)
- [ ] **Tab-content**: bij seizoen-switch korte fade (`opacity: 0 → 1`) op data-secties
- [ ] **Skeleton screen**: als `hierarchySeasons` nog laadt → 3 placeholder-rijen met shimmer animatie
- [ ] **Loading indicator**: klein spinner next to SeasonSwitcher terwijl nieuwe seizoen-data laadt
- [ ] Alle skeletons: `@media (prefers-reduced-motion: reduce)` → statische placeholder zonder animatie

### 8. Race condition afhandeling
- [ ] Gebruik `AbortController` in season-switch handler: annuleer vorige request als user snel wisselt
- [ ] Debounce of disable de seizoen-knoppen tijdens loading (prevent double-tap)
- [ ] Bij PATCH `/auth/active-context/` fout: toon toast maar behoud lokale state (optimistic)
- [ ] Pattern: zelfde als `useHierarchyData` abort-pattern als dat al aanwezig is

## Verificatie

- [ ] Overview tab: "Seizoenen" accordion toont alle seizoenen van het team
- [ ] Actief seizoen gemarkeerd met semantische token-kleur (geen primitive)
- [ ] Tap op ander seizoen → optimistic highlight → data wisselt (zonder navigatie)
- [ ] Snelle dubbele tap: geen race condition, laatste seizoen wint
- [ ] "Competities" accordion toont competities van het actieve seizoen
- [ ] Na seizoen-switch: Competities-accordion updaten naar nieuwe seizoen
- [ ] Tap op competitie → CompetitionSummarySheet opent
- [ ] Empty state: seizoenloos team toont CTA, competitie-vrij seizoen toont CTA
- [ ] Skeleton: tijdens laden van `hierarchySeasons` → placeholder rijen zichtbaar
- [ ] Mobile (375px): touch targets ≥ 44px, accordions werken
- [ ] Dark theme: alle tokens correct (geen primitive color tokens)
- [ ] `@media (prefers-reduced-motion: reduce)`: animaties uitgeschakeld
- [ ] `SeasonAccordion.tsx`, `CompetitionAccordion.tsx` als aparte bestanden (< 150 regels elk)
- [ ] TypeScript: `npx tsc --noEmit` clean
