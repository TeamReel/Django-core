# H2 — Seizoen & competitie overzicht

| | |
|---|---|
| Status | TODO |
| Effort | ~5 uur |
| Blokkeerd door | H1 |

## Doel

Overview tab toont seizoenen en competities als visuele kaarten — iOS-premium stijl, niet als accordions met chevron-rijen. De user ziet direct de belangrijkste data per seizoen/competitie en kan snel wisselen of doorklikken.

## Design-principe

De Overview is het visitekaartje van het team. Het moet voelen als een **Apple Fitness+ overzicht** — visuele blokken met data, niet als een instellingenmenu.

| Pattern | Gebruik | Niet |
|---------|---------|------|
| **Seizoen-kaart** | Visuele kaart met naam, datum, stats, "Actief" badge | Geen rij met chevron |
| **Competitie-kaart** | Kaart met naam, type-badge, wedstrijden-count | Geen accordion die open/dicht klapt |
| **Actief seizoen** | Prominente hero-kaart bovenaan | Geen markering als één rij in een lijst |
| **Andere seizoenen** | Compactere kaarten onder het actieve seizoen | Geen expandable accordion |

## Context

**Data al beschikbaar via `useTeamTabData`:**
- `hierarchySeasons` → array van alle `Period` seizoenen van het team
- `hierarchyCompetitionsBySeasonId` → map van seizoen-id → competities
- `hierarchyMatchesCountBySeasonId` → wedstrijden per seizoen
- `hierarchyMatchesCountByCompetitionId` → wedstrijden per competitie

**Geen extra API calls nodig** — `useHierarchyData` haalt alles op.

## Taken

### 1. Actief seizoen als hero-kaart op Overview
- [ ] Nieuwe sectie "Seizoen" in de Overview tab — geen accordion, altijd open
- [ ] **Actief seizoen hero-kaart**:
  - Seizoen naam (groot, `var(--font-size-xl)`)
  - Datum range (start – eind) of "Lopend" badge
  - Stats rij: "X wedstrijden · Y competities · Z leden"
  - Visuele stijl: `var(--app-surface-2)`, `border-radius: var(--radius-md)`, `padding: var(--space-4)`
  - "Actief" badge: `var(--app-success)` pill
- [ ] **Andere seizoenen** (compact, onder het actieve seizoen):
  - Horizontale scrollbare rij van compacte seizoen-pills (naam + wedstrijden-count)
  - Tap op pill → `handleSeasonSwitch(season.id)` — wisselt actief seizoen
  - Max 5 zichtbaar; bij meer: "Alle {n} seizoenen" pill aan het einde
  - Op 1 seizoen: geen rij tonen (alleen hero-kaart)
- [ ] Lege staat: visuele kaart met "Seizoen aanmaken" CTA (niet een tekst-rij)

### 2. Competities als visuele kaarten
- [ ] Nieuwe sectie "Competities" — altijd open, geen accordion
- [ ] Toont competities van het **huidig geselecteerde** seizoen
- [ ] Per competitie een **kaart**:
  - Naam (bold)
  - Type badge: "Competitie" / "Beker" / "Vriendschappelijk" — `var(--app-primary)`, `var(--app-warning)`, `var(--app-muted-text)` pill
  - Wedstrijden count + datum volgende wedstrijd (indien beschikbaar)
  - Hele kaart tapbaar → opent `CompetitionSummarySheet` (zie stap 3)
  - Hover: `var(--app-surface-3)` + subtle lift — alleen `@media (hover: hover)`
  - Active: `scale(0.98)` press-feedback
- [ ] **Responsive grid**: `repeat(auto-fill, minmax(200px, 1fr))` — 1 kolom op 375px, 2+ op desktop
- [ ] Lege staat: visuele kaart "Geen competities" met CTA
- [ ] Kaarten updaten automatisch bij seizoen-switch

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

### 4. Positie in Overview volgorde
Gewenste volgorde van secties op Overview tab:
1. Team info (al aanwezig)
2. **Seizoen** (hero-kaart actief + seizoen-pills) (nieuw, H2)
3. **Competities** (kaarten-grid) (nieuw, H2)
4. Selectie preview (al aanwezig)
5. Assets preview (verbeterd in H4)
6. Beheer (al aanwezig, verbeterd in H4)

### 5. Sub-component extractie (500-lijn grens)

`MyTeamHubPage.tsx` is al ~860 regels en overschrijdt de 500-lijn grens uit de frontend instructions. Deze componenten extracten als eigen bestanden:

| Nieuw bestand | Inhoud |
|--------------|--------|
| `SeasonSection.tsx` | Seizoen hero-kaart + seizoen-pills | < 150 |
| `CompetitionGrid.tsx` | Competitie-kaarten grid + sheet trigger | < 150 |
| `CompetitionSummarySheet.tsx` | Sheet component (eigen map) |

### 6. Styling
- [ ] **Seizoen hero-kaart**: `var(--app-surface-2)`, `border-radius: var(--radius-md)`, `padding: var(--space-4)`
- [ ] **Seizoen-pills**: `var(--app-surface-3)`, `border-radius: var(--radius-full)`, `padding: var(--space-1) var(--space-3)`
- [ ] **"Actief" badge: `var(--app-success)`** — semantisch token (NIET `--color-success-100`)
- [ ] **"Lopend" badge: `var(--app-primary)`** — semantisch token (NIET `--color-primary-100`)
- [ ] **Competitie-kaarten**: `var(--app-surface-2)`, `border-radius: var(--radius-md)`, hover lift + schaduw
- [ ] Hover-effecten: alleen `@media (hover: hover)` — geen hover op touch devices
- [ ] Active/tap: `transform: scale(0.98)` — snelle feedback
- [ ] Empty states: gebruik visuele kaart met CTA, niet tekst-rij
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

- [ ] Overview tab: seizoen hero-kaart toont actief seizoen prominent
- [ ] Seizoen-pills: tap op ander seizoen → optimistic UI → data wisselt
- [ ] Actief seizoen visueel gemarkeerd met `var(--app-success)` badge
- [ ] Snelle dubbele tap: geen race condition, laatste seizoen wint
- [ ] Competitie-kaarten: grid layout, responsive 375px–1280px
- [ ] Na seizoen-switch: competitie-kaarten updaten naar nieuwe seizoen
- [ ] Tap op competitie-kaart → CompetitionSummarySheet opent
- [ ] Empty state: visuele kaart met CTA (niet tekst-rij)
- [ ] Skeleton: bij laden → kaart-skeletons zichtbaar
- [ ] Mobile (375px): touch targets ≥ 44px, kaarten full-width
- [ ] Desktop: hover-lift + schaduw op `@media (hover: hover)`
- [ ] Tap-feedback: `scale(0.98)` op alle interactieve kaarten
- [ ] Dark theme: alle tokens correct (geen primitive color tokens)
- [ ] `@media (prefers-reduced-motion: reduce)`: animaties uitgeschakeld
- [ ] `SeasonSection.tsx`, `CompetitionGrid.tsx` als aparte bestanden (< 150 regels elk)
- [ ] TypeScript: `npx tsc --noEmit` clean
