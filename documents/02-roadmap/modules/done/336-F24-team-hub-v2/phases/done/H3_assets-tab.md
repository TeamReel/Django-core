# H3 — Assets tab (vervangt Media)

| | |
|---|---|
| Status | TODO |
| Effort | ~6 uur |
| Blokkeerd door | H0 |

## Doel

De "Media" tab wordt vervangen door een "Assets" tab met visuele/brand assets, member-foto's en credits. De content pipeline verhuist naar de Beheer tab. Kan parallel lopen met H1-H2.

## Context

**Data model (uit index.md §1.5):**

- **Club BrandProfile** → eigenaar van `logo`, `sponsor_logo`, alle kits, `location_photo`, `club_background`
- **Team BrandProfile** → kan `sponsor_logo` en alle kits OVERSCHRIJVEN (geen eigen logo)
- Inheritance via `getEffectiveAsset(type)`: zoekt eerst team-profiel, dan club-profiel
- **Member assets** leven in `ProjectMembership.metadata.teamreel_assets` — NIET in BrandAsset
- **Credits**: `ProjectCreditsBalance` per team — API: `GET /api/v1/credits/projects/{teamId}/`

**Bestaande componenten om te hergebruiken:**
- `KitsTab` — tenue upload + preview; ondersteunt 8 kit types: `home`, `away`, `third`, `goalkeeper`, `coach`, `assistant`, `training`, `legacy`
- `IdentityTab` — logo/sponsor/locatie per level
- `AssetsTabTeamLevel` — asset management met inheritance badges; gebruikt `getEffectiveAsset()`

**RBAC (vastgesteld via bestaande permissie-hooks):**
- Club admin (`role='admin'` op club Project) → volledige toegang: club assets + team overrides + alle member foto's uploaden
- Team admin (`role='admin'` op team Project) → team-overrides (sponsor, kits) + alle member foto's uploaden
- Speler/viewer → read-only op alles; kan alleen eigen `ProjectMembership.metadata` bewerken

## Taken

### 1. Tab hernoemen + definitie (`MyTeamHubPage.tsx`)
- [ ] Tab definitie: `id: 'media'` → `id: 'assets'`, `label: 'Media'` → `label: 'Assets'`
- [ ] Alias map: `'media': 'assets'` voor backward compat (`?tab=media` → assets tab)
- [ ] RBAC: Assets tab zichtbaar voor alle rollen (Player, Admin, Supporter)
- [ ] Sidebar PanelB + MobileTabBar: tab naam "Assets"

### 2. Club assets sectie (heeft eigen BrandProfile)
- [ ] Sectie header: "Club assets" met uitleg "Gedeeld door alle teams van de club"
- [ ] **Logo** (`logo`): preview + upload knop (club admin), read-only balk (team admin)
- [ ] **Sponsor** (`sponsor_logo`): preview + upload knop (club admin), met badge "Club-sponsor" als team geen override heeft
- [ ] **Kits** (4 primaire: `kit_home`, `kit_away`, `kit_third`, `kit_goalkeeper`):
  - Preview thumbnail per kit type met label (Thuis / Uit / 3e / Keeper)
  - Upload knop (club admin)
  - "Club" badge op elk item
- [ ] **Overige kits** (`kit_coach`, `kit_assistant`, `kit_training`, `kit_legacy`):
  - Alleen tonen als de club er minimaal 1 heeft (anders sectie verbergen — geen lege placeholders)
  - Weergegeven als compacte rij (minder prominent dan primaire kits)
- [ ] **Locatie** (`location_photo`): foto preview + locatienaam; upload knop (club admin)
- [ ] Gedrag per rol:
  - Club admin → volledige bewerkbaarheid: upload knoppen actief op alle club assets, in-place opslaan
  - Team admin → read-only; `opacity: 0.7`; geen upload knoppen zichtbaar
  - Speler / viewer → read-only; `opacity: 0.7`

### 3. Team overrides sectie (team BrandProfile)
- [ ] Sectie header: "Team instellingen" met uitleg "Teamspecifieke overrides van de club"
- [ ] **Sponsor override** (`sponsor_logo` op team BrandProfile):
  - Als team heeft eigen sponsor: preview + "Team-sponsor" badge + verwijder-optie (team admin)
  - Als niet: "Erft club-sponsor" placeholder + "Eigen sponsor instellen" knop (team admin)
- [ ] **Kit overrides** (primaire 4: `kit_home`, `kit_away`, `kit_third`, `kit_goalkeeper`):
  - Per kit: toon of het een club-kit (inherited) of team-kit (override) is
  - "Override" badge als team eigen kit heeft
  - Upload knop (team admin) + verwijder override knop als override actief
  - Toont `getEffectiveAsset(kit_type)` → inherited of override preview
- [ ] Gedrag per rol:
  - Team admin of club admin → upload knoppen actief
  - Speler / viewer → read-only

### 4. Member foto-sectie (ProjectMembership.metadata)
- [ ] Sectie header: "Ledenfoto's" met teller "X van Y leden hebben een foto"
- [ ] Per lid een rij: naam, thumbnail (`metadata.teamreel_assets.media.profile`), upload-status badge
- [ ] Upload wordt gedaan via `PATCH /api/v1/projects/{project_pk}/members/{pk}/` — NIET via BrandAsset
- [ ] Admin: upload knop per lid (roept ProjectMembership API aan)
- [ ] Speler: kan alleen eigen rij bewerken
- [ ] Lege staat: "Nog geen ledenfoto's" met CTA (upload eerste foto)
- [ ] Koppeling met `fullbody`/`halfbody`/`closeup` types: maak dit inzichtelijk (bijv. welke kit-type voor-ingesteld is)

### 5. Content pipeline verplaatsen naar Beheer tab
- [ ] `SeasonContentTab` component verwijderen uit Media/Assets tab
- [ ] Toevoegen als accordion-sectie in Beheer tab:
  - Sectie header: "Content & Video"
  - De bestaande `SeasonContentTab` inhoud behouden
- [ ] Beheer accordion volgorde:
  1. Team instellingen
  2. Competities beheren
  3. Content & Video (content pipeline — was Media)
  4. Credits (saldo + verbruiksoverzicht — `GET /api/v1/credits/projects/{teamId}/`)
  5. Ledenfoto's uploaden (detail-beheer, los van de Assets tab sectie)

### 7. Sub-component extractie (500-lijn grens)

`MyTeamHubPage.tsx` mag max 500 regels zijn (frontend instructions). De Assets tab-content extracten:

| Nieuw bestand | Inhoud | Max regels |
|--------------|--------|-----------|
| `AssetsTabContent.tsx` | Root component Assets tab — rendert secties | 150 |
| `ClubAssetsSection.tsx` | Club BrandProfile assets (logo, sponsor, kits, locatie) | 200 |
| `TeamAssetsSection.tsx` | Team overrides (sponsor, kit overrides) | 150 |
| `MemberPhotosSection.tsx` | Ledenfoto's rij (ProjectMembership.metadata) | 150 |

### 8. Styling (`AssetsTabContent.module.css` + eigen CSS modules)
- [ ] Sectie headers: `var(--app-muted-text)` — semantisch token
- [ ] Inherited badge: `var(--app-surface-2)` achtergrond (NIET `var(--color-neutral-200)`)
- [ ] Override badge: `var(--app-primary)` tint (NIET `var(--color-primary-100)`)
- [ ] Read-only secties (club assets voor team admin): `opacity: 0.7` — NIET `pointer-events: none`
- [ ] Preview thumbnails: `aspect-ratio: 3/2` voor kit-fotos, `aspect-ratio: 1` voor logo's
- [ ] Lege staat: consistent met bestaande `EmptyState` ui-primitive of eigen layout — NIET alleen tekst
- [ ] Dark mode: alle tokens correct via `data-theme="dark"` attribuut op root
- [ ] Alle kleur-tokens: uitsluitend `var(--app-*)` — nooit `var(--color-*)`

### 9. Image loading states
- [ ] Asset thumbnails: skeleton placeholder terwijl afbeelding laadt
  ```tsx
  <div className={styles.assetThumb}>
    {isLoading ? <div className={styles.thumbSkeleton} /> : <img src={url} alt={label} />}
  </div>
  ```
- [ ] `aspect-ratio` op alle thumbnail containers (voorkomt CLS bij laden)
- [ ] Fallback bij mislukte afbeelding: placeholder icoon + "Foto ontbreekt" tekst
- [ ] Skeleton animatie: `@media (prefers-reduced-motion: reduce)` → statische placeholder

### 10. Upload UX (admin)
- [ ] Upload knop: `min-height: 44px; min-width: 44px` (touch target)
- [ ] Upload progress: lineaire progress bar onder de thumbnail
- [ ] Succesbericht: `Toast` component bij succesvolle upload (geen page-refresh)
- [ ] Foutmelding: inline error onder de upload knop (geen `alert()`)

## Verificatie

- [ ] Tab label "Assets" zichtbaar (niet "Media")
- [ ] `?tab=media` → redirect naar `?tab=assets` (backward compat)
- [ ] **Club assets sectie**: logo, sponsor, 4 primaire kits, locatie zichtbaar
- [ ] Club admin → upload knoppen actief op club assets; in-place opslaan
- [ ] Team admin → club assets read-only + gedimpt; team overrides bewerkbaar
- [ ] **Team overrides sectie**: sponsor override + kit overrides met inherited/override state
- [ ] `getEffectiveAsset()` inheritance correct: team override verbergt club-asset niet maar toont override badge
- [ ] **Ledenfoto's sectie**: alle leden met profiel-thumbnail, teller klopt
- [ ] Member foto upload via ProjectMembership API (niet BrandAsset API)
- [ ] **Credits**: NIET op Assets tab — staat in Beheer tab (sectie 4)
- [ ] Thumbnail skeletons: zichtbaar tijdens laden, verdwijnen na load (of fallback bij fout)
- [ ] Inherited badge: `var(--app-surface-2)` (geen primitive token)
- [ ] Override badge: `var(--app-primary)` (geen primitive token)
- [ ] Dark theme: alle secties correct
- [ ] Content pipeline: NIET meer in Assets tab — wel in Beheer tab
- [ ] `AssetsTabContent.tsx` als apart bestand (< 150 regels)
- [ ] Mobile (375px): scroll werkt, geen overflow, touch targets ≥ 44px
- [ ] `npx tsc --noEmit` clean
- [ ] `npx vite build` clean
