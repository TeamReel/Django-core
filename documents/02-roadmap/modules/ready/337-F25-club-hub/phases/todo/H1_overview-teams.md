# H1 — Overview tab (hero + teams + samenvatting)

| | |
|---|---|
| Status | TODO |
| Effort | ~4 uur |
| Blokkeerd door | H0 |

## Doel

De Overview tab is het visuele visitekaartje van de club. Premium iOS-stijl: hero card bovenaan, team-kaarten als tapbare visuele blokken, samenvattingskaarten met inline acties. Geen accordions of rijen met chevrons — dat is Android-settings-stijl.

## Design-principe: iOS Premium

De Overview moet voelen als een **Apple Fitness+ dashboard** of een **Spotify artist page** — niet als een instellingenmenu. Concrete richtlijnen:

- **Hero card bovenaan**: club banner/achtergrond foto, club naam in overlay, logo, badge met "X teams · Y leden"
- **Card-based layout**: elke sectie is een visuele kaart met afgeronde hoeken, subtiele schaduw, content-first
- **Direct tapable**: team-kaart = hele kaart is een tap-target (niet een "Ga naar →" linkje)
- **Geen chevrons/rij-lijsten**: dit is een overzichtspagina, geen menu
- **Visuele hiërarchie**: hero → teams → assets status → leden teller (groot naar klein)

## Context

**Data nodig:**
- `GET /projects/?parent_project_id={clubId}` → alle teams van de club
- `GET /brands/?project_id={clubId}` → club BrandProfile (logo, sponsor, `club_background`)

## Taken

### 1. Hero card (bovenaan Overview)

- [ ] **Banner afbeelding**: `club_background` uit BrandProfile (of gradient fallback met club-kleuren)
- [ ] **Club logo**: overlay links-onder op de banner, `border-radius: 50%`, witte rand
- [ ] **Club naam**: grote typografie (`var(--font-size-2xl)`) over de banner
- [ ] **Stats badge**: "X teams · Y leden" — compact, `var(--app-surface-2)` pill-badge
- [ ] **Visuele stijl**: `border-radius: var(--radius-lg)`, `overflow: hidden`, aspect-ratio ~21:9 op mobile
- [ ] **Skeleton**: banner-shaped placeholder met shimmer bij laden

### 2. Teams sectie (visuele kaartengrid — geen aparte tab)

- [ ] **Sectie header**: "Teams" — grote typografie, geen accordion, altijd open
- [ ] **Responsive grid**: `display: grid`, `grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))`, `gap: var(--space-3)`
- [ ] Per **TeamCard**:
  - Banner: team-kleur gradient of `club_background` crop (aspect-ratio 3:2)
  - Team naam (bold, centered onder banner)
  - Subtekst: actief seizoen naam of "Geen seizoen" in `var(--app-muted-text)`
  - Leden count badge: "12 leden" pill
  - Hele kaart is een `<button>` (a11y) → `navigate(routes.teamHub(...))`
  - Hover: subtle lift (`translateY(-2px)` + schaduw-toename)
  - Active: press-down feedback (`scale(0.98)`)
- [ ] Sortering: alfabetisch
- [ ] Lege staat: visuele kaart met "+" icoon + "Team toevoegen" tekst (niet een lege-tekst-rij)
- [ ] Op mobile (375px): 2 kolommen
- [ ] Op desktop (1280px): 3-4 kolommen

### 3. Club assets samenvatting (visuele kaart, niet rij-lijst)

- [ ] **Enkele samenvattingskaart** "Brand assets" met inline statusbadges:
  - Logo: ✅ of ⚠️ icoon + "Ingesteld" / "Ontbreekt"
  - Sponsor: ✅ of ⚠️
  - Kits: "4 van 8 ingesteld" progress-indicator (visuele bar of cirkel)
  - Locatie: ✅ of ⚠️
- [ ] **Hele kaart tapbaar** → `navigateToTab('assets')`
- [ ] Kaart stijl: `var(--app-surface-2)`, `border-radius: var(--radius-md)`, `padding: var(--space-4)`
- [ ] Visuele iconen per asset type (niet alleen tekst)

### 4. Club leden samenvatting (compact)

- [ ] **Mini-kaart**: "Leden" + grote teller (bijv. "8") + "Club beheerders en editors"
- [ ] Tapbaar → `navigateToTab('leden')`
- [ ] Avatar-rij: eerste 5 profielfoto's als overlapping cirkel-thumbnails (à la GitHub contributors)

### 5. Quick actions (optioneel — als ruimte)

- [ ] Rij van 2-3 actie-knoppen onder de hero:
  - "Assets beheren" → `navigateToTab('assets')`
  - "Team toevoegen" → create flow (of disabled als niet beschikbaar)
  - "Instellingen" → `navigateToTab('beheer')`
- [ ] Stijl: pill-buttons, `var(--app-primary)` achtergrond, icoon + label

### 6. Sub-component extractie (500-lijn grens)

| Nieuw bestand | Inhoud | Max regels |
|--------------|--------|-----------|
| `ClubOverviewTab.tsx` | Overview tab layout (hero + secties) | 250 |
| `ClubHeroCard.tsx` | Hero card met banner + logo + stats | 100 |
| `TeamCard.tsx` | Herbruikbare team-kaart | 80 |

### 7. Styling
- [ ] **Cards**: `var(--app-surface-2)` achtergrond, `var(--app-border)` subtiele rand, `border-radius: var(--radius-md)`
- [ ] **Hover-staat**: `var(--app-surface-3)` + `box-shadow` toename — alleen op `@media (hover: hover)`
- [ ] **Active/tap-staat**: `transform: scale(0.98)` — snelle feedback
- [ ] **Status badges**: `var(--app-success)` groen, `var(--app-warning)` geel
- [ ] **Grid**: CSS Grid, responsive
- [ ] **Hero banner**: `object-fit: cover`, gradient overlay voor tekst-leesbaarheid
- [ ] `@media (prefers-reduced-motion: reduce)` → geen hover-lift, geen scale-transition

### 8. Loading states
- [ ] Hero card: banner-shaped skeleton met shimmer
- [ ] Team cards: 3 placeholder-kaarten met shimmer
- [ ] Asset samenvatting: kaart-skeleton
- [ ] `@media (prefers-reduced-motion: reduce)` → statische placeholders

## Terugnavigatie

- [ ] **Van Club Hub → Dashboard**: browser back of bottom nav "Home"
- [ ] **Header**: geen expliciete back-button nodig (club hub is top-level)
- [ ] **Van Team Hub → Club Hub**: "← Club" breadcrumb-link in Team Hub header (wordt aangevuld in F24 H4 of F25 H4)

## Verificatie

- [ ] Overview tab: hero card toont banner + club logo + naam
- [ ] Team-kaarten: responsive grid, 2 kolommen op 375px, 3+ op 1280px
- [ ] Klik op team-kaart → navigeer naar `/:org/:club/:team`
- [ ] Asset samenvatting: visuele kaart met status badges, tapbaar → Assets tab
- [ ] Leden samenvatting: teller + avatar-rij, tapbaar → Leden tab
- [ ] Lege staat (geen teams): visuele "+" kaart
- [ ] Hero card: skeleton bij laden, banner + fallback gradient
- [ ] Hover-effect: lift + schaduw op desktop (`@media (hover: hover)`)
- [ ] Tap-feedback: scale(0.98) op mobile
- [ ] `@media (prefers-reduced-motion: reduce)`: geen animaties
- [ ] Dark mode: alle tokens correct
- [ ] `npx tsc --noEmit` clean
