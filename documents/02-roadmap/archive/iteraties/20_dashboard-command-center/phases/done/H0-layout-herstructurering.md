# H0 — Dashboard Layout Herstructurering

> **Status:** ✅ Voltooid
> **Geschatte effort:** 4-6 uur
> **Geschatte omvang:** ~200 regels gewijzigd, ~150 regels nieuw

## Doel

Dashboard van 8-10 losse cards terugbrengen naar 6-7 gestructureerde secties. Mobiel = enkele kolom. Cards mergen waar data overlapt. Rol-filtering per sectie.

## Probleem

- **Information overload:** 8-10 cards tegelijk, geen duidelijke prioriteit
- **Data duplicatie:** ContentBreakdownCard en ContentOverviewCard tonen dezelfde data anders
- **MemberContentProgressCard + AssetsOverviewCard:** beide gaan over team readiness, apart gepresenteerd
- **ActivityFeed in sidebar:** op mobiel onzichtbaar of slecht bereikbaar
- **Geen UpcomingMatches:** alleen de actieve match is zichtbaar

## Nieuwe layout (mobiel — enkele kolom)

```
┌─────────────────────────────┐
│  Header (welkom + context)  │  ← bestaand, ongewijzigd
├─────────────────────────────┤
│  ⚡ ActiveMatchCard          │  ← bestaand, ongewijzigd
├─────────────────────────────┤
│  📊 StatusStrip              │  ← bestaand summaryGrid, consistent styling
│  [Squad] [AI Queue] [Credits]│
├─────────────────────────────┤
│  🎯 SmartActionsCard         │  ← bestaand, sheet conversie in H1/H3
├─────────────────────────────┤
│  📅 UpcomingMatchesCard      │  ← NIEUW (compact list, 3-5 matches)
├─────────────────────────────┤
│  📈 ContentProgressCard      │  ← MERGE: Breakdown + Overview
│  (tap → sheet met Tabs)     │
├─────────────────────────────┤
│  👥 TeamReadinessCard        │  ← MERGE: MemberProgress + Assets
│  (tap → sheet met Tabs)     │
└─────────────────────────────┘
```

### Desktop — twee kolommen

```
┌───────────────────────┬──────────────────┐
│  ActiveMatch          │  UpcomingMatches  │
│  StatusStrip          │  (compact list)   │
│  SmartActions         │                   │
│  ContentProgress      │  ActivityFeed     │
│  TeamReadiness        │  (timeline)       │
└───────────────────────┴──────────────────┘
```

## Merge strategie

### ContentProgressCard (Breakdown + Overview → 1 card)

**Bestaande cards:**
- `ContentBreakdownCard` (169 LOC) — progress bars per content type
- `ContentOverviewCard` (388 LOC) — volledige content inventory met thumbnails

**Nieuwe card:** `ContentProgressCard`
- **Card preview:** Compacte progress bars (van Breakdown) + totaal badge
- **Sheet:** `NavigationSheet` met **Tabs** component uit design system:
  - **Tab "Overzicht"** — progress bars per fase (pre/during/post) met percentages
  - **Tab "Inventaris"** — volledige inventory met thumbnails per subtype (van Overview)
- **Data:** Hergebruikt `useGenerativeRequests` + media items query (al shared via TanStack Query deduplicatie)

```tsx
// Pattern — gebruikt @django-core/design-system Tabs
import { Tabs, TabList, Tab, TabPanel } from '@django-core/design-system';

<NavigationSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Content voortgang">
  <Tabs defaultValue="overview">
    <TabList>
      <Tab value="overview">Overzicht</Tab>
      <Tab value="inventory">Inventaris</Tab>
    </TabList>
    <TabPanel value="overview">
      {/* Progress bars per fase */}
    </TabPanel>
    <TabPanel value="inventory">
      {/* Thumbnail grid per subtype */}
    </TabPanel>
  </Tabs>
</NavigationSheet>
```

### TeamReadinessCard (MemberProgress + Assets → 1 card)

**Bestaande cards:**
- `MemberContentProgressCard` (246 LOC) — per-member progress bars
- `AssetsOverviewCard` (430 LOC) — team + member asset checklists

**Nieuwe card:** `TeamReadinessCard`
- **Card preview:** Compact: "X/Y leden compleet" + "Z ontbrekende assets" + progress bar
- **Sheet:** `NavigationSheet` met **Tabs**:
  - **Tab "Spelers"** — per-member avatar + progress (van MemberProgress)
  - **Tab "Assets"** — team + member asset checklists (van Assets)
- **Data:** Hergebruikt `useProjectMembers` + `useGenerativeRequests` + branding assets query

```tsx
<NavigationSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Team gereedheid">
  <Tabs defaultValue="members">
    <TabList>
      <Tab value="members">Spelers</Tab>
      <Tab value="assets">Assets</Tab>
    </TabList>
    <TabPanel value="members">
      {/* Per-member progress list */}
    </TabPanel>
    <TabPanel value="assets">
      {/* Team + member asset checklists */}
    </TabPanel>
  </Tabs>
</NavigationSheet>
```

## UpcomingMatchesCard (nieuw)

- Compact lijst van volgende 3-5 wedstrijden
- Per match: datum, tegenstander, locatie, readiness %
- Tap → opent MatchSheet (hergebruik uit H2)
- Mobiel: in main kolom (na SmartActions)
- Desktop: in sidebar (boven ActivityFeed)
- **Implementatie verschuift naar H2** — in H0 alleen placeholder met navigate

## OrgStatsCard

- **Verwijderd als standalone card** — data (clubs, teams, matches, leden) verhuist naar StatusStrip op org-level scope
- Org-level admins zien een 4e mini-card in de StatusStrip met "X teams"

## Rol-filtering

| Sectie | Coach/Manager | Org Admin | Player/Supporter |
|--------|:------------:|:---------:|:----------------:|
| ActiveMatchCard | ✅ | ✅ | ✅ (read-only) |
| StatusStrip: Squad | ✅ | ✅ | ❌ |
| StatusStrip: AI Queue | ✅ | ✅ | ❌ |
| StatusStrip: Credits | ❌ | ✅ | ❌ |
| SmartActionsCard | ✅ | ✅ | ❌ |
| UpcomingMatchesCard | ✅ | ✅ | ✅ |
| ContentProgressCard | ✅ | ✅ | ❌ |
| TeamReadinessCard | ✅ | ✅ | ❌ |
| ActivityFeed (desktop) | ✅ | ✅ | ✅ |

## Design system alignment

| Component | Bron | Gebruik |
|-----------|------|---------|
| `Card` (outlined) | `@django-core/design-system` | Wrapper rond elke dashboard card |
| `Tabs` / `TabList` / `Tab` / `TabPanel` | `@django-core/design-system` | Merged sheets (ContentProgress, TeamReadiness) |
| `Badge` | `@django-core/design-system` | Totaal counts, readiness % |
| `Progress` | `@django-core/design-system` | Progress bars in cards |
| `NavigationSheet` | `demo/src/components/ui` | Alle card sheets |
| `PullToRefresh` | `@django-core/design-system` | Bestaande dashboard wrapper |
| CSS variables | `themeVars` / `--bg-*`, `--text-*` | Geen magic numbers |

## Bestanden

| Bestand | Actie |
|---------|-------|
| `demo/src/pages/DashboardPage.tsx` | Refactor layout: remove old cards, add merged cards, update imports |
| `demo/src/pages/DashboardPage.module.css` | Simplify: single col mobile, sidebar for desktop |
| `demo/src/components/dashboard/ContentProgressCard.tsx` | **Nieuw** — merged Breakdown + Overview |
| `demo/src/components/dashboard/ContentProgressCard.module.css` | **Nieuw** — card + sheet styling |
| `demo/src/components/dashboard/TeamReadinessCard.tsx` | **Nieuw** — merged MemberProgress + Assets |
| `demo/src/components/dashboard/TeamReadinessCard.module.css` | **Nieuw** — card + sheet styling |
| `demo/src/components/dashboard/index.ts` | Update exports: remove old, add new |
| `demo/src/components/dashboard/DashboardSummaries.tsx` | OrgStatsCard → merge in StatusStrip of verwijderen |
| `demo/src/components/dashboard/ContentBreakdownCard.tsx` | **Verwijderd** (code verhuist naar ContentProgressCard) |
| `demo/src/components/dashboard/ContentOverviewCard.tsx` | **Verwijderd** (code verhuist naar ContentProgressCard) |
| `demo/src/components/dashboard/MemberContentProgressCard.tsx` | **Verwijderd** (code verhuist naar TeamReadinessCard) |
| `demo/src/components/dashboard/AssetsOverviewCard.tsx` | **Verwijderd** (code verhuist naar TeamReadinessCard) |

## Acceptatiecriteria

- [ ] Dashboard toont max 6-7 secties (geen 8-10)
- [ ] ContentProgressCard toont 1 card met Tabs-sheet (Overzicht + Inventaris)
- [ ] TeamReadinessCard toont 1 card met Tabs-sheet (Spelers + Assets)
- [ ] UpcomingMatchesCard placeholder aanwezig (volledige implementatie in H2)
- [ ] OrgStatsCard verwijderd als standalone
- [ ] Rol-filtering correct: spelers zien minder cards
- [ ] Mobiel: single column, geen horizontale overflow
- [ ] Desktop: twee kolommen (main + sidebar)
- [ ] Tabs component uit design-system, geen custom tabs
- [ ] Geen data duplicatie — queries shared via TanStack Query
- [ ] TypeScript clean, Vite build succesvol
- [ ] Dark mode: CSS variables, geen hardcoded kleuren
