# Season Hub Refactor Plan

**Status:** Planning
**Date:** 2025-02-28
**Branch:** TBD (`season-hub-refactor`)
**Purpose:** Refactor 4 monoliet-pagina's (~13.000 regels) naar kleinere componenten + gedeelde SeasonProvider

---

## 1. Probleem

| Issue | Impact |
|-------|--------|
| 4 aparte pagina's laden org/club/season data elk opnieuw | Traag, verspillend |
| MemberDetail is gehacked in CompetitionDetailPage via UUID detectie (regel 912) | Fragiel, verwarrend |
| ~12.948 regels over 4 pagina's met significante duplicatie | Moeilijk te onderhouden |
| Monoliet-bestanden (4914, 2400, 2227, 4409 regels) | Code review onmogelijk, bugs moeilijk te vinden |
| Gedupliceerde state logic (fetching, modals, brand profiles) | Inconsistent gedrag tussen pagina's |

### Huidige situatie

```
Pagina                              Regels  Tabs (admin)
─────────────────────────────────────────────────────────
ProjectSeasonDetailPage.tsx          4914   11 tabs (overview, content, hierarchy, competitions,
                                            matches, squad, team, media, transactions, assets, workflow)
ProjectCompetitionDetailPage.tsx     2400    4 tabs (overview, hierarchy, matches, content)
                                            + UUID hack → rendert MemberDetailPage
MatchDetailPage.tsx                  2227    4 tabs (overview, content, lineup, transactions)
ProjectSeasonMemberDetailPage.tsx    4409   10 tabs (overview, input, assets, intro, celebration,
                                            then_vs_now, photo_composite, walking_composite,
                                            action_photo, identity)
─────────────────────────────────────────────────────────
TOTAAL                              ~13.000
```

### Routes (BEHOUDEN — geen wijziging)

```
# Team-vanity routes (ONGEWIJZIGD)
/:org/:club/:team/:season                               → SeasonDetailPage
/:org/:club/:team/:season/:competitionId                 → CompetitionDetailPage
                                                           (of MemberDetail als UUID)
/:org/:club/:team/:season/:competitionId/:matchId        → MatchDetailPage

# Org routes (ONGEWIJZIGD)
/organisations/:orgId/:clubId/:projectId/:seasonId       → SeasonDetailPage
/organisations/:orgId/:clubId/:projectId/:seasonId/:cId  → CompetitionDetailPage
/organisations/:orgId/:clubId/:projectId/:seasonId/:cId/:mId → MatchDetailPage

# Org member route (ONGEWIJZIGD)
/organisations/:id/members/:memberId                     → MemberDetailPage (identity)
```

---

## 2. Aanpak: Component Extractie + Shared SeasonProvider

### Principe

**Routes blijven ongewijzigd.** We refactoren van binnen naar buiten:

1. **SeasonProvider** — React Context die gedeelde data (org, club, season, brand profiles, feature flags) eenmalig fetcht en deelt met alle seizoen-gerelateerde pagina's
2. **Component extractie** — Elke `{activeTab === 'xxx' && (...)}` blok in de monoliet-pagina's wordt een apart bestand
3. **Shared hooks** — Dubbele logica (brand profiles, member fetching, video jobs) wordt geconsolideerd in herbruikbare hooks

### Waarom geen route-wijziging?

- **Content generatie** leeft op twee niveaus: seizoen-level (batch, then-vs-now) en match-level (flyer, lineup, goal). Elk niveau heeft eigen modals.
- **Media completion matrix** — de squad tab toont een matrix met deep-links naar member detail tabs. Deze werkt goed met de huidige route structuur.
- **CompetitionDetailPage** fungeert als filter-context voor matches EN als UUID-router voor members. Dit is lelijk maar functioneel — opschonen is beter dan vervangen.
- Routes wijzigen = alle navigatie-links, bookmarks, en deep-links breken. Dat risico is hier niet nodig.

### Visueel (wat verandert)

```
VOOR (nu):                              NA (refactor):
┌──────────────────────┐                ┌──────────────────────┐
│ SeasonDetailPage.tsx │                │ SeasonDetailPage.tsx │
│ 4914 regels          │                │ ~200 regels (shell)  │
│                      │                │                      │
│ ┌──────────────────┐ │                │ <SeasonProvider>     │
│ │ org/club/season  │ │                │   <PageHeader />     │
│ │ fetching (300+)  │ │                │   <MobileTabBar />   │
│ │ brand profiles   │ │                │   {tab === 'overview' && <OverviewTab />}
│ │ feature flags    │ │                │   {tab === 'squad' && <SquadTab />}
│ │ members fetching │ │                │   {tab === 'matches' && <MatchesTab />}
│ │ video jobs       │ │                │   ...etc              │
│ │ competitions     │ │                │   <Modals />         │
│ │ tab logic 4500+  │ │                │ </SeasonProvider>    │
│ └──────────────────┘ │                └──────────────────────┘
└──────────────────────┘
                                        ┌──────────────────────┐
                                        │ MatchDetailPage.tsx  │
                                        │ ~200 regels (shell)  │
                                        │                      │
                                        │ <SeasonProvider>     │
                                        │   (hergebruikt cache)│
                                        │   <MatchOverviewTab/>│
                                        │   <MatchContentTab/> │
                                        │   ...                │
                                        │ </SeasonProvider>    │
                                        └──────────────────────┘
```

### SeasonProvider — shared context

```tsx
// demo/src/providers/SeasonProvider.tsx
interface SeasonContextValue {
  // Core entities (fetched once, cached)
  org: Organisation | null;
  club: Project | null;
  project: Project | null;
  season: Period | null;

  // Lazy-loaded data
  competitions: Period[];
  members: Participation[];

  // Brand profiles
  clubBrand: BrandProfile | null;
  teamBrand: BrandProfile | null;

  // Feature flags
  featureFlags: Record<string, boolean>;

  // Role info
  isPlayer: boolean;
  isTeamRoute: boolean;
  userCanEditProject: boolean;

  // Loading state
  loading: boolean;
  error: string | null;

  // Refresh helpers
  reloadMembers: () => void;
  reloadCompetitions: () => void;
  reloadAll: () => void;
}

// Key design: caches data by seasonId. Als je van SeasonPage naar
// MatchDetail navigeert, wordt org/club/season NIET opnieuw gefetcht.
function SeasonProvider({ children }: { children: React.ReactNode }) {
  const { orgId, clubId, projectId, seasonId } = useParams();
  // ... fetch once, memoize, share to children
  return (
    <SeasonContext.Provider value={contextValue}>
      {children}
    </SeasonContext.Provider>
  );
}

// Hook for child components
function useSeasonContext() {
  const ctx = useContext(SeasonContext);
  if (!ctx) throw new Error('useSeasonContext must be used within SeasonProvider');
  return ctx;
}
```

---

## 3. Bestandsstructuur (nieuw)

```
demo/src/
├── providers/
│   └── SeasonProvider.tsx                (~400 regels)
│       Gedeelde data fetching + caching voor org/club/season/brand/flags
│
├── pages/periods/
│   ├── ProjectSeasonDetailPage.tsx       (~200 regels, shell: SeasonProvider + tabs + modals)
│   ├── ProjectCompetitionDetailPage.tsx  (~200 regels, shell: refactored, cleaner UUID check)
│   ├── ProjectSeasonMemberDetailPage.tsx (~200 regels, shell: SeasonProvider + member tabs + modals)
│   │
│   ├── season-tabs/                      ← NIEUW: extracted tab components
│   │   ├── index.ts
│   │   ├── OverviewTab.tsx              (~400 regels)
│   │   ├── CompetitionsTab.tsx          (~300 regels, hierarchy + competition lijst)
│   │   ├── MatchesTab.tsx               (~400 regels, matches lijst + competition filter)
│   │   ├── SquadTab.tsx                 (~500 regels, incl. media completion matrix)
│   │   ├── TeamTab.tsx                  (~300 regels, team-only members)
│   │   ├── ContentTab.tsx               (~400 regels, season-level content + batch generatie)
│   │   ├── MediaTab.tsx                 (~350 regels)
│   │   ├── AssetsTab.tsx                (~200 regels)
│   │   ├── TransactionsTab.tsx          (~150 regels)
│   │   └── WorkflowTab.tsx             (~150 regels)
│   │
│   └── member-tabs/                      ← NIEUW: extracted member tab components
│       ├── index.ts
│       ├── MemberOverviewTab.tsx        (~300 regels)
│       ├── MemberInputTab.tsx           (~250 regels)
│       ├── MemberAssetsTab.tsx          (~300 regels)
│       ├── MemberIntroTab.tsx           (~350 regels)
│       ├── MemberCelebrationTab.tsx     (~350 regels)
│       ├── MemberThenVsNowTab.tsx       (~300 regels)
│       ├── MemberPhotoCompositeTab.tsx  (~350 regels)
│       ├── MemberWalkingCompositeTab.tsx (~300 regels)
│       ├── MemberActionPhotoTab.tsx     (~300 regels)
│       └── MemberIdentityTab.tsx        (~200 regels)
│
├── pages/activities/
│   ├── MatchDetailPage.tsx              (~200 regels, shell: SeasonProvider + match tabs + modals)
│   └── match-detail/                    (BESTAAND — ongewijzigd ✅)
│       ├── MatchOverviewTab.tsx         (342 regels)
│       ├── MatchContentTab.tsx          (532 regels)
│       ├── MatchLineupTab.tsx           (552 regels)
│       └── MatchTransactionsTab.tsx     (34 regels)
```

### Content generatie per niveau

| Niveau | Wat | Modal | Waar in de app |
|--------|-----|-------|----------------|
| **Season** | Batch member assets, Then vs Now video's, seizoens-content | `BatchGenerationModal`, `AssetGenerationModal`, `ContentGenerationModal` | `ContentTab` in SeasonDetailPage |
| **Match** | Flyer, lineup, walk-on, goal celebration, score, highlights | `ContentGenerationModal` (match-context) | `MatchContentTab` in MatchDetailPage |
| **Member** | Intro video, celebration, photo composites, action photo | `AssetGenerationModal` | Member tabs in MemberDetailPage |

Elke pagina behoudt zijn eigen modals voor het juiste niveau.

---

## 4. Route configuratie (App.tsx — GEEN WIJZIGING)

Routes blijven exact hetzelfde. De enige wijziging is dat elke page-component nu gewrapped is in `<SeasonProvider>`:

```tsx
// ONGEWIJZIGD — routes zijn identiek
<Route path="/:org/:club/:team/:season"
  element={<ProtectedRoute><SeasonDetailPage /></ProtectedRoute>} />
<Route path="/:org/:club/:team/:season/:competitionId"
  element={<ProtectedRoute><CompetitionDetailPage /></ProtectedRoute>} />
<Route path="/:org/:club/:team/:season/:competitionId/:matchId"
  element={<ProtectedRoute><MatchDetailPage /></ProtectedRoute>} />

// Intern in elke page component:
function SeasonDetailPage() {
  return (
    <SeasonProvider>
      <SeasonDetailPageContent />
    </SeasonProvider>
  );
}
```

De `SeasonProvider` cached op `seasonId` — als je van season → match navigeert wordt org/club/season data **niet** opnieuw gefetcht.

---

## 5. Wat verandert

| Wat | Van | Naar |
|-----|-----|------|
| `ProjectSeasonDetailPage.tsx` | 4914 regels monoliet | ~200 regels shell + 10 tab-componenten |
| `ProjectSeasonMemberDetailPage.tsx` | 4409 regels monoliet | ~200 regels shell + 10 tab-componenten |
| `MatchDetailPage.tsx` | 2227 regels (veel duplicatie) | ~200 regels shell (sub-tabs al geëxtraheerd ✅) |
| `ProjectCompetitionDetailPage.tsx` | 2400 regels + UUID hack | ~200 regels (opgeschoond, UUID check behouden) |
| Org/club/season fetching | 4x apart in elke pagina | 1x in `SeasonProvider` (cached) |
| Brand profiles | 4x apart | 1x in `SeasonProvider` |
| Feature flags | 4x apart | 1x in `SeasonProvider` |
| Media completion matrix | Inline in season page | Eigen `SquadTab.tsx` component |
| Content generatie modals | Inline in page | Behouden per pagina (correct niveau) |

---

## 6. Migratie fases

### Phase 1: SeasonProvider
**Risico:** Laag | **Effort:** 1 dag

1. Maak `demo/src/providers/SeasonProvider.tsx`
   - Extract shared fetching logic uit SeasonDetailPage
   - org, club, project, season, brand profiles, feature flags
   - Cache mechanisme op `seasonId`
2. Wrap `SeasonDetailPage` in `<SeasonProvider>`
3. Vervang directe fetching in SeasonDetailPage door `useSeasonContext()`
4. **Test:** Season page werkt identiek, data komt uit provider

### Phase 2: Season tab extractie
**Risico:** Laag | **Effort:** 2 dagen

1. Extract elk `{activeTab === 'xxx' && (...)}` blok naar `season-tabs/XxxTab.tsx`
2. Elk tab-component ontvangt data via `useSeasonContext()` + eigen lokale state
3. `ProjectSeasonDetailPage.tsx` wordt een ~200 regels shell
4. Media completion matrix verhuist naar `SquadTab.tsx` (inclusief alle deep-links)
5. **Test:** Alle 11 tabs werken identiek, matrix deep-links werken

### Phase 3: Match page integratie met SeasonProvider
**Risico:** Laag | **Effort:** 0.5 dag

1. Wrap `MatchDetailPage` in `<SeasonProvider>`
2. Vervang duplicaat org/club/season fetching door `useSeasonContext()`
3. Match-specifieke data (match, participations, events) blijft lokaal
4. Sub-tabs zijn al geëxtraheerd ✅ — alleen de shell krimpt
5. **Test:** Match detail + content generatie + lineup werkt

### Phase 4: Member tab extractie
**Risico:** Medium | **Effort:** 3 dagen

1. Extract 10 tab blokken uit `ProjectSeasonMemberDetailPage.tsx` naar `member-tabs/`
2. Wrap in `<SeasonProvider>` voor shared context
3. Member-specifieke data (membership, brand, generation jobs) blijft lokaal in shell
4. `ProjectSeasonMemberDetailPage.tsx` wordt een ~200 regels shell
5. **Test:** Alle 10 member tabs + asset generatie modals

### Phase 5: Competition page opschonen
**Risico:** Laag | **Effort:** 0.5 dag

1. Wrap `CompetitionDetailPage` in `<SeasonProvider>`
2. Verwijder duplicaat fetching
3. Opschonen van de UUID detection (beter commentaar, duidelijkere logic)
4. **Test:** Competition detail + member UUID routing werkt

---

## 7. Wat NIET verandert

| Wat | Reden |
|-----|-------|
| **Routes / URLs** | Geen broken bookmarks, geen redirects nodig |
| **UX / navigatie flow** | Gebruiker merkt niets — exact dezelfde tabs en pagina's |
| **Backend API's** | Geen wijzigingen nodig |
| **Match sub-tabs** | Al geëxtraheerd naar `match-detail/` ✅ |
| **Content generatie modals** | Blijven op juiste niveau (season/match/member) |
| **Media completion matrix** | Verhuist naar SquadTab.tsx maar functionaliteit identiek |
| **CompetitionDetailPage** | Wordt opgeschoond maar blijft bestaan |

---

## 8. SeasonProvider caching strategie

```
Navigatie flow:
Season page → Competition page → Match page → Terug

Zonder Provider:
  Season: fetch org ✓ club ✓ season ✓ brand ✓ flags ✓
  Competition: fetch org ✓ club ✓ season ✓ brand ✓ flags ✓  (DUPLICAAT)
  Match: fetch org ✓ club ✓ season ✓ brand ✓ flags ✓        (DUPLICAAT)
  Terug: fetch org ✓ club ✓ season ✓ brand ✓ flags ✓        (DUPLICAAT)
  → 20 API calls

Met SeasonProvider (cache op seasonId):
  Season: fetch org ✓ club ✓ season ✓ brand ✓ flags ✓
  Competition: cache hit (zelfde seasonId) → 0 calls
  Match: cache hit → 0 calls, fetch match ✓ (match-specifiek)
  Terug: cache hit → 0 calls
  → 6 API calls (70% reductie)
```

### Cache implementatie

```tsx
// Simpele sessionStorage cache of useRef-based in-memory cache
const CACHE_KEY = (seasonId: string) => `season-ctx-${seasonId}`;
const CACHE_TTL = 5 * 60 * 1000; // 5 minuten

// Bij eerste load: fetch + cache
// Bij volgende loads met zelfde seasonId: use cache
// Bij expliciete reload (pull-to-refresh, na mutation): invalideer cache
```

---

## 9. Bestaande componenten die hergebruikt worden

### Match detail sub-components (al geëxtraheerd ✅)
- `MatchOverviewTab.tsx` (342 regels) — match info, score, events
- `MatchContentTab.tsx` (532 regels) — media items, match-level content generatie
- `MatchLineupTab.tsx` (552 regels) — lineup management, drag & drop
- `MatchTransactionsTab.tsx` (34 regels) — transacties wrapper

### Shared components (ONGEWIJZIGD)
- `MobileTabBar` — tab navigatie (dropdown + inline variant)
- `ContentGenerationModal` — content generatie (season + match context)
- `AssetGenerationModal` — asset generatie (member context)
- `BatchGenerationModal` — batch generatie (season + members context)
- `TransactionsPanel` — transacties weergave
- `WorkflowPanel` — workflow management
- `useBrandProfile` hook — brand profile fetching → **verhuist naar SeasonProvider**
- `useVideoJobs` hook — video job management

---

## 10. Design Principe: Mobile-First

### Waarom mobile-first?

| Gebruiker | Device | Gebruik | Prioriteit |
|-----------|--------|---------|------------|
| Speler / Ouder / Clublid | 📱 Mobiel | Content bekijken, foto's uploaden, profiel | **80% van gebruikers** |
| Teammanager / Clubbeheerder | 💻 Desktop | Seizoenen beheren, content genereren, bulk acties | **20% admin** |

**Mobile-first ≠ mobile-only.** We ontwerpen de core UX voor mobile en verrijken voor desktop.

### Mobile UX patterns (al aanwezig, behouden)

- **Bottom tab bar** (MobileTabBar dropdown) — season tabs
- **Inline pills** (MobileTabBar inline) — match sub-tabs (al in gebruik ✅)
- **Full-screen modals** — content generatie op mobiel
- **Touch targets** — minimaal 44x44px
- **Media completion matrix** — compact grid met emoji indicatoren

### Gamification hooks (al aanwezig, behouden)

- **Media completion matrix** — per-member progress (✅/⬜/🔶/⏳) met `{filled}/{total}` badge
- **Content completion checklist** — per-match content types met status
- **Credits/wallet** — in navbar, low-balance waarschuwing
- **Batch generation** — "Generate All" voor member assets

---

## 11. Risico's & mitigatie

| Risico | Mitigatie |
|--------|-----------|
| SeasonProvider re-renders cascaderen naar alle tabs | `useMemo` + `React.memo` op tab componenten |
| Cache wordt stale na mutations | `reloadAll()` helper + cache invalidatie bij save/create |
| Tab extractie breekt bestaande state dependencies | Extract per tab, test na elke extractie |
| Member detail tabs hebben cross-dependencies (bijv. "genereer eerst Player in Tenue") | Shared member state in MemberDetailPage shell, niet in provider |
| Performance regressie door context overhead | Profile met React DevTools, context split indien nodig |

---

## 12. Niet-doelen (buiten scope)

- Route wijzigingen / URL structuur verandering
- Desktop layout / responsive redesign
- Nieuwe features toevoegen
- Org-level member detail (`/organisations/:id/members/:memberId`) — blijft apart
- Team detail page (`/:org/:club/:team`) — niet beïnvloed
- Gamification engine (B60) — apart project
- CompetitionDetailPage verwijderen — wordt opgeschoond, niet verwijderd

---

## 13. Volgorde van aanpak

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5
Provider    Season      Match       Member      Competition
            Tabs        Integratie  Tabs        Opschonen
(1 dag)     (2 dagen)   (0.5 dag)   (3 dagen)   (0.5 dag)
```

**Totale geschatte doorlooptijd:** ~7 werkdagen

---

## 14. Beslissingen

- [x] **Routes behouden** → Geen URL wijzigingen, geen redirects nodig
- [x] **SeasonProvider als shared context** → Cache op seasonId, deelt org/club/season/brand/flags
- [x] **Content modals per niveau** → Season-level in SeasonDetailPage, match-level in MatchDetailPage, member-level in MemberDetailPage
- [x] **Media completion matrix** → Verhuist naar `SquadTab.tsx`, functionaliteit ongewijzigd
- [x] **Hierarchy + Competitions samenvoegen** → Eén "Competitions" tab
- [x] **Team + Squad apart houden** → Squad = season members, Team = team-only
- [x] **CompetitionDetailPage behouden** → Opschonen, niet verwijderen
- [x] **Mobile-first** → Bestaande patronen behouden en versterken

---

## 15. Succes criteria

| Criterium | Meetbaar |
|-----------|----------|
| Geen enkel bestand > 600 regels | `wc -l` check |
| SeasonProvider deelt data tussen pagina's | 0 duplicaat org/club/season fetches bij navigatie |
| Alle bestaande functionaliteit werkt | Handmatige test + bestaande E2E tests |
| Media completion matrix + deep-links intact | Matrix navigatie test |
| Content generatie op alle 3 niveaus werkt | Season batch + match content + member assets |
| Geen broken URLs | Alle bestaande routes reageren identiek |
