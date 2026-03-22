# H4 — Overview & header verbeteringen

| | |
|---|---|
| Status | TODO |
| Effort | ~5 uur |
| Blokkeerd door | H2, H3 |

## Doel

Overview secties worden klikbaar. Header en overflow menu worden logisch en correct. Club admins kunnen via een `TeamSwitcher` direct wisselen tussen teams van dezelfde club. Alle broken interactions worden gefixed.

## Principes (consistentie & geen dubbele code)

- **Club assets verschijnen op één plek**: de Assets tab (`ClubAssetsSection`). De Overview toont alleen een samenvatting-rij en linkt daarnaar. Geen tweede weergave van club assets.
- **`TeamSwitcher` volgt exact hetzelfde patroon als `SeasonSwitcher`**: zelfde props-API, zelfde dropdown-gedrag, zelfde active context write. Geen aparte implementatie.
- **Navigatie vanuit Overview gebruikt altijd de `navigateToTab(tabId)` helper** — nooit hardcoded `?tab=` strings verspreid door de component.

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

### 1. Overview "Assets" sectie klikbaar (`MyTeamHubPage.tsx`)
- [ ] Rij "Tenue": `onTap` → `navigateToTab('assets')`
- [ ] Rij "Sponsor": `onTap` → `navigateToTab('assets')`
- [ ] Rij "Ledenfoto's": `onTap` → `navigateToTab('assets')`
- [ ] Rij "Club logo": `onTap` → `navigateToTab('assets')` (scrollt naar `ClubAssetsSection`)
- [ ] Chevron icoon (`>`) zichtbaar op elke rij

### 2. Overview "Club" sectie — linkt naar Assets tab (niet `?tab=club`)

Na F24 is er geen aparte "club" tab. Club assets zitten in de Assets tab (`ClubAssetsSection`). De Overview-rijen moeten daarnaar linken:
- [ ] Rij "Club logo": `onTap` → `navigateToTab('assets')` (niet `?tab=club`)
- [ ] Rij "Brand profiel": `onTap` → `navigateToTab('assets')`
- [ ] Rij "Club assets": `onTap` → `navigateToTab('assets')`
- [ ] Chevron icoon op elke rij
- [ ] Sectie-label: "Club" → hernoem naar "Club assets" (duidelijker waar het naartoe gaat)

### 3. Beheer accordion specifieke navigatie
- [ ] "Team instellingen" → `navigateToTab('beheer', { section: 'settings' })`
- [ ] "Competities" → `navigateToTab('beheer', { section: 'competitions' })`
- [ ] "Assets uploaden" → `navigateToTab('assets')` (niet Beheer)

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
