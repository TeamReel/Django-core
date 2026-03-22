# H1 — Overview tab + Teams overzicht

| | |
|---|---|
| Status | TODO |
| Effort | ~4 uur |
| Blokkeerd door | H0 |

## Doel

De Overview tab toont een samenvatting van de club: teamskaarten, club assets status, en quick links. De Teams tab geeft een volledig overzicht van alle teams met navigatie naar de team hub.

## Context

**Data nodig:**
- `GET /projects/?parent_project_id={clubId}` → alle teams van de club
- `GET /brands/?project_id={clubId}` → club BrandProfile (logo, sponsor status)

**Hergebruik:**
- Team-kaart UI: volgt het patroon van bestaande project-kaarten in de codebase
- `navigateToTab()` helper uit H0

## Taken

### 1. Overview tab inhoud (`ClubHubPage.tsx`)

Sub-component: `demo/src/pages/identity/ClubOverviewTab.tsx` (< 200 regels)

- [ ] **Teams sectie** op Overview:
  - Horizontaal scrollbare rij teamkaarten (max 3 zichtbaar, daarna scroll)
  - Per kaart: team naam, actief seizoen badge (of "Geen seizoen"), ledenaantal
  - Klik op kaart → `navigate(routes.teamHub(orgSlug, clubSlug, teamSlug))`
  - "Alle teams →" link → navigeert naar Teams tab (`navigateToTab('teams')`)
  - Lege staat: "Nog geen teams" met CTA "Team toevoegen"

- [ ] **Club assets samenvatting** op Overview:
  - Rij: Logo — status badge (aanwezig / ontbreekt) + chevron → `navigateToTab('assets')`
  - Rij: Sponsor — status badge + chevron → `navigateToTab('assets')`
  - Rij: Kits — "X van Y kits ingesteld" badge + chevron → `navigateToTab('assets')`
  - Rij: Locatie — status badge + chevron → `navigateToTab('assets')`
  - Geen tweede weergave van de assets zelf — alleen status + navigatie

- [ ] **Leden samenvatting** op Overview:
  - "X club-leden" teller + chevron → `navigateToTab('leden')`

- [ ] **Accordion volgorde** op Overview:
  1. Teams
  2. Club assets
  3. Leden
  4. Beheer (quick links naar instellingen)

### 2. Teams tab inhoud

Sub-component: `demo/src/pages/identity/ClubTeamsTab.tsx` (< 300 regels)

- [ ] Grid van teamkaarten (2 kolommen op mobile, 3+ op desktop)
- [ ] Per team kaart:
  - Team naam + team logo (of club logo als fallback)
  - Actief seizoen naam (of "Geen actief seizoen")
  - Aantal leden in actief seizoen
  - Aantal wedstrijden in actief seizoen
  - "Ga naar team →" knop → `navigate(routes.teamHub(orgSlug, clubSlug, teamSlug))`
- [ ] Sortering: alfabetisch op naam (standaard)
- [ ] Lege staat: "Nog geen teams. Voeg een team toe om te beginnen."
- [ ] Skeleton: bij laden 3 placeholder kaarten met shimmer
- [ ] `@media (prefers-reduced-motion: reduce)` → statische skeleton

### 3. Sub-component extractie (500-lijn grens)

`ClubHubPage.tsx` mag max 500 regels. Extracten:

| Nieuw bestand | Inhoud | Max regels |
|--------------|--------|-----------|
| `ClubOverviewTab.tsx` | Overview tab accordions | 200 |
| `ClubTeamsTab.tsx` | Teams grid + kaarten | 300 |
| `TeamCard.tsx` | Herbruikbare team-kaart | 80 |

### 4. Styling
- [ ] Teamkaarten: `var(--app-surface-2)` achtergrond, `var(--app-border)` rand
- [ ] Hover-staat: `var(--app-surface-3)` (geen hardcoded kleuren)
- [ ] Status badges: `var(--app-success)` groen, `var(--app-warning)` geel, `var(--app-muted-text)` grijs
- [ ] Grid: CSS Grid, responsive met `minmax(240px, 1fr)`
- [ ] `aspect-ratio: 16/9` op team kaart header (voor logo/banner)

### 5. Loading states
- [ ] Teams laden: skeleton kaarten (3 placeholders)
- [ ] Overview secties: skeleton rijen
- [ ] Alle skeletons: shimmer animatie + `prefers-reduced-motion` fallback

## Verificatie

- [ ] Overview tab: teams sectie toont alle teams als kaarten
- [ ] Klik op teamkaart → navigeer naar `/:org/:club/:team`
- [ ] "Alle teams →" → Teams tab opent
- [ ] Overview assets samenvatting: rijen klikbaar → Assets tab
- [ ] Teams tab: grid zichtbaar, responsive 375px + 1280px
- [ ] Lege staat: zichtbaar als club geen teams heeft
- [ ] Skeleton: zichtbaar tijdens laden
- [ ] `npx tsc --noEmit` clean
