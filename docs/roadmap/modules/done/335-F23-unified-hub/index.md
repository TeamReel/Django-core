# 335-F23 — Unified Hub: Eén Hub voor Alle Rollen

| | |
|---|---|
| Code | F23 |
| Status | ✅ DONE |
| Prioriteit | Hoog |
| Geschatte effort | ~40 uur |
| Afhankelijkheden | F22 (done), F21 (done) |
| Doelgroep | Club Admin, Team Admin, Player, Supporter |

---

## 1. Probleemanalyse

### 1.1 De drie overlappende pagina's

Het systeem heeft momenteel drie pagina-lagen die elk een deel van dezelfde data tonen:

| Pagina | Route | Functie | Bron |
|--------|-------|---------|------|
| **ClubDetailPage** | `/:org/:club` (2-segment) | Club beheer: teams, leden, media, identity | `useClubOrgDetailData` |
| **TeamDetailPage** | `/:org/:club/:team` (3-segment) | Team info: seizoenslijst, selectie, beheer | `useTeamDetailData` + `useTeamTabData` |
| **MyTeamHubPage** | `/:org/:club/:team/:season` (4-segment) | Volledig hub: wedstrijden, media, selectie, beheer, club | `useTeamDetailData` + `useSeasonDetailPageData` (via `SeasonProvider`) |

### 1.2 Concrete data per pagina

#### ClubDetailPage — 5 tabs
| Tab | Componenten | Data |
|-----|-------------|------|
| Overview | `ClubOverviewTab` | Teams lijst, seizoenen, leden count, asset stats |
| Teams | `TeamsList` | Alle teams onder deze club |
| Members | `UsersList` | Alle leden van de club |
| Media | `AssetCompletionMatrix` | Asset completion per team |
| Identity | `AssetsTab` + `ClubKitsTab` + `BrandIdentityPage` | Club assets, kits, brand profiel |

#### TeamDetailPage — 5 tabs (3 voor players)
| Tab | Componenten | Data |
|-----|-------------|------|
| Overview | `TeamOverviewTab` | Seizoenen hierarchie, leden preview, brand stats, wedstrijden |
| Wedstrijden | *Leeg placeholder* | "Wanneer er een seizoen wordt gekoppeld…" |
| Media | *Leeg placeholder* | "Wanneer er een seizoen wordt gekoppeld…" |
| Members/Selectie | `TeamSelectieTab` | Team leden (niet seizoen-specifiek) |
| Beheer | `TeamBeheerTab` | Assets, Kits, Credits |

#### MyTeamHubPage — 6 tabs (2-4 voor niet-admins)
| Tab | Componenten | Data |
|-----|-------------|------|
| Overview | Next match hero + Seizoen stats + Assets status + Beheer links + Club status | Gecombineerd team + season |
| Wedstrijden | `HubWedstrijdenTab` | Seizoen wedstrijden met sheets |
| Media | `HubMediaTab` → `SeasonContentTab` | Gegenereerde content per wedstrijd |
| Selectie | `HubSelectieTab` | Seizoen squad met member sheets |
| Beheer | `SeasonCompetitionsTab` + `SeasonAssetsSettingsTab` + `MemberAssetMatrix` + `TeamBeheerTab` | Alles: competities, assets, settings, ledenfoto's, team assets/kits/credits |
| Club | `HubClubTab` → `ClubOverviewTab` + `TeamsList` + `UsersList` + Identity | Volledige club management embedded |

### 1.3 Wat is dubbel?

| Functionaliteit | ClubDetailPage | TeamDetailPage | MyTeamHubPage |
|-----------------|:-:|:-:|:-:|
| Club overview (teams, leden, stats) | ✅ | — | ✅ (Club tab) |
| Teams lijst | ✅ | — | ✅ (Club tab) |
| Club leden lijst | ✅ | — | ✅ (Club tab) |
| Club assets/kits/brand | ✅ | — | ✅ (Club tab) |
| Team selectie/leden | — | ✅ | ✅ |
| Team beheer (assets/kits/credits) | — | ✅ | ✅ (Beheer tab) |
| Seizoen hierarchie | — | ✅ | — |
| Wedstrijden (live data) | — | ❌ (placeholder) | ✅ |
| Content/media (live data) | — | ❌ (placeholder) | ✅ |

**Conclusie:**
- `HubClubTab` hergebruikt dezelfde componenten als `ClubDetailPage` (ClubOverviewTab, TeamsList, UsersList, AssetsTab) maar via een eigen lichtgewicht `useHubClubOverview` hook — geen page-duplicatie, wel component-overlap
- `TeamDetailPage` is grotendeels nutteloos zonder seizoen: wedstrijden/media zijn lege placeholders
- Het enige unieke van TeamDetailPage is de **seizoenen-lijst** (hiërarchie overview)

### 1.4 Huidige rollen en hun behoeften

| Rol | Primaire behoefte | Huidige ervaring |
|-----|-------------------|------------------|
| **Supporter** | Wedstrijden bekijken, scores zien | Hub 4-segment: 2 tabs (Overview, Wedstrijden) — werkt goed |
| **Player** | Selectie, wedstrijden, eigen media | Hub 4-segment: 4 tabs — werkt goed |
| **Team Admin** | Team + seizoen beheren, content genereren | Hub 4-segment: 6 tabs — werkt, maar moet apart naar club |
| **Club Admin** | Alle teams + club-breed beheer | Aparte ClubDetailPage (2-segment) of Hub's Club tab |
| **Org Admin** | Alles + federatie niveau | ClubDetailPage of TeamDetailPage als startpunt |

### 1.5 Kernproblemen

1. **Seizoen-vereiste**: Hub vereist 4-segment URL (met seizoen). Zonder seizoen val je terug op een kale TeamDetailPage met lege placeholders
2. **Drie URL's voor dezelfde hiërarchie**: `/org/club`, `/org/club/team`, `/org/club/team/season` — verwarrend, 3 aparte pagina's te onderhouden
3. **Club admins gedwongen naar apart pad**: Club management zit deels in Hub (Club tab) maar de standalone ClubDetailPage bestaat ook nog
4. **Bottom nav complexiteit**: `MobileBottomNav` moet kiezen: team-pad of season-pad? Race conditions met async `useAppSelection`
5. **Panel B sidebar duplicatie**: Aparte `buildTeamDetailSection`, `buildClubDetailSection`, `buildSeasonSection` — elk met eigen items

---

## 2. Unified Hub Ontwerp

### 2.1 Kernprincipe

> **Eén component, één route-structuur, automatische context-resolutie.**
>
> De hub detecteert welke data beschikbaar is (team, seizoen, club) en past de UI automatisch aan. Geen aparte pagina's meer.

### 2.2 Route-strategie

```
/:org/:club                    → MyTeamHubPage (club-scope)
/:org/:club/:team              → MyTeamHubPage (team-scope, auto-select latest season)
/:org/:club/:team/:season      → MyTeamHubPage (season-scope, volledige ervaring)
```

**Kritische beslissing: auto-select seizoen**

Wanneer de user op `/:org/:club/:team` landt (3-segment, geen seizoen):
1. Fetch het team's seizoenen-lijst (al beschikbaar via `useTeamTabData`)
2. Auto-select het meest recente actieve seizoen
3. **Redirect naar 4-segment URL** (`/:org/:club/:team/:season`)
4. Fallback: als er geen seizoenen zijn, toon een vereenvoudigde hub zonder seizoen-specifieke tabs

```tsx
// Pseudo-code
function MyTeamHubPage() {
  const { seasonId } = useParams();

  if (!seasonId) {
    // 3-segment mode: auto-resolve
    const latestSeason = useLatestSeason(teamId);
    if (latestSeason) {
      return <Navigate to={`${currentPath}/${latestSeason.slug}`} replace />;
    }
    // Geen seizoenen → toon limited hub
    return <HubWithoutSeason />;
  }

  // 4-segment mode: volledige hub
  return <SeasonProvider><FullHub /></SeasonProvider>;
}
```

**Voor 2-segment (club only):**
- Club admin landt op `/:org/:club`
- Auto-detect: heeft deze user een team? → redirect naar team hub
- Club-only admin (geen team membership) → toon club management view

### 2.3 Tab-structuur per scope

#### Season-scope (4-segment) — De "echte" hub

| Tab | Supporter | Player | Team Admin | Club Admin |
|-----|:-:|:-:|:-:|:-:|
| Overview | ✅ | ✅ | ✅ | ✅ |
| Wedstrijden | ✅ | ✅ | ✅ | ✅ |
| Media | — | ✅ | ✅ | ✅ |
| Selectie | — | ✅ | ✅ | ✅ |
| Beheer | — | — | ✅ | ✅ |
| Club | — | — | — | ✅ |

*Dit is identiek aan de huidige MyTeamHubPage — het werkt al.*

#### Team-scope zonder seizoen (3-segment, geen seasons beschikbaar)

| Tab | Alle rollen |
|-----|:-:|
| Overview | ✅ (team info + "maak een seizoen aan" CTA) |
| Selectie | ✅ (team leden, niet seizoen-specifiek) |
| Beheer | ✅ (team assets, kits, credits) |

*Minimale hub — genoeg om het team op te zetten vóór het eerste seizoen.*

#### Club-scope (2-segment, geen team geselecteerd)

| Tab | Club Admin / Org Admin |
|-----|:-:|
| Overview | ✅ (club stats, teams preview) |
| Teams | ✅ (alle teams) |
| Leden | ✅ (alle club leden) |
| Identity | ✅ (assets, kits, brand) |

*Alleen relevant voor club admins die geen specifiek team benaderd hebben.*

### 2.4 Navigatie

#### Bottom Nav
Geen wijziging nodig — `MobileBottomNav` stuurt al naar het juiste pad via `useAppSelection`. Het verschil: de 3-segment URL redirect nu automatisch naar 4-segment, dus de user landt altijd in de volledige hub.

```
Tap "Mijn Team" → useAppSelection geeft seasonPath
  ├── seasonPath beschikbaar → /:org/:club/:team/:season (volledige hub)
  └── geen season → /:org/:club/:team → auto-redirect naar latest season
                                        └── geen seasons → limited hub
```

#### Sidebar (Panel B)
Eén geünificeerde section-builder die de tabs van de hub matcht:

```ts
export function buildHubSection(
  baseUrl: string,
  scope: 'season' | 'team' | 'club',
  role: 'supporter' | 'player' | 'admin' | 'club-admin'
): PanelBResult {
  // Dynamisch items genereren op basis van scope + role
  // Exact dezelfde tabs als de hub toont
}
```

Dit vervangt alle 6 bestaande sidebar builders (`buildTeamDetailSection`, `buildClubDetailSection`, `buildSeasonSection`, `buildSeasonProjectSection`, `buildCompetitionSection`, `buildMemberSection`) met één functie.

#### Back Navigation
- **In 4-segment hub**: geen back button (hub IS de root)
- **In 3-segment hub die redirect**: transparant, user ziet nooit de 3-segment pagina
- **In 2-segment club view**: back naar federatie (ongewijzigd)

### 2.5 Waar komt club management te zitten?

**Status quo behouden: Club tab in de hub** — dit werkt goed in F22.

De standalone `ClubDetailPage` wordt een **redirect**:
```
/:org/:club → user's actieve team (uit member-profiel) → redirect naar /:org/:club/:team/:season
```

Elke user heeft maximaal 1 actief team, gekoppeld aan het member-profiel. Dit is de basis voor de redirect — geen keuzescherm nodig. Fallback als er geen actief team is (club-only admin): toon club management tabs direct op de 2-segment URL.

---

## 3. Rol-matrix

### 3.1 Volledige matrix

| Aspect | Supporter | Player | Team Admin | Club Admin | Org Admin |
|--------|-----------|--------|------------|------------|-----------|
| **Landing URL** | 4-segment | 4-segment | 4-segment | 4-segment (auto) | 4-segment (auto) |
| **Tabs** | Overview, Wedstrijden | + Media, Selectie | + Beheer | + Club | + Club |
| **Overview content** | Next match, seizoen stats | + Content shortcut | + Asset status, beheer links | + Club status | + Club status |
| **Wedstrijden** | Bekijken | Bekijken | + Aanmaken, bewerken | Idem | Idem |
| **Media** | — | Bekijken | + Content genereren | Idem | Idem |
| **Selectie** | — | Bekijken (eigen profiel) | + Leden beheren, toevoegen | Idem | Idem |
| **Beheer** | — | — | Competities, assets, settings, kits, credits | Idem | Idem |
| **Club** | — | — | — | Teams, leden, brand, identity | Idem |
| **Sheets** | Match sheet (read) | + Member sheet (read) | + Member sheet (edit) | Idem | Idem |
| **Seizoen switcher** | ✅ | ✅ | ✅ | ✅ | ✅ |

### 3.2 Acties per rol

| Actie | Supporter | Player | Team Admin | Club Admin |
|-------|:-:|:-:|:-:|:-:|
| Wedstrijden bekijken | ✅ | ✅ | ✅ | ✅ |
| Eigen profiel bewerken | — | ✅ | ✅ | ✅ |
| Leden bekijken | — | ✅ | ✅ | ✅ |
| Content bekijken | — | ✅ | ✅ | ✅ |
| Wedstrijd aanmaken | — | — | ✅ | ✅ |
| Competitie aanmaken | — | — | ✅ | ✅ |
| Leden toevoegen | — | — | ✅ | ✅ |
| Team assets beheren | — | — | ✅ | ✅ |
| Team kits beheren | — | — | ✅ | ✅ |
| Seizoen bewerken | — | — | ✅ | ✅ |
| Content genereren | — | — | ✅ | ✅ |
| Club assets beheren | — | — | — | ✅ |
| Club kits/brand | — | — | — | ✅ |
| Teams beheren | — | — | — | ✅ |
| Club leden beheren | — | — | — | ✅ |

---

## 4. Technische Aanpak

### 4.1 Component-strategie

| Component | Status | Actie |
|-----------|--------|-------|
| `MyTeamHubPage` | Bestaand, goed | **Behoud naam**, breid uit met scope-detectie |
| `HubWedstrijdenTab` | Bestaand | Hergebruik as-is |
| `HubSelectieTab` | Bestaand | Hergebruik as-is |
| `HubMediaTab` | Bestaand | Hergebruik as-is |
| `TeamBeheerTab` | Bestaand (in hub + standalone) | Hergebruik as-is |
| `HubClubTab` | Bestaand | Hergebruik as-is |
| `MemberAssetMatrix` | Bestaand | Hergebruik as-is |
| `SeasonContentTab` | Bestaand | Hergebruik as-is |
| `SeasonCompetitionsTab` | Bestaand | Hergebruik as-is |
| `ClubDetailPage` | Wordt redirect | **Deprecate** — redirect naar hub |
| `TeamDetailPage` | Wordt redirect | **Deprecate** — redirect naar hub |
| `TeamOverviewTab` | Standalone team overview | **Deprecate** — merge in hub overview |
| `ClubOverviewTab` | Gebruikt in HubClubTab | Hergebruik (geen wijziging) |
| **Nieuw: `HubTeamOnlyView`** | — | **Nieuw** — limited hub voor team zonder seizoen |
| ~~`useUnifiedHubData`~~ | — | **Geschrapt** — bestaande hooks direct hergebruiken (zie §6 anti-patterns) |

### 4.2 Seizoen-vereiste oplossen

**Strategie: auto-select + redirect + graceful fallback**

```tsx
// In route config
<Route path="/:orgId/:clubId/:projectId" element={
  <ProtectedRoute>
    <TeamSeasonResolver />   // ← NIEUW: auto-redirect naar latest season
  </ProtectedRoute>
} />

<Route path="/:orgId/:clubId/:projectId/:seasonId" element={
  <ProtectedRoute>
    <SeasonProvider>
      <MyTeamHubPage scope="season" />
    </SeasonProvider>
  </ProtectedRoute>
} />
```

`TeamSeasonResolver` component:
```tsx
function TeamSeasonResolver() {
  const { orgId, clubId, projectId } = useParams();
  const [latestSeason, setLatestSeason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [noSeasons, setNoSeasons] = useState(false);

  useEffect(() => {
    // Fetch team's seasons, pick most recent
    api.get(`/organisations/${orgId}/projects/${projectId}/periods/?type=season&ordering=-start_date&limit=1`)
      .then(data => {
        const season = data.results?.[0];
        if (season) {
          setLatestSeason(periodPathKey(season) || String(season.id));
        } else {
          setNoSeasons(true);
        }
        setLoading(false);
      });
  }, [orgId, projectId]);

  if (loading) return <HubSkeleton />;
  if (latestSeason) return <Navigate to={`/${orgId}/${clubId}/${projectId}/${latestSeason}`} replace />;

  // Geen seizoenen: toon limited hub
  return <MyTeamHubPage scope="team-only" />;
}
```

### 4.3 Data hook strategie

**Huidige hooks en hun verantwoordelijkheden:**

```
useTeamDetailData()          → org, club, team, brandProfileId, navigation
useTeamTabData()             → hierarchy, members, brand, matches (voor TeamDetailPage)
useSeasonDetailPageData()    → season, matches, members, content, competitions, CRUD actions
useSeasonContext()           → SeasonProvider's shared context
```

**Geen combo-hook.** Bestaande hooks direct hergebruiken per scope:

- **Season-scope:** `useTeamDetailData()` + `useSeasonDetailPageData()` (via SeasonProvider) — exact zoals nu
- **Team-only scope:** `useTeamDetailData()` + `useTeamTabData()` — zoals TeamDetailPage nu doet
- **Club-scope:** `useClubOrgDetailData()` of `useHubClubOverview()` — bestaande hooks

> Een "universal data hook" die alles combineert is een anti-pattern (zie §6). De bestaande hooks zijn scope-specifiek en geoptimaliseerd — gewoon hergebruiken.

### 4.4 Route-strategie: redirects

```tsx
// Huidige routes die VERANDEREN:

// 2-segment: club → redirect naar user's team of toon club-scope hub
<Route path="/:orgId/:clubId" element={
  <ProtectedRoute>
    <ClubToHubResolver />          // Redirect of club-scope hub
  </ProtectedRoute>
} />

// 3-segment: team → auto-resolve seizoen
<Route path="/:orgId/:clubId/:projectId" element={
  <ProtectedRoute>
    <TeamSeasonResolver />         // Redirect naar 4-segment
  </ProtectedRoute>
} />

// 4-segment: season → volledige hub (BESTAAND, ongewijzigd)
<Route path="/:orgId/:clubId/:projectId/:seasonId" element={
  <ProtectedRoute>
    <SeasonProvider>
      <MyTeamHubPage />
    </SeasonProvider>
  </ProtectedRoute>
} />
```

### 4.5 Panel B sidebar

Eén builder die de tab-structuur van de hub volgt:

```ts
// Vervangt: buildTeamDetailSection + buildClubDetailSection + buildSeasonSection

export function buildUnifiedHubSection(
  baseUrl: string,
  scope: 'season' | 'team-only' | 'club',
  isPlayer: boolean,
  isSupporter: boolean,
  isClubAdmin: boolean,
): PanelBResult {
  const items = [
    { label: 'Overview', path: makeTabUrl(baseUrl, 'overview'), icon: LayoutDashboard },
  ];

  if (scope === 'season') {
    items.push({ label: 'Wedstrijden', path: makeTabUrl(baseUrl, 'wedstrijden'), icon: Timer });
    if (!isSupporter) {
      items.push({ label: 'Media', path: makeTabUrl(baseUrl, 'media'), icon: Star });
      items.push({ label: 'Selectie', path: makeTabUrl(baseUrl, 'selectie'), icon: Users });
    }
    if (!isPlayer && !isSupporter) {
      items.push({ label: 'Beheer', path: makeTabUrl(baseUrl, 'beheer'), icon: Settings });
    }
    if (isClubAdmin) {
      items.push({ label: 'Club', path: makeTabUrl(baseUrl, 'club'), icon: Shield });
    }
  }
  // ... team-only en club scope

  return { title: 'Hub', items, isActive: true };
}
```

---

## 5. Migratiestrategie

### 5.1 Fasering

| Fase | Wat | Effort | Breaking? |
|------|-----|--------|-----------|
| **H0** — TeamSeasonResolver | 3-segment auto-redirect naar 4-segment + edge cases | ~6u | Nee — backward compatible |
| **H1** — Hub scope-detectie | MyTeamHubPage uitbreiden met scope parameter | ~8u | Nee — nieuwe code naast bestaande |
| **H2** — ClubDetailPage → redirect | 2-segment stuurt door naar hub (via actief team) | ~6u | Ja — maar redirect vangt op |
| **H3** — Sidebar unificatie | Eén `buildUnifiedHubSection` ipv 6 aparte builders | ~4u | Nee |
| **H4** — Team-only hub (geen seizoen) | `HubTeamOnlyView` voor teams zonder seizoenen | ~6u | Nee |
| **H5** — Cleanup & deprecated code | Verwijder standalone ClubDetailPage, TeamDetailPage, oude hooks | ~6u | Nee (code al niet meer bereikbaar) |
| **H6** — Polish & edge cases | Deep links, bookmark compatibility, loading states | ~4u | Nee |

### 5.2 Backward compatibility

**Fase H0-H1: Volledig backward compatible**
- Bestaande routes blijven werken
- Nieuwe code is additive — geen bestaande flows raken kapot
- `TeamDetailPage` en `ClubDetailPage` bestaan nog

**Fase H2: Redirects vangen alles op**
- `/:org/:club` → redirect naar `/:org/:club/:team/:season` (via actief team) of club-scope hub
- `/:org/:club/:team` → redirect naar `/:org/:club/:team/:season` (al afgehandeld door H0)
- Bookmarks, externe links, deeplinks: allemaal werken via `<Navigate replace />`

**Fase H5: Cleanup**
- Pas na verificatie dat alle flows via redirects werken
- Feature-flagged: oude code is nog aanwezig maar unreachable
- Definitieve verwijdering in een aparte commit

### 5.3 Risico-mitigatie

| Risico | Mitigatie |
|--------|----------|
| Redirect loops | Unit tests voor elke redirect-combinatie |
| Verlies van ClubDetailPage unieke features | Audit dat alles in HubClubTab zit vóór H2 |
| SeasonProvider crash zonder seizoen | Scope-check: alleen wrappen als seasonId beschikbaar |
| Panel B routing mismatch | H4 loopt na H1-H3 zodat de hub al stabiel is |
| Breaking bookmarks | `<Navigate replace />` redirects + monitoring vóór cleanup |

---

## 6. Wat NIET te doen

### Anti-patterns vermijden

1. **❌ Een nieuw mega-component bouwen**: Hergebruik `MyTeamHubPage` als basis, breid uit — niet opnieuw beginnen
2. **❌ Alle drie pagina's tegelijk refactoren**: Incrementele migratie, één pagina per fase
3. **❌ Server-side redirects**: Dit is een SPA — alle redirects zijn client-side `<Navigate replace />`
4. **❌ Conditionele hooks**: React regels respecteren — altijd alle hooks aanroepen, `enabled` flags gebruiken
5. **❌ Nieuwe data hooks schrijven die bestaande dupliceren**: Hergebruik `useTeamDetailData` + `useSeasonDetailPageData`
6. **❌ Bottom nav aanpassen in deze feature**: Bottom nav werkt al via `useAppSelection` — die route-resolutie is voldoende
7. **❌ De SeasonProvider uitbreiden om zonder seizoen te werken**: `SeasonProvider` is specifiek voor seizoen-context. Zonder seizoen gebruik je `useTeamDetailData` direct
8. **❌ Alle Panel B sidebar items redesignen**: Alleen de builder-functie consolideren, niet de hele sidebar
9. **❌ URL-structuur wijzigen**: `/:org/:club/:team/:season` blijft de canonical URL. Geen nieuwe URL-patronen introduceren

### Over-engineering risico's

- **"Universal data hook"** die team + club + season + alles fetcht → te complex, te veel conditionele paden. Beter: scope-specifieke hooks die al bestaan.
- **"Smart tab system"** dat automatisch tabs toevoegt/verwijdert → de huidige `isSupporter ? ... : isPlayer ? ...` conditionals zijn simpel en duidelijk genoeg.
- **"Role-based layout engine"** → YAGNI. De RBAC is al opgelost met simpele conditionals.

---

## 7. 80/20 Analyse

### Grootste UX-winst, minste complexiteit

| Wijziging | UX impact | Effort | Prioriteit |
|-----------|-----------|--------|------------|
| **Auto-redirect 3→4 segment** | ⭐⭐⭐⭐⭐ Geen dode TeamDetailPage meer | ~4u | #1 |
| **Club redirect → team hub** | ⭐⭐⭐⭐ Club admins landen direct in de hub | ~6u | #2 |
| **Team-only hub (geen seizoen)** | ⭐⭐⭐ Nieuwe teams direct bruikbaar | ~6u | #3 |
| **Sidebar unificatie** | ⭐⭐ Minder code, consistentere nav | ~4u | #4 |
| **Cleanup oude pagina's** | ⭐ Minder onderhoud | ~6u | #5 |

### Aanbeveling

**Start met H0 (auto-redirect) + H2 (club redirect).** Dit elimineert 90% van de "welke pagina moet ik naar toe?" verwarring. De rest is incrementeel.

---

## Acceptatiecriteria

- [ ] `/:org/:club/:team` redirect automatisch naar `/:org/:club/:team/:latest-season`
- [ ] `/:org/:club` redirect naar de hub van de user's primaire team (of toon club-scope hub)
- [ ] Alle bestaande bookmarks en deeplinks blijven werken via redirects
- [ ] Geen breaking changes in bottom nav of Panel B navigatie
- [ ] ClubDetailPage en TeamDetailPage zijn deprecated (code aanwezig, maar onbereikbaar)
- [ ] RBAC-matrix werkt correct per rol (supporter, player, team admin, club admin)
- [ ] Team zonder seizoenen toont bruikbare limited hub
- [ ] Geen dubbele API calls door gestapelde providers
- [ ] E2E tests dekken alle redirect-paden
- [ ] Lighthouse performance: geen regressie op hub load time
