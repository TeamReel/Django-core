# Roadmap #26 — My Team Hub (Pagina-consolidatie)

> **Status:** 🚧 In uitvoering
> **Start:** 18 maart 2026
> **Scope:** `demo/src/pages/identity/`, `demo/src/pages/periods/`, `demo/src/components/MobileBottomNav.tsx`

## Doel

Eén geconsolideerde "My Team Hub" pagina die de huidige Team page (3 tabs) en Season page (7 tabs) combineert tot één adaptieve landing voor de "My Team" bottom-nav knop. Gebruikers hoeven niet meer te kiezen tussen team-context en seizoen-context — ze krijgen alles op één plek met rol-gebaseerde tab-zichtbaarheid.

## Huidige staat

### Wat werkt ✅
- **Team page** (`/:org/:club/:team`) — 3 tabs: Overview, Selectie, Beheer
  - Overview: HeroCard (leden, seizoenen, content, assets%), BrandAssetsCard, MediaAssetsCard, SeasonsCard, MatchesCard, MembersCard, TeamDetailsCard
  - Selectie: Squad lijst met edit-modus (all/own/none per rol)
  - Beheer: Assets, competities, seizoen-instellingen, transactions (admin-only)
- **Season page** (`/:org/:club/:team/:season`) — 7 tabs (RBAC-gated):
  - Overview (all), Media (not supporter), Content (not supporter), Matches (all), Selectie (not supporter), Competities (not player/supporter), Assets (not player/supporter)
  - Supporter ziet 2 tabs, Speler 5 tabs, Admin 7 tabs
- **MobileBottomNav** — "My Team" knop navigeert naar Season page (via `seasonPath`)
- **RBAC** — 6 tiers via `useUserRole()`: Super Admin, Land Admin, Club Admin, Team Admin, Player, Supporter

### Wat ontbreekt / niet klopt ❌
- "My Team" navigeert naar Season page, niet naar Team page → verwarrend mentaal model
- Team page en Season page hebben **overlappende content**: beiden tonen overview, leden, matches
- Gebruiker moet tussen 2+ pagina's navigeren om volledige team-context te zien
- Season page kent 7 tabs → te veel op mobile (vereist horizontaal scrollen)
- Team page is na Roadmap #25 (3 tabs) te kaal — mist seizoen-specifieke content
- Geen seizoen-switcher: je moet "terug" navigeren om seizoen te wisselen

## Design beslissingen

| Vraag | Besluit |
|-------|--------|
| Eén pagina of twee? | **Eén pagina** — "My Team Hub" vervangt beide. Team + actief seizoen als gecombineerde context. |
| Hoeveel tabs max? | **5 tabs max** — mobiel vriendelijk, no horizontal scroll. Per rol: Supporter 2, Speler 4, Admin 5. |
| Hoe seizoen wisselen? | **Season-switcher pill/dropdown** in de page header. Wisselen herlaadt seizoen-specifieke data zonder navigatie. |
| Wat met team-level info? | **Merged in Overview tab** — team info (hero, brand) + seizoen dashboard (upcoming matches, asset completion, competitions) in één scroll view. |
| Wat met de huidige Team page URL? | **Redirect** `/:org/:club/:team` → Hub (zelfde pagina, toont overview). `/:org/:club/:team/:season` → Hub met die season actief. |
| Wat met Beheer/Assets/Competities? | **Gecombineerd in "Beheer" tab** — admin-only, bevat team assets + seizoen settings + competitie management + transactions. |
| Content + Media merge? | **Ja** → "Media" tab combineert seizoen content (generaties) + media (foto/video per slot). |
| Back navigation? | Hub → Club page, net als nu. Deeplinks naar match/competition werken nog via bestaande routes. |
| Wat met de bottom nav? | **"My Team" → Hub pagina**. Label blijft "My Team", icon optioneel wijzigen naar `Shield`/`Users`. |

## Tab-structuur per rol

| Tab | Supporter | Speler | Admin | Inhoud |
|-----|-----------|--------|-------|--------|
| **Overview** | ✅ | ✅ | ✅ | HeroCard (team + seizoen stats), season-switcher, upcoming matches, asset completion, brand preview, competitions overzicht |
| **Wedstrijden** | ✅ | ✅ | ✅ | Alle wedstrijden van actief seizoen, per competitie gegroepeerd, match CRUD (admin) |
| **Media** | — | ✅ | ✅ | Content generaties + media slots per lid (seizoen-scoped) |
| **Selectie** | — | ✅ | ✅ | Squad leden (seizoen-squad + team-roster), edit eigen profiel (speler) of alle leden (admin) |
| **Beheer** | — | — | ✅ | Team settings, brand assets, competitie management, seizoen settings, transactions |

## Fasering

### H0 — Data-laag & Season-switcher
> **Effort:** 2–3 dagen | **Impact:** Fundament voor de hele Hub; data beschikbaar

**To do:**
- [ ] Nieuwe hook `useMyTeamHubData` die team-data + actief-seizoen-data combineert (merge `useTeamDetailData` + `useSeasonDetailPageData`)
- [ ] Season-switcher state: `activeSeasonId` als URL-param (`?season=<slug>`) of via context
- [ ] Season-switcher data: fetch lijst van team-seizoenen voor dropdown
- [ ] Type definitie `MyTeamHubData` met alle velden die de tabs nodig hebben
- [ ] RBAC: hergebruik `useUserRole()` voor tab-gating

**Done criteria:**
- [ ] `useMyTeamHubData` retourneert gecombineerde team + seizoen data
- [ ] Season-switcher kan van seizoen wisselen zonder page refresh
- [ ] RBAC gating werkt correct: supporter/player/admin krijgen juiste tabs
- [ ] TypeScript compileert zonder errors

### H1 — Hub pagina shell & Overview tab
> **Effort:** 2–3 dagen | **Impact:** Eerste werkende versie van de Hub

**To do:**
- [ ] `MyTeamHubPage.tsx` — nieuwe pagina component met header + season-switcher + tab bar
- [ ] `SeasonSwitcher.tsx` — dropdown/pill component om seizoen te wisselen
- [ ] `MyTeamHubPage.module.css` — styling op design tokens
- [ ] **Overview tab** — merge `TeamOverviewTab` + `SeasonOverviewTab`:
  - HeroCard: team naam, club, leden-count, seizoen naam, asset %
  - Upcoming matches (volgende 3)
  - Recent results (laatste 2)
  - Asset completion per media slot
  - Competities overzicht (collapsed)
  - Brand assets preview (logo, sponsor)
- [ ] Route registratie: `/:org/:club/:team` → `MyTeamHubPage`
- [ ] MobileTabBar met rol-based tabs (2/4/5)

**Done criteria:**
- [ ] Hub pagina rendert met Overview tab voor alle 3 rollen
- [ ] Season-switcher zichtbaar en functioneel
- [ ] HeroCard toont gecombineerde team + seizoen stats
- [ ] Mobile layout werkt correct (375px)
- [ ] Geen TypeScript errors

### H2 — Wedstrijden & Media tabs
> **Effort:** 2–3 dagen | **Impact:** Seizoen-content beschikbaar op de Hub

**To do:**
- [ ] **Wedstrijden tab** — hergebruik/refactor `SeasonMatchesTab`:
  - Matches per competitie gegroepeerd
  - Match create/edit modals (admin)
  - Score invoer, status badges
- [ ] **Media tab** — hergebruik/refactor `SeasonContentTab` + `SeasonMediaTab`:
  - Content generaties lijst
  - Media slot status per lid
  - Generatie wizard trigger
- [ ] Tab data lazy-loading: alleen fetchen wanneer tab actief wordt
- [ ] Season-scoped: data wisselt mee bij season-switch

**Done criteria:**
- [ ] Wedstrijden tab toont matches van actief seizoen
- [ ] Media tab toont content + media per slot
- [ ] Tabs laden lazy (geen onnodige API calls)
- [ ] Match CRUD modals werken voor admin
- [ ] Supporter ziet deze tabs **niet**

### H3 — Selectie & Beheer tabs
> **Effort:** 2–3 dagen | **Impact:** Alle rollen volledig bediend

**To do:**
- [ ] **Selectie tab** — merge `TeamSelectieTab` + `SeasonSquadTab`:
  - Seizoen-squad weergave (wie zit in het seizoen)
  - Member detail / edit (admin: alle, speler: eigen)
  - Batch acties (admin): toevoegen, verwijderen, rol wijzigen
  - Filtering / zoeken
- [ ] **Beheer tab** (admin only) — merge `TeamBeheerTab` + `SeasonAssetsSettingsTab` + `SeasonCompetitionsTab`:
  - Team settings (naam, beschrijving, brand profile)
  - Brand assets management
  - Competitie CRUD
  - Seizoen settings (start/end date, type)
  - Transactions / credits
- [ ] RBAC enforcement: Beheer tab alleen voor admin, Selectie niet voor supporter

**Done criteria:**
- [ ] Selectie tab toont seizoen-squad met edit-modus per rol
- [ ] Beheer tab toont alle admin-functies
- [ ] Player kan eigen profiel bewerken in Selectie
- [ ] Supporter kan Selectie en Beheer niet zien
- [ ] Alle modals (member add, competition create, etc.) werken

### H4 — Routing, redirects & navigatie
> **Effort:** 1–2 dagen | **Impact:** Oude URLs werken nog, navigatie klopt

**To do:**
- [ ] **Route consolidatie:**
  - `/:org/:club/:team` → `MyTeamHubPage` (default season = actief seizoen)
  - `/:org/:club/:team/:season` → `MyTeamHubPage` met die season geselecteerd
  - Bewaar deeplinks voor match/competition: `/:org/:club/:team/:season/:competition/:match` → werkt nog
- [ ] **MobileBottomNav update:**
  - "My Team" navigeert naar Hub (`teamPath` ipv `seasonPath`)
  - Verwijder `activeSeasonSlug` logic uit nav (Hub handelt dit intern af)
  - `isActive` check: `currentPath.startsWith(teamPath)`
- [ ] **Sidebar / desktop nav** update indien nodig
- [ ] **Back navigation:** Hub → Club page
- [ ] Redirect oude `/team/:season` bookmark URLs naar Hub met season param
- [ ] Tab aliasing: oude `?tab=content` → `?tab=media`, `?tab=competitions` → `?tab=beheer`, etc.

**Done criteria:**
- [ ] Alle bestaande URLs werken (redirects of native)
- [ ] MobileBottomNav "My Team" gaat naar Hub
- [ ] Deeplinks naar match/competition werken
- [ ] Browser back/forward navigatie werkt correct
- [ ] Geen 404s op oude bookmarks

### H5 — Cleanup, a11y & polish
> **Effort:** 1–2 dagen | **Impact:** Productie-klaar

**To do:**
- [ ] **Verwijder** of deprecate oude pagina's:
  - `TeamOrganisationDetailPage.tsx` → verwijder (vervangen door Hub)
  - `ProjectSeasonDetailPage.tsx` → verwijder (vervangen door Hub)
  - Gerelateerde hooks: `useTeamDetailData`, `useSeasonDetailPageData` → consolideer of verwijder
  - CSS modules: verwijder ongebruikte
- [ ] **Accessibility audit:**
  - Season-switcher: keyboard navigeerbaar, aria-labels
  - Tab bar: `role="tablist"`, aria-selected
  - Focus management bij tab-switch en season-switch
  - Screen reader: seizoen-context wordt aangekondigd
- [ ] **Performance:**
  - Lazy load tab content (React.lazy of conditional render)
  - Prefetch season data bij hover op season-switcher
  - Bundle impact check: verwijderde pagina's verkleinen bundle
- [ ] **E2E tests:**
  - Hub laadt correct per rol (supporter, speler, admin)
  - Season-switcher wisselt data
  - Tab navigatie werkt
  - Redirects van oude URLs
- [ ] **Build verificatie:** `npx tsc --noEmit` + `npx vite build`

**Done criteria:**
- [ ] Oude pagina's verwijderd, geen dead imports
- [ ] Alle interactive elementen keyboard-navigeerbaar
- [ ] Focus-visible op alle controls
- [ ] Bundle size niet groter dan voor de refactor
- [ ] E2E tests passeren
- [ ] Build passes clean

## Acceptatiecriteria (geheel)

- [ ] Eén "My Team Hub" pagina vervangt Team page + Season page
- [ ] "My Team" bottom nav gaat naar Hub
- [ ] Season-switcher laat gebruiker van seizoen wisselen zonder navigatie
- [ ] Supporter ziet 2 tabs (Overview, Wedstrijden)
- [ ] Speler ziet 4 tabs (Overview, Wedstrijden, Media, Selectie)
- [ ] Admin ziet 5 tabs (Overview, Wedstrijden, Media, Selectie, Beheer)
- [ ] Alle bestaande URLs werken via redirects
- [ ] Match/competition deeplinks werken nog
- [ ] Geen nieuwe `any` types
- [ ] Build passes (`npx tsc --noEmit` + `npx vite build`)
- [ ] Alle interactive elementen accessible (keyboard + screen reader)
- [ ] Mobile layout werkt op 375px+
