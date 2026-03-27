# H2 — UpcomingMatchesCard + MatchSheet Hergebruik

> **Status:** ✅ Voltooid
> **Geschatte effort:** 3-4 uur
> **Geschatte omvang:** ~250 regels nieuw, ~100 regels refactor

## Doel

Lijst van aankomende wedstrijden op het dashboard die **dezelfde MatchSheet** openen als ActiveMatchCard. Tap op een wedstrijd → full-featured match sheet met lineup, content acties, readiness.

## Probleem

- Dashboard toont alleen de **dichtstbijzijnde** match (ActiveMatchCard)
- Coaches willen snel door meerdere wedstrijden bladeren
- Bestaand `UpcomingMatchesCard` in DashboardSummaries.tsx navigeert weg naar match detail page
- MatchSheet logica zit nu diep in ActiveMatchCard (~465 LOC) — niet herbruikbaar

## Architectuur

### useMatchSheet hook (extract uit ActiveMatchCard)

De kern van de oplossing: match sheet logica extraheren naar een herbruikbare hook.

```tsx
// demo/src/components/dashboard/useMatchSheet.ts

interface UseMatchSheetReturn {
  // Sheet state
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;

  // Lineup sub-sheet
  lineupSheetOpen: boolean;
  openLineupSheet: () => void;
  closeLineupSheet: () => void;

  // Data
  contentCount: number;
  contentDoneSubtypes: string[];
  lineupCount: number;
  lineupFormation: string | null;
  readinessPercent: number;

  // Actions
  openCreateWizard: () => void;
  handleLineupSaved: (count: number, formation: string) => void;
  handleContentGenerated: (newCount: number) => void;
}

export function useMatchSheet(match: Match | null): UseMatchSheetReturn {
  // Extract match sheet state management from ActiveMatchCard
  // Includes: sheet open/close, lineup sub-sheet, content tracking,
  // readiness calculation, CreateWizard event dispatch
}
```

**Wat wordt geëxtract uit ActiveMatchCard:**
- `sheetOpen` / `lineupSheetOpen` state (stacked sheet management)
- Content done subtypes tracking (via `useClosestMatch` → generalized)
- Lineup count + formation tracking
- `openCreateWizard()` — `teamreel:open-quick-create` event dispatch
- `handleLineupSaved()` / `handleContentGenerated()` callbacks
- Readiness % berekening: `contentDoneSubtypes.length / totalPhaseItems * 100`

**Wat NIET wordt geëxtract:**
- Card preview JSX (verschilt per card)
- Urgency styling (match-day mode is H4)

### useUpcomingMatches hook

```tsx
// demo/src/hooks/useUpcomingMatches.ts

interface UpcomingMatch extends Match {
  readinessPercent: number;
  contentDoneSubtypes: string[];
  lineupCount: number;
}

export function useUpcomingMatches(projectId?: string, limit = 5): {
  matches: UpcomingMatch[];
  isLoading: boolean;
} {
  // Fetch upcoming matches via /activities/?activity_type=match&start_time__gte=now&ordering=start_time
  // For each match: calculate readiness (client-side, from media items)
  // Uses TanStack Query with 5min staleTime
}
```

**API call:** `GET /activities/?activity_type=match&start_time__gte={now}&ordering=start_time&project={id}&page_size=5`

**Readiness per match:** Fetch media items per match, count done subtypes, divide by total CONTENT_TYPES items.

> **Performance:** Readiness berekening is client-side. Eerste versie: 1 API call voor matches + 1 call voor media items (gefilterd op project). TanStack Query cached alles.

### UpcomingMatchesCard component

```
╔═══════════════════════════════════╗
║  📅 Komende wedstrijden           ║
╠═══════════════════════════════════╣
║  Za 22 mrt · 15:30               ║
║  Helden 6 vs Tegenstander        ║
║  📍 De Boekweit                   ║
║  ████████░░ 72%            →     ║
╠───────────────────────────────────╣
║  Za 29 mrt · 14:00               ║
║  Helden 6 vs Ander Team          ║
║  📍 Sportpark                     ║
║  ░░░░░░░░░░ 0%             →     ║
╠───────────────────────────────────╣
║  Za 5 apr · 15:30                ║
║  Uitteam vs Helden 6             ║
║  📍 Uitlocatie                    ║
║  ░░░░░░░░░░ 0%             →     ║
╚═══════════════════════════════════╝
```

**Per match row:**
- Datum + tijd (relatief: "Over 3 dagen" of absoluut: "Za 22 mrt · 15:30")
- Match title (home vs away)
- Locatie (compact, 1 regel)
- `Progress` component uit design system (percentage fill)
- Chevron → tap opent MatchSheet

**Tap gedrag:**
1. `setSelectedMatch(match)` → state in UpcomingMatchesCard
2. `useMatchSheet(selectedMatch)` → get sheet state
3. Open MatchSheet met die wedstrijd
4. MatchSheet toont lineup/content acties (identiek aan ActiveMatchCard sheet)

### MatchSheet component (refactored)

```tsx
// demo/src/components/dashboard/MatchSheet.tsx
// Extracted from ActiveMatchCard JSX — now a standalone component

interface MatchSheetProps {
  match: Match;
  isOpen: boolean;
  onClose: () => void;
  contentDoneSubtypes: string[];
  lineupCount: number;
  lineupFormation: string | null;
  onOpenLineup: () => void;
  onOpenCreateWizard: () => void;
}

export const MatchSheet: React.FC<MatchSheetProps> = ({ ... }) => {
  // NavigationSheet wrapper
  // Match overview (badge, teams, score, meta)
  // Lineup action button
  // Phase blocks (pre_match, during_match, post_match) — collapsible
  // "Open wedstrijd →" navigation link
};
```

## ActiveMatchCard refactor

ActiveMatchCard wordt simpeler na extract:

```diff
- // 465+ LOC met inline sheet rendering
+ // ~200 LOC — card preview + useMatchSheet hook + MatchSheet component
+
+ const matchSheet = useMatchSheet(match);
+
+ <MatchSheet
+   match={match}
+   isOpen={matchSheet.sheetOpen}
+   onClose={matchSheet.closeSheet}
+   contentDoneSubtypes={matchSheet.contentDoneSubtypes}
+   lineupCount={matchSheet.lineupCount}
+   lineupFormation={matchSheet.lineupFormation}
+   onOpenLineup={matchSheet.openLineupSheet}
+   onOpenCreateWizard={matchSheet.openCreateWizard}
+ />
```

## Design system alignment

| Component | Bron | Gebruik |
|-----------|------|---------|
| `Progress` | `@django-core/design-system` | Readiness bar per match |
| `Badge` | `@django-core/design-system` | Readiness % badge |
| `NavigationSheet` | `demo/src/components/ui` | MatchSheet |
| `Card` (outlined) | `@django-core/design-system` | UpcomingMatchesCard wrapper |
| `formatRelativeTime` | `demo/src/utils/relativeTime` | "Over 3 dagen" datum format |

## Bestanden

| Bestand | Actie |
|---------|-------|
| `demo/src/components/dashboard/useMatchSheet.ts` | **Nieuw** — herbruikbare match sheet hook |
| `demo/src/components/dashboard/MatchSheet.tsx` | **Nieuw** — standalone match sheet component (extracted from ActiveMatchCard) |
| `demo/src/components/dashboard/UpcomingMatchesCard.tsx` | **Nieuw** — compact match list + sheet |
| `demo/src/components/dashboard/UpcomingMatchesCard.module.css` | **Nieuw** — match list styling |
| `demo/src/hooks/useUpcomingMatches.ts` | **Nieuw** — fetch upcoming matches + readiness |
| `demo/src/components/dashboard/ActiveMatchCard.tsx` | **Refactor** — use useMatchSheet + MatchSheet components |
| `demo/src/pages/DashboardPage.tsx` | Add UpcomingMatchesCard import + render |
| `demo/src/components/dashboard/index.ts` | Export UpcomingMatchesCard |

## Afhankelijkheden

- **H0 moet eerst:** Layout met UpcomingMatches placeholder
- **Bestaande code:** ActiveMatchCard sheet rendering, useClosestMatch hook, CONTENT_TYPES constant, LineupSheet component

## Acceptatiecriteria

- [ ] `useMatchSheet` hook extracted — ActiveMatchCard gebruikt het
- [ ] `MatchSheet` component extracted — herbruikbaar door ActiveMatchCard + UpcomingMatchesCard
- [ ] `UpcomingMatchesCard` toont volgende 3-5 matches met readiness %
- [ ] Tap match → opent MatchSheet met lineup/content acties
- [ ] MatchSheet → lineup sub-sheet werkt (stacked sheet met ‹ Vorige)
- [ ] MatchSheet → content items openen CreateWizard via event
- [ ] `Progress` component uit design system voor readiness bars
- [ ] ActiveMatchCard LOC significant gereduceerd (van ~465 naar ~200)
- [ ] Readiness % correct berekend (done subtypes / total items)
- [ ] TanStack Query caching — geen extra API calls bij sheet open
- [ ] Geen functionaliteitsverlies in ActiveMatchCard
- [ ] TypeScript clean, Vite build succesvol
