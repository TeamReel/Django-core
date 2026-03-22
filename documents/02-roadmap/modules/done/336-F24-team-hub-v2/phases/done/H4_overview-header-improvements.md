# H4 — Overview & header verbeteringen

| | |
|---|---|
| Status | TODO |
| Effort | ~5 uur |
| Blokkeerd door | H2, H3 |

## Doel

Overview secties worden visuele tapbare kaarten (premium iOS-stijl). Header en overflow menu worden logisch en correct. Club admins krijgen een `TeamSwitcher`. Terugnavigatie naar Club Hub wordt duidelijk.

## Principes (consistentie & premium design)

- **Card-based UI**: Alle Overview-secties zijn visuele kaarten, niet rijen met chevrons. Consistent met H2 seizoen-kaarten en F25 Club Hub.
- **Club assets = samenvatting-kaart**: De Assets-sectie op Overview toont een visuele kaart met status + hele kaart tapbaar naar Assets tab. Geen rij-met-chevron.
- **`TeamSwitcher` volgt exact hetzelfde patroon als `SeasonSwitcher`**: zelfde props-API, zelfde dropdown-gedrag.
- **Terugnavigatie**: breadcrumb-link "← Club" in header voor navigatie naar Club Hub (F25).
- **Navigatie vanuit Overview gebruikt altijd de `navigateToTab(tabId)` helper** — nooit hardcoded `?tab=` strings.

## Problemen op te lossen

| ID | Probleem | Fix |
|----|---------|-----|
| 5 | Overview "Assets" sectie alleen status-badges | Rows klikbaar → navigeert naar Assets tab |
| 5 | Overview "Club" sectie verwijst naar `?tab=club` (bestaat niet) | Linkt naar Assets tab (ClubAssetsSection) |
| 6 | Beheer accordion items alle 3 identiek | Specifieke navigatie per item |
| 7 | Overflow "Bewerken" opent seizoen-edit | Opent team-edit |
| 8 | "Activeren" knop verwarrend | Verwijderd (SeasonSwitcher doet het) |
| 9 | Bottom nav "Mijn Club" bij OrgAdmin | Altijd "Mijn Team" |
| nieuw | Club admin heeft geen manier om te wisselen tussen teams | TeamSwitcher in hub header |

## Taken

### 1. Overview "Assets" sectie als visuele kaart (`MyTeamHubPage.tsx`)

Niet rijen met chevrons — een samenvatting-kaart, vergelijkbaar met F25 Club Hub:
- [ ] **Samenvatting-kaart "Team assets"**:
  - Tenue thumbnail (kleine kit-preview afbeelding als beschikbaar)
  - Status rij: "Tenue ✅ · Sponsor ✅ · Ledenfoto's 8/12"
  - Hele kaart tapbaar → `navigateToTab('assets')`
  - Visuele stijl: `var(--app-surface-2)`, `border-radius: var(--radius-md)`
  - Hover: subtle lift — alleen `@media (hover: hover)`
  - Active: `scale(0.98)` tap-feedback

### 2. Overview "Club assets" sectie als visuele kaart

Na F24 is er geen aparte "club" tab. Club assets zitten in de Assets tab (`ClubAssetsSection`):
- [ ] **Samenvatting-kaart "Club assets"**:
  - Club logo thumbnail (kleine cirkel)
  - Status: "Logo ✅ · Sponsor ✅ · Kits X/Y · Locatie ✅"
  - Hele kaart tapbaar → `navigateToTab('assets')`
  - Dezelfde kaart-stijl als "Team assets" kaart
- [ ] Sectie-label: "Club assets" (duidelijk waar het naartoe gaat)

### 3. Beheer accordion specifieke navigatie
- [ ] "Team instellingen" → `navigateToTab('beheer', { section: 'settings' })`
- [ ] "Competities" → `navigateToTab('beheer', { section: 'competitions' })`
- [ ] "Assets uploaden" → `navigateToTab('assets')` (niet Beheer)

### 3b. Terugnavigatie: breadcrumb naar Club Hub
- [ ] **Header breadcrumb**: "← {clubNaam}" link, navigeert naar `routes.clubHub(orgSlug, clubSlug)`
- [ ] Positie: boven de team-naam in de header (klein, `var(--app-muted-text)`)
- [ ] Alleen tonen als we weten dat er een Club Hub is (altijd: elke team heeft een club)
- [ ] Op mobile: compact, enkel "← Club" tekst-link
- [ ] Op desktop: "← {clubNaam}" met volledige naam

### 4. Overflow menu correcties (`MyTeamHubPage.tsx`)
- [ ] **"Bewerken"** → opent team-edit (niet seizoen-edit): check bestaande `TeamEditSheet` component
- [ ] **"Activeren"** → verwijderd (SeasonSwitcher is de primaire interactie)
- [ ] **"Bekijken"** + **"Delen"** → blijven staan

### 5. Header SeasonSwitcher label
- [ ] Label toont: geselecteerd seizoen naam (bijv. "2025-2026")
- [ ] Bij 1 seizoen: static label zonder dropdown
- [ ] Bij 2+ seizoenen: klikbare dropdown via bestaande `SeasonSwitcher`
- [ ] Verwijder aparte "Actief" badge naast de switcher

### 6. `TeamSwitcher` voor club admins (nieuw component)

Club admins moeten snel tussen teams kunnen wisselen zonder de hub te verlaten.

**Component**: `demo/src/components/TeamSwitcher/TeamSwitcher.tsx`

**Patroon**: identiek aan `SeasonSwitcher` — zelfde props-structuur, zelfde dropdown-gedrag:
```ts
interface TeamSwitcherProps {
  teams: Project[];           // gezusterteams (children van zelfde club)
  selectedTeamId: string;
  onTeamSelect: (teamId: string) => void;
}
```

**Data**: `GET /projects/?parent_project_id={clubId}` → lijst van zusterteams

**Gedrag bij selectie**:
1. `setActiveContext('team', newTeamId)` — schrijft active context (localStorage + backend)
2. `navigate(routes.teamHub(orgSlug, clubSlug, newTeamSlug))` — navigeer naar 3-seg URL van het nieuwe team

**Positionering in header**:
- Alleen zichtbaar als `isClubAdmin === true` (role='admin' op club Project)
- Staat naast de `SeasonSwitcher` in de hub header
- Op mobile: compacte versie (team-naam verkorting als > 15 tekens)

**Geen dubbele implementatie**: `TeamSwitcher` en `SeasonSwitcher` delen indien mogelijk een `ContextSwitcher` base component (of volgen exact dezelfde structuur zodat er geen divergentie ontstaat)

### 7. Bottom nav label fix (`MobileBottomNav.tsx`)
- [ ] Altijd label "Mijn Team" — verwijder OrgAdmin-specifieke "Mijn Club" logica
- [ ] Navigatie via `routes.teamHub()` met active context team slug

## Sub-component extractie

| Component | Locatie | Hergebruik |
|-----------|---------|-----------|
| `TeamSwitcher` | `demo/src/components/TeamSwitcher/TeamSwitcher.tsx` | Gebaseerd op `SeasonSwitcher` patroon |
| `navigateToTab()` helper | al aanwezig in `MyTeamHubPage.tsx` | Centraal — niet opnieuw implementeren |

## Verificatie

- [ ] Overview "Assets" rijen: tap → Assets tab
- [ ] Overview "Club assets" rijen: tap → Assets tab (niet `?tab=club`)
- [ ] Beheer accordion: "Assets uploaden" → assets tab; rest → beheer
- [ ] Overflow "Bewerken" → team-edit; "Activeren" niet meer zichtbaar
- [ ] Bottom nav label = "Mijn Team" (ook voor OrgAdmins)
- [ ] `TeamSwitcher` zichtbaar in header voor club admins, verborgen voor anderen
- [ ] TeamSwitcher: selecteer ander team → navigate naar nieuw team hub + active context bijgewerkt
- [ ] TeamSwitcher: `npx tsc --noEmit` clean (geen `any` types)
- [ ] SeasonSwitcher en TeamSwitcher: consistent visueel en gedragsmatig
- [ ] Mobile (375px): TeamSwitcher compact maar klikbaar (min 44px touch target)
