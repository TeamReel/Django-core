# H7 — Admin-tabs op mobiel + club-level data + Club-pagina iOS-stijl

> **Effort:** ~5 uur | **Impact:** Alle beheer op mobiel bereikbaar, club-data read-only zichtbaar, Club-pagina krijgt zelfde iOS-look als Team-pagina
>
> **Opbouw:** Deel A (~2 uur): admin-tabs + club overview + dynamic nav label | Deel B (~3 uur): Club-pagina iOS-redesign

## Doel

1. Admin-tabs (Beheer, Club) ook op mobiel tonen — niet meer `desktopOnly`
2. Club-level data **read-only** op Mijn Team: logo status, assets status, brand profiel status
3. Bewerken van club-data blijft op de Club-pagina — "Beheer bij club >" link
4. Club-pagina (`HubClubTab`) krijgt dezelfde iOS-stijl als de team-hub (ListSection, grouped sections)
5. Alle admin Overview-rijen werken correct op alle viewports
6. Bottom navbar label dynamisch: **"Mijn Club"** voor club-admins, **"Mijn Team"** voor team-admins en spelers

## Deel 1: Admin-tabs op mobiel

### Probleem

In `MyTeamHubPage.tsx` zijn de admin-tabs gemarkeerd als `desktopOnly`:
```tsx
...(isAdmin ? [{ id: 'beheer', label: 'Beheer', desktopOnly: true }] : []),
...(isAdmin ? [{ id: 'club', label: 'Club', desktopOnly: true }] : []),
```

In `MobileTabBar.module.css`:
```css
@media (max-width: 767px) {
  .desktopOnly { display: none; }
}
```

Admin Overview-rijen (`onTap={() => navigateToTab('beheer')}`) proberen naar deze tabs te navigeren, maar de tab-knop is onzichtbaar op mobiel. De RBAC-filter in `activeTab` useMemo staat `beheer`/`club` wél toe voor admins, maar de tab-knop is visueel weg.

### Fix

1. **Verwijder `desktopOnly: true`** van Beheer en Club tabs
2. De `MobileTabBar` scrollt al horizontaal bij meer dan 4 tabs
3. De RBAC-filter staat deze tabs al toe voor admins
4. **Scroll-indicator**: gradient-fade aan rechterrand van MobileTabBar als er meer tabs zijn dan het scherm toont — visuele hint dat je kan scrollen

```tsx
// Was:
...(isAdmin ? [{ id: 'beheer', label: 'Beheer', desktopOnly: true }] : []),
...(isAdmin ? [{ id: 'club', label: 'Club', desktopOnly: true }] : []),

// Wordt:
...(isAdmin ? [{ id: 'beheer', label: 'Beheer' }] : []),
...(isAdmin ? [{ id: 'club', label: 'Club' }] : []),
```

### RBAC activeTab filter update

Mobiel-admins moeten ook `beheer` en `club` in de `allowed` set hebben:
```tsx
// Was (impliciet): isMobile filterde beheer/club weg
// Nu: admin = alle 6 tabs, ongeacht viewport
const allowed = isSupporter
  ? new Set(['overview', 'wedstrijden'])
  : isPlayer
    ? new Set(['overview', 'wedstrijden', 'media', 'selectie'])
    : new Set(['overview', 'wedstrijden', 'media', 'selectie', 'beheer', 'club']);
```

(Check of `isMobile` nu nog invloed heeft op de allowed-set — zo ja, verwijderen.)

## Deel 2: Club-level data in Overview (read-only)

### Nieuwe sectie: "Club"

Toevoegen aan de Overview tab, na "Beheer" sectie (admin-only). **Read-only** — toont status, bewerken via Club-tab.

```
+- CLUB ---------------------+    <-- Admin-only, read-only
| [Building2] Clublogo            [status] |
| [Shirt]     Club assets         [status] |
| [Palette]   Brand profiel       [status] |
|                                          |
| [ Beheer bij club               >  ]    |  <-- Navigeert naar Club-tab
+-----------------------------+
```

### Wat elke row doet

| Row | Tap-actie | Data check |
|-----|-----------|------------|
| Clublogo | Geen tap (read-only status) | success als logo aanwezig, warning als niet |
| Club assets | Geen tap (read-only status) | success als alle club assets compleet |
| Brand profiel | Geen tap (read-only status) | success als brand profiel ingesteld |
| Beheer bij club | `navigateToTab('club')` | — |

De rows tonen **alleen status-indicators** (CheckCircle/AlertCircle). Geen chevron, geen onTap. Alleen de "Beheer bij club" knop onderaan navigeert.

### Data: club status checks

Via bestaande `useBrandProfile` of `useTeamDetailData`:
```tsx
const hasClubLogo = Boolean(team.club?.logo_url || team.club?.crest_url);
const clubAssetsComplete = clubAssetStatus === 'complete';
const hasBrandProfile = Boolean(team.brandProfileId);
```

## Deel 3: Club-pagina iOS-stijl redesign

De `HubClubTab` moet dezelfde iOS-look krijgen als de team-hub. Nu is het een functionele maar niet-gestijlde admin-pagina.

### Huidige structuur

HubClubTab heeft nu **4 sub-tabs**: Overview, Teams, Leden, Identity (met daarin Assets, Kits, Brand). Deze sub-tab-structuur **behouden** — het is logisch voor de hoeveelheid content. Wel elke sub-tab restylen met ListSection.

### Gewenste structuur per sub-tab

**Overview sub-tab:**
```
+- CLUB INFO -----------------+
| [Building2] Clubnaam + logo             |
| [Users]     Teams               {count} |
| [Users]     Leden               {count} |
+-----------------------------+

+- SEIZOEN -------------------+
| [Calendar]  Huidig seizoen      {naam}  |
| [Trophy]    Competities         {count} |
+-----------------------------+
```

**Identity sub-tab:**
```
+- IDENTITEIT ----------------+
| [Palette]   Brand profiel       [>]     |
| [Image]     Clublogo wijzigen   [>]     |
+-----------------------------+

+- ASSETS --------------------+
| [Image]     Watermark           [status] [>] |
| [Image]     Sponsor             [status] [>] |
| [Image]     Achtergrond         [status] [>] |
+-----------------------------+

+- TENUES --------------------+
| [Shirt]     Thuis               [status] [>] |
| [Shirt]     Uit                 [status] [>] |
| [Shirt]     Derde               [status] [>] |
| [Shirt]     Keeper              [status] [>] |
+-----------------------------+
```

**Teams sub-tab:** Bestaande `TeamsList` wrappen in ListSection container.

**Leden sub-tab:** Bestaande `UsersList` wrappen in ListSection container.

### Aanpak

- Hergebruik `ListSection` + `ListSection.Row` (al gebouwd in H0)
- Bestaande `HubClubTab` content herstructureren in grouped sections
- Status-indicators per asset (success/warning)
- Tappable rows openen bestaande editors/modals
- Dezelfde design tokens, spacing, en visuele taal als team-hub

## Deel 3: Overview admin-rijen updaten

De huidige admin Overview-rijen navigeren naar beheer/club tabs. Nu die tabs op mobiel zichtbaar zijn, werkt dit correct. Geen extra wijzigingen nodig.

Optioneel: sommige admin-rijen kunnen beter naar sheets navigeren in plaats van tabs (toekomstige uitbreiding).

## Checklist

### Admin-tabs op mobiel
- [x] `desktopOnly: true` verwijderen van Beheer en Club tabs
- [x] RBAC activeTab filter: admin krijgt alle 6 tabs op alle viewports (isMobile conditional verwijderd)
- [x] MobileTabBar horizontale scroll was al geïmplementeerd (showFade gradient)
- [x] Admin Overview-rijen werken op mobiel (RBAC bounce fixed)

### Club data read-only in Overview
- [x] Club sectie toevoegen aan Overview (admin-only, read-only)
- [x] Status-indicators: clublogo, brand profiel, club assets
- [x] "Beheer bij club" knop onderaan sectie → `navigateToTab('club')`
- [x] No onTap op status-only rijen

### Bottom navbar dynamisch label
- [x] `useUserRole()` import in MobileBottomNav
- [x] `isOrgAdmin` → "Mijn Club", anders → "Mijn Team"

### Nog te doen (Deel B — volledig iOS redesign)
- [ ] `HubClubTab` Identity: ListSection grouped rows (Identiteit, Assets, Tenues) — vereist AssetsTab/ClubKitsTab als modal-editors te refactoren
- [x] `HubClubTab` Identity: SegmentedControl i.p.v. custom button-group (iOS-consistent)

### Verificatie
- [x] `npx tsc --noEmit` → zero errors
