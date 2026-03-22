# H3 — Assets tab (vervangt Media)

| | |
|---|---|
| Status | TODO |
| Effort | ~6 uur |
| Blokkeerd door | H0 |

## Doel

De "Media" tab wordt vervangen door een "Assets" tab met visuele/brand assets. De content pipeline verhuist naar de Beheer tab. Kan parallel lopen met H1-H2.

## Context

**Bestaande componenten om te hergebruiken:**
- `KitsTab` — tenue (thuis/uit/3e/keeper) upload + preview
- `IdentityTab` — logo/sponsor/locatie per level
- `AssetsTabTeamLevel` — volledige asset management met inheritance badges
- `MemberAssetMatrix` (in Beheer tab) — ledenfoto's upload status matrix

**Asset inheritance model:**
```
Club → Team → Seizoen
getEffectiveAsset() → pakt dichtstbijzijnde niveau dat asset heeft
```

**BrandAsset types:** `logo`, `sponsor_logo`, `kit_home`, `kit_away`, `kit_third`, `kit_goalkeeper`, `location_photo`, `stadium_background`, `team_photo`

## Taken

### 1. Tab hernoemen + tab definitie (`MyTeamHubPage.tsx`)
- [ ] Tab definitie: `id: 'media'` → `id: 'assets'`, `label: 'Media'` → `label: 'Assets'`
- [ ] Alias map: voeg `'media': 'assets'` toe voor backward compat (`?tab=media` → assets tab)
- [ ] RBAC: Assets tab zichtbaar voor Player + Admin (niet Supporter only)
- [ ] Sidebar PanelB: update tab naam "Assets"
- [ ] MobileTabBar: tab naam "Assets"

### 2. Assets tab inhoud — team assets sectie
- [ ] **Tenue** sectie met `KitsTab` component:
  - Thuis, uit, 3e, keeper tenue
  - Upload + preview per kit type
  - Edit voor admins, view-only voor players
- [ ] **Sponsor** sectie:
  - Sponsor logo preview + upload knop (admin)
  - Inherited van club → toon badge "Van club" + optie om te overschrijven
- [ ] **Team foto** sectie:
  - Huidige team foto preview
  - Upload knop (admin)

### 3. Assets tab inhoud — club assets sectie (inherited)
- [ ] Sectie header: "Van de club" met info-tooltip uitleg
- [ ] **Club logo** — preview (read-only voor niet-club-admins)
- [ ] **Locatie** — locatie naam + locatie foto preview
- [ ] Inherited badge op elk item: "Van [Clubnaam]"
- [ ] Club admins: edit knop zichtbaar → navigeert naar club profiel

### 4. Assets tab inhoud — ledenfoto's sectie
- [ ] **Ledenfoto's** sectie met status matrix:
  - Per lid: naam, foto preview of placeholder, upload status
  - Upload knop per lid (admin)
  - Volledige matrix: hergebruik `MemberAssetMatrix` component
- [ ] Teller: "X van Y leden hebben een foto"

### 5. Content pipeline verplaatsen naar Beheer tab
- [ ] `SeasonContentTab` component verwijderen uit Media/Assets tab
- [ ] Toevoegen als accordion-sectie in Beheer tab:
  - Sectie header: "Content & Video"
  - De bestaande `SeasonContentTab` inhoud behouden
- [ ] Beheer accordion volgorde:
  1. Team instellingen
  2. Competities beheren
  3. Content & Video (content pipeline — was Media)
  4. Ledenfoto's uploaden

### 6. Styling (`MyTeamHubPage.module.css`)
- [ ] Sectie headers in assets tab (tenue / sponsor / club assets / ledenfoto's)
- [ ] Inherited badge: `var(--color-neutral-200)` achtergrond, klein label
- [ ] Preview thumbnails: vaste aspect ratios per asset type
- [ ] Lege staten per sectie met upload CTA
- [ ] Club assets sectie: visueel anders (grijs/gedimdt voor non-admins)

## Verificatie

- [ ] Tab label zichtbaar als "Assets" (niet "Media")
- [ ] `?tab=media` → redirect naar `?tab=assets` (backward compat)
- [ ] Tenue sectie: alle 4 kit types zichtbaar
- [ ] Sponsor: inherited badge zichtbaar als van club
- [ ] Club assets sectie: logo + locatie read-only voor team admins
- [ ] Ledenfoto's matrix: toont alle leden
- [ ] Content pipeline zichtbaar in Beheer tab (niet meer in Assets)
- [ ] Mobile (375px): scroll werkt, geen overflow
- [ ] `npx tsc --noEmit` clean
- [ ] `npx vite build` clean
