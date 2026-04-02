# H0 — Route + ClubHubPage scaffold

| | |
|---|---|
| Status | TODO |
| Effort | ~3 uur |
| Blokkeerd door | F24 H0 (3-seg URL structuur) |

## Doel

De route `/:org/:club` rendert een volwaardige `ClubHubPage` met tab-structuur. Dit is het fundament voor alle andere fases. De pagina volgt exact hetzelfde patroon als `MyTeamHubPage` uit F24.

## Context

**Bestaande route** (`appRouteGroups.tsx`):
- `/:orgId/:clubId` bestaat al — rendert vermoedelijk `ClubDetailPage` of redirect
- Na H0: rendert direct `ClubHubPage`

**Principes (consistent met MyTeamHubPage):**
- Zelfde tab-structuur (HubLayout, PanelA sidebar, PanelB content)
- Zelfde `navigateToTab(tabId)` helper
- Zelfde CSS Module aanpak + alleen `var(--app-*)` semantische tokens
- Geen SeasonProvider (club heeft geen seizoen als context)

## Taken

### 1. Route wijziging (`appRouteGroups.tsx`)
- [ ] `/:orgId/:clubId` route → rendert `<ClubHubPage />`
- [ ] Geen provider wrapper nodig (geen seizoen-context)
- [ ] Bestaande `ClubDetailPage` wordt legacy redirect of verwijderd

### 2. `ClubHubPage.tsx` scaffold

Locatie: `demo/src/pages/identity/ClubHubPage.tsx`

Tab-definitie (volgt `MyTeamHubPage` patroon exact):
```ts
const TABS: HubTab[] = [
  { id: 'overview', label: 'Overzicht' },
  { id: 'assets',   label: 'Assets' },
  { id: 'leden',    label: 'Leden' },
  { id: 'beheer',   label: 'Beheer' },
];
```

> **4 tabs** — iOS best practice. Teams-overzicht zit in de Overview als visuele kaartengrid.

- [ ] `useParams()` → `{ orgId, clubId }` (geen seizoenId)
- [ ] `useSearchParams()` → `tab` query param voor deeplinking (`?tab=assets`)
- [ ] `navigateToTab(id: string)` helper (zelfde als MyTeamHubPage)
- [ ] Elke tab rendert een placeholder `<div>` (wordt ingevuld in H1-H4)
- [ ] Max 500 regels — split vroeg in sub-componenten vanaf H1

### 3. `ClubHubPage.module.css`
- [ ] Basis layout variabelen (zelfde als MyTeamHubPage.module.css)
- [ ] Geen hardcoded kleuren — alleen `var(--app-*)` tokens

### 4. Header scaffold
- [ ] Club naam + club logo (via `BrandProfile` van de club)
- [ ] Overflow menu: "Bewerken", "Bekijken", "Delen" (nog niet functioneel — H4)
- [ ] **Geen** SeasonSwitcher (club is tijdloos)
- [ ] **Geen** TeamSwitcher in header (navigatie loopt via Teams tab en team hub)

### 5. Route helpers (`routes.ts`)
- [ ] `clubHub(orgSlug: string, clubSlug: string): string` → `/${orgSlug}/${clubSlug}`
- [ ] `clubHubWithTab(orgSlug, clubSlug, tab): string` → `?tab=${tab}`

### 6. Data ophalen
- [ ] `GET /projects/{clubId}/` → club Project object (naam, slug, logo)
- [ ] `GET /brands/?project_id={clubId}` → BrandProfile voor club logo in header

## Verificatie

- [ ] `/:org/:club` → `ClubHubPage` laadt (geen redirect naar team)
- [ ] Tab-navigatie werkt: `?tab=assets`, `?tab=leden`, `?tab=beheer`
- [ ] Header toont club naam + logo (of placeholder als geen logo)
- [ ] Geen SeasonSwitcher in header
- [ ] `npx tsc --noEmit` clean
- [ ] `npx vite build` clean
- [ ] 0 console errors
