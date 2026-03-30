# 336-F24 — Team Hub V2: Seizoen-loze URL + Assets + Overzichtsverbetering

| | |
|---|---|
| Code | F24 |
| Status | ✅ DONE |
| Prioriteit | Hoog |
| Geschatte effort | ~30 uur |
| Afhankelijkheden | F23 (done — commit `f0381784`) |
| Maakt mogelijk | F25 Club Hub (backlog `337-F25-club-hub`) — hergebruikt `ClubAssetsSection`, `TeamSwitcher` |
| Doelgroep | Club Admin, Team Admin, Player, Supporter |

---

## 1. Probleemanalyse

### 1.1 Huidige situatie na F23

F23 leverde een unified hub op `/:org/:club/:team/:season` (4-segment URL). Dit werkt, maar heeft structurele problemen:

| # | Probleem | Impact |
|---|---------|--------|
| 1 | **URL bevat seizoen** — `/helden-6/2025-2026` als team-pagina | `:season` impliceert dat dit een seizoen-pagina is, maar het is een **team**-pagina. Teams hebben meerdere seizoenen. |
| 2 | **Geen seizoen/competitie-overzicht** — Alleen data van 1 geselecteerd seizoen zichtbaar | Gebruiker kan niet zien welke seizoenen/competities een team heeft |
| 3 | **Media tab niet nuttig** — Bevat alleen content pipeline, geen visuele assets | Assets (sponsor, tenue, locatie, logo) zijn veel relevanter voor een team-hub |
| 4 | **Assets niet beheerbaar vanuit overview** — Sponsor, tenue, logo verstopt in Beheer | Admins moeten naar Beheer navigeren voor basale asset-acties |
| 5 | **Overview secties niet klikbaar** — Assets/Club tonen alleen status-badges | Geen navigatie-opties vanuit de overview |
| 6 | **Beheer accordion items identiek** — Navigeren alle 3 naar dezelfde tab | Geen onderscheid tussen team instellingen, competities, assets uploaden |
| 7 | **Overflow "Bewerken" opent seizoen-edit** — Niet team-edit | Verwarrend op een team-pagina |
| 8 | **"Activeren" knop verwarrend** — Activeert seizoen-context op team-pagina | Niet logisch op een permanente team-pagina |
| 9 | **Bottom nav label inconsistent** — OrgAdmin ziet "Mijn Club" maar navigeert naar team | Onverwachte landing |
| 10 | **Active context niet benut** — Hub gebruikt niet de actieve seizoen/competitie van de user | Navigatie-keuzes missen context; user moet steeds opnieuw seizoen kiezen |

### 1.2 Huidige route-structuur (na F23)

| Route | Component | Functie |
|-------|-----------|---------|
| `/:org/:club/:team` | `TeamDetailPage` | Auto-redirect naar 4-seg met meest recente seizoen |
| `/:org/:club/:team/:season` | `SeasonDetailPage → SeasonProvider → MyTeamHubPage` | De feitelijke team-hub |
| `/:org/:club/:team/:season/members/:memberId` | `MemberDetailPage` | Lid-detail |
| `/:org/:club/:team/:season/:competition/:match` | `MatchDetailPage` | Wedstrijd-detail |

**Probleem:** De hub is seizoen-afhankelijk in de URL, terwijl het conceptueel een team-pagina is.

### 1.3 Active Context systeem

TeamReel heeft een robuust active context systeem dat nog niet benut wordt in de hub:

| Aspect | Detail |
|--------|--------|
| **Backend model** | `UserActiveContext` — `user`, `organisation`, `club`, `team`, `season`, `competition`, `match` |
| **API** | `GET/PATCH /auth/active-context/` met `{ kind, id }` |
| **Frontend** | `getActiveContext()`, `setActiveContext(kind, id)` in `utils/activeContext.ts` |
| **Storage** | localStorage (`APP_LAST_CTX_KEY`) + backend DB |
| **Events** | `ACTIVE_CONTEXT_CHANGED_EVENT` voor reactieve UI-updates |
| **Gedrag** | Setting seizoen auto-set org+club+team; setting team cleared seizoen+competitie |

De hub moet dit systeem gebruiken om het initieel geselecteerde seizoen te bepalen en bij seizoen-switches bij te werken.

### 1.4 Gewenste situatie

| Aspect | Nu (F23) | Straks (F24) |
|--------|----------|-------------|
| URL | `/:org/:club/:team/:season` | `/:org/:club/:team` |
| Seizoen-selectie | URL-navigatie (navigate()) | SeasonSwitcher header + active context |
| Initieel seizoen | Meest recent (altijd) | Active context seizoen → fallback meest recent |
| Seizoen-overzicht | Niet aanwezig | Accordion op Overview |
| Competitie-overzicht | Niet aanwezig | Accordion op Overview |
| Media tab | Content pipeline | Vervangen door Assets tab |
| Assets | Alleen in Beheer | Eigen tab + preview op Overview |
| Content pipeline | In Media tab | Verplaatst naar Beheer tab |
| Overview secties | Status-badges | Klikbaar → navigeert naar juiste tab |
| Bottom nav label | "Mijn Club" bij OrgAdmin | Altijd "Mijn Team" |

---

### 1.5 Domeinmodel

De hub toont en beheert data op meerdere niveaus van de hiërarchie:

```
Organisation
└── Project (club, parent_project=None)
    ├── BrandProfile → BrandAsset (club-eigenaar: logo, sponsor, kits, locatie, achtergrond)
    ├── ProjectMembership (club membership; period=null)
    └── Project (team, parent_project=club)
        ├── BrandProfile → BrandAsset (team overrides: sponsor, kits)
        ├── ProjectCreditsBalance           ← credits per team (AI-generaties)
        ├── ProjectMembership               ← teamlidmaatschap (period=null of period=seizoen)
        │   └── metadata.teamreel_assets   ← lid-foto's en -video's (NIET BrandAsset)
        └── Period (seizoen, parent_period=None)
            ├── ContentItem (template_type='season')   ← transformation, season_recap
            ├── ProjectMembership (period=seizoen)     ← seizoenslidmaatschap
            └── Period (competitie, parent_period=seizoen)
                └── Activity (type='match')
                    └── ContentItem (template_type='pre_match'/'post_match')
                                                        ← lineup, end_score, highlights
```

**Asset-eigenaarschap per niveau (BrandAsset):**

| Asset type | Club | Team |
|---|---|---|
| `logo` | ✅ Eigenaar | ❌ Erft van club (geen eigen logo) |
| `sponsor_logo` | ✅ Eigenaar | ✅ Kan overschrijven |
| `kit_home` / `kit_away` / `kit_third` / `kit_goalkeeper` | ✅ Eigenaar | ✅ Kan overschrijven |
| `kit_coach` / `kit_assistant` / `kit_training` / `kit_legacy` | ✅ Eigenaar | ✅ Kan overschrijven |
| `location_photo` | ✅ Eigenaar | ❌ Erft van club |
| `club_background` | ✅ Eigenaar | ❌ Erft van club |

*Inheritance via `getEffectiveAsset(type)`: checkt eerst team BrandProfile, dan club BrandProfile.*

**Member assets (niet BrandAsset — aparte opslag):**

Lid-foto's en -video's leven in `ProjectMembership.metadata.teamreel_assets`:

| Sleutel | Inhoud |
|---------|--------|
| `images.{kit_type}.fullbody` | Gegenereerd fullbody-foto in tenue |
| `images.{kit_type}.halfbody` | Auto-gecropte versie (55% hoogte) |
| `images.{kit_type}.closeup` | Auto-gecropte versie (28% — hoofd + schouders) |
| `images.{kit_type}.action_photo` | Actie-foto |
| `media.profile` | Profielfoto URL |
| `media.intro` | Introvideo |
| `media.celebration` | Doelpunt-viering video |

API: `PATCH /api/v1/projects/{project_pk}/members/{pk}/` (ProjectMembershipViewSet)

**Credits per team:**

`ProjectCreditsBalance` — één record per project (team). API: `GET /api/v1/credits/projects/{teamId}/`

**Content types:**

| Niveau | TemplateType | Subtypes |
|--------|-------------|---------|
| Seizoen | `season` | `transformation` (then vs now), `season_recap` |
| Pre-wedstrijd | `pre_match` | `lineup`, `lineup_flyer`, `flyer`, `walkon`, `anthem` |
| Post-wedstrijd | `post_match` | `end_score`, `match_summary`, `highlights` |
| Per lid | `member` | `profile_photo`, `member_in_tenue`, `member_intro` |

**RBAC op Assets tab:**

| Rol | Vastgesteld via | Bevoegdheid |
|-----|----------------|-------------|
| Club admin | `role='admin'` op club Project | Alle club BrandAssets bewerken |
| Team admin | `role='admin'` op team Project | Team BrandAsset overrides bewerken (sponsor, kits) |
| Speler / Viewer | Overig membership | Read-only assets; eigen lid-metadata bewerken |

---

## 2. Design beslissingen

| Beslissing | Keuze | Reden |
|-----------|-------|-------|
| Seizoen in URL? | Nee — seizoen als interne state, optioneel `?season=X` voor deep-linking | Team is de primaire entiteit; seizoen is filter/context |
| Seizoen persistentie | Active context API (backend) + localStorage | Consistent met bestaand `APP_LAST_CTX_KEY` patroon |
| Media tab? | Weg — vervangen door Assets | Content pipeline → Beheer; visuele assets zijn nuttiger |
| Content pipeline | Naar Beheer tab als sub-sectie | Admin-only functionaliteit past bij Beheer |
| Competitie detail | Sheet/bottom sheet op hub | Consistent met match/member sheets, minder navigatie |
| Legacy 4-seg URLs | Redirect naar 3-seg (met `?season=X` hint) | Bookmark/share compatibiliteit |
| Backend wijzigingen | Geen — alleen frontend | Alle benodigde data al beschikbaar via bestaande API |
| Design-stijl | iOS-premium: cards, hero, visuele hiërarchie | Consistent met homepage/dashboard; geen Android-settings rij-menu's |

### Design-principes (premium)

De Team Hub moet aanvoelen als een **premium iOS-app** — vergelijkbaar met de homepage en het dashboard. Concreet:

| Principe | Betekent | Niet |
|----------|----------|------|
| **Card-based UI** | Secties als visuele kaarten met afgeronde hoeken, subtiele schaduw | Geen platte rij-lijsten met chevrons |
| **Visuele hiërarchie** | Hero/banner bovenaan → content cards → samenvattingen | Geen gelijk-gewogen accordions |
| **Direct tapable** | Hele kaart is een tap-target, press-feedback (`scale(0.98)`) | Geen "Ga naar →" linkjes in rij |
| **Content-first** | Thumbnails, kleuren, iconen — laat de data zien | Geen tekst-only status badges |
| **Consistentie** | Zelfde card-styling als Club Hub, dashboard, match wizard | Geen eigen visuele taal per pagina |

---

## 3. Fasering

| Fase | Naam | Effort | Blokkeerd door | Prioriteit |
|------|------|--------|---------------|-----------|
| H0 | URL-herstructurering: 3-segment hub | ~8 uur | — | Kritiek (fundament) |
| H1 | Active context integratie | ~4 uur | H0 | Hoog |
| H2 | Seizoen & competitie overzicht | ~5 uur | H1 | Hoog |
| H3 | Assets tab (vervangt Media) | ~6 uur | H0 | Hoog |
| H4 | Overview & header verbeteringen | ~4 uur | H2, H3 | Medium |
| H5 | Polish & cleanup (a11y, E2E, docs) | ~3 uur | H4 | Medium |
| **Totaal** | | **~30 uur** | | |

H3 kan parallel lopen met H1-H2 (geen onderlinge afhankelijkheid na H0).

---

## 4. Acceptatiecriteria

### Must have
- [ ] Hub draait op `/:org/:club/:team` — geen seizoen in URL
- [ ] Active context bepaalt initieel geselecteerd seizoen (fallback: meest recent)
- [ ] SeasonSwitcher wisselt seizoen zonder URL-navigatie
- [ ] Legacy 4-seg URLs redirecten naar 3-seg met `?season=X` hint
- [ ] Seizoenen-accordion op Overview: alle seizoenen van het team
- [ ] Competities-accordion op Overview: competities van actief seizoen
- [ ] Assets tab vervangt Media: tenue, sponsor, logo, locatie, ledenfoto's
- [ ] Content pipeline verplaatst naar Beheer tab
- [ ] 0 TypeScript fouten, 0 console errors
- [ ] Mobile responsive (375px–1280px)
- [ ] Light + dark theme
- [ ] **Alleen semantische tokens** (`var(--app-*)`) — geen primitive `var(--color-*)` tokens
- [ ] **Sub-component extractie**: `MyTeamHubPage.tsx` max 500 regels (split in `SeasonAccordion`, `CompetitionAccordion`, `AssetsTabContent`)
- [ ] **Loading states**: skeleton screens bij initieel laden, loading indicator bij seizoen-switch
- [ ] **Race conditions**: geen stale data bij snelle seizoen-switch (`AbortController` of debounce)
- [ ] **Image loading**: aspect-ratio containers voor thumbnails, skeleton/fallback bij laden/fout

### Should have
- [ ] Bottom nav "Mijn Team" gebruikt active context voor navigatie
- [ ] Overflow "Bewerken" opent team-edit (niet seizoen-edit)
- [ ] Overview secties klikbaar naar juiste tab
- [ ] Beheer accordion items navigeren naar specifieke secties
- [ ] Optimistic UI bij seizoen-switch (rij gemarkeerd vóór data laadt)
- [ ] Toast notification bij upload succes/fout
- [ ] `HubTeamOnlyView` fallback werkt correct na URL-herstructurering

### Could have
- [ ] CompetitionSummarySheet — competitie detail als sheet
- [ ] Deep-link `?season=X` query param support
- [ ] Drag & drop voor asset uploads

---

## 5. Technische context

### Bestaande componenten (hergebruik)

| Component | Pad | Wat het doet |
|-----------|-----|-------------|
| `AssetsTabTeamLevel` | `demo/src/components/AssetsTab/AssetsTabTeamLevel.tsx` | Asset management met inheritance badges |
| `KitsTab` | `demo/src/components/KitsTab/KitsTab.tsx` | Kit (tenue) upload component |
| `IdentityTab` | `demo/src/components/IdentityTab/IdentityTab.tsx` | Logo/sponsor/locatie per level |
| `SeasonSwitcher` | `demo/src/components/SeasonSwitcher.tsx` | Seizoen dropdown (al werkend) |
| `useHierarchyData` | `demo/src/pages/identity/useHierarchyData.ts` | Haalt alle seizoenen + competities per team |
| `useTeamTabData` | `demo/src/pages/identity/useTeamTabData.ts` | Team-level data orchestrator |
| `HubTeamOnlyView` | `demo/src/pages/identity/HubTeamOnlyView.tsx` | No-season fallback (referentie patterns) |
| `setActiveContext` | `demo/src/utils/activeContext.ts` | Active context schrijven |
| `getActiveContext` | `demo/src/utils/activeContext.ts` | Active context lezen |

### Te wijzigen bestanden

| Bestand | Wijziging |
|---------|----------|
| `demo/src/appRouteGroups.tsx` | 3-seg route → hub direct (geen redirect) |
| `demo/src/pages/identity/TeamDetailPage.tsx` | Omgebouwd tot legacy redirect |
| `demo/src/pages/identity/SeasonDetailPage.tsx` | Legacy redirect → 3-seg |
| `demo/src/pages/identity/MyTeamHubPage.tsx` | Kern: tabs, overview accordions, seizoen state |
| `demo/src/pages/identity/MyTeamHubPage.module.css` | Nieuwe componenten styling |
| `demo/src/providers/SeasonProvider.tsx` | Auto-resolve seizoen zonder URL param |
| `demo/src/providers/useSeasonData.ts` | Optionele seasonId parameter |
| `demo/src/components/MobileBottomNav.tsx` | Active context navigatie + label |
| `demo/src/routes.ts` | Route helpers: `teamHub()`, `teamHubWithTab()` |

### Data model (geen backend wijzigingen nodig)

```
UserActiveContext:
  user → User
  team → Project (team_type='team')          ← geeft initieel seizoen hint
  season → Period (parent_period=null)       ← wordt geselecteerd in hub
  competition → Period (parent_period=season)

Period (seizoen):
  id, project (team), name, start_date, end_date
  parent_period = null  → root seizoen

Period (competitie):
  id, project, name, period_type
  parent_period → seizoen
```

### API endpoints (bestaand, geen wijzigingen)

| Endpoint | Gebruik |
|---------|---------|
| `GET /auth/active-context/` | Lees huidig actief seizoen |
| `PATCH /auth/active-context/` `{ kind: 'season', id }` | Schrijf seizoen-selectie |
| `GET /periods/?project_id={teamId}&parent_id=null` | Alle seizoenen van team |
| `GET /periods/?parent_id={seasonId}` | Competities van seizoen |

---

## 6. Gerelateerde modules

| Module | Relatie |
|--------|---------|
| F23 (335, done) | Fundament — unified hub, routing basis, SeasonProvider |
| B64 (315, done) | Realtime updates — active context event system |
| B46 (313, done) | Soft delete — trash pattern voor season/competition delete |
