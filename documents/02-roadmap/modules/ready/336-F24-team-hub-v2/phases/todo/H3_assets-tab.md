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

### 6. Sub-component extractie (500-lijn grens)

`MyTeamHubPage.tsx` mag max 500 regels zijn (frontend instructions). De Assets tab-content extracten:

| Nieuw bestand | Inhoud |
|--------------|--------|
| `AssetsTabContent.tsx` | Root component voor de Assets tab |
| `TeamAssetsSection.tsx` | Tenue + sponsor + team foto |
| `ClubAssetsSection.tsx` | Inherited club assets (read-only) |

Maximale bestandsgrootte: 150 regels per CSS module, 500 regels per TSX.

### 7. Styling (`MyTeamHubPage.module.css` + eigen CSS modules)
- [ ] Sectie headers: `var(--app-muted-text)` — semantisch token
- [ ] **Inherited badge: `var(--app-surface-2)` achtergrond** (NIET `var(--color-neutral-200)`)
- [ ] Preview thumbnails: vaste aspect ratio via `aspect-ratio` CSS property (voorkomt layout reflow bij laden)
- [ ] Lege staat per sectie: `EmptyState` component of eigen layout — NIET alleen tekst
- [ ] Club assets sectie: `opacity: 0.7` voor non-admins (gedimpt, niet disabled)
- [ ] Alle kleur-tokens: **uitsluitend `var(--app-*)` semantic tokens**, nooit `var(--color-*)`
- [ ] Dark mode: test via `data-theme="dark"` attribuut op root

### 8. Image loading states
- [ ] Asset thumbnails (kit foto's, sponsor logo, team foto): skeleton placeholder terwijl afbeelding laadt
  ```tsx
  <div className={styles.assetThumb}>
    {isLoading ? <div className={styles.thumbSkeleton} /> : <img src={url} alt={label} />}
  </div>
  ```
- [ ] `aspect-ratio: 3/2` voor kit thumbnails, `aspect-ratio: 1` voor logootjes (voorkomt CLS)
- [ ] Fallback bij mislukte afbeelding: placeholder icoon + "Foto ontbreekt" tekst
- [ ] Skeleton animatie: `@media (prefers-reduced-motion: reduce)` → statische placeholder

### 9. Upload UX (admin)
- [ ] Upload knop: `min-height: 44px; min-width: 44px` (touch target)
- [ ] Upload progress: lineaire progress bar onder de thumbnail
- [ ] Succesmelding: `Toast` component bij succesvolle upload (niet page-refresh)
- [ ] Foutmelding: inline error under de upload knop (niet alert())

## Verificatie

- [ ] Tab label "Assets" zichtbaar (niet "Media")
- [ ] `?tab=media` → redirect naar `?tab=assets` (backward compat)
- [ ] Tenue sectie: alle 4 kit types zichtbaar met aspect-ratio placeholders
- [ ] Afbeelding skeleton: zichtbaar tijdens laden, verdwijnt na load (of fallback bij fout)
- [ ] Sponsor: inherited badge met `var(--app-surface-2)` (niet primitive token)
- [ ] Club assets sectie: read-only voor team admins, gedimpt (niet disabled)
- [ ] Dark theme: inherited badge, sectie headers, skeleton correct
- [ ] Ledenfoto's matrix: alle leden met upload-status
- [ ] Upload: progress bar + toast bij succes + inline error bij fout
- [ ] Content pipeline zichtbaar in Beheer tab (niet meer in Assets)
- [ ] `AssetsTabContent.tsx` als apart bestand (< 500 regels)
- [ ] Mobile (375px): scroll werkt, geen overflow
- [ ] `npx tsc --noEmit` clean
- [ ] `npx vite build` clean
