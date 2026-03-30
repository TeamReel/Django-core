# Roadmap #20 — Dashboard Command Center

> **Status:** ✅ Afgerond (6/6 fases)
> **Start:** 2026-03-15
> **Scope:** `demo/src/pages/DashboardPage.tsx`, `demo/src/components/dashboard/`
> **Bron:** Gamification analyse, Profile sheet-ification patroon, roadmap #19
> **Fase docs:** [H0](phases/H0-layout-herstructurering.md) · [H1](phases/H1-alle-cards-sheet-pattern.md) · [H2](phases/H2-upcoming-matches-matchsheet.md) · [H3](phases/H3-smart-actions-verbetering.md) · [H4](phases/H4-matchday-mode-readiness.md) · [H5](phases/H5-polish-consistency.md)

---

## Design beslissingen

| Vraag | Besluit |
|-------|---------|
| Merged card sheets | **Tabs** uit design system (`@django-core/design-system` Tabs/TabList/Tab/TabPanel) |
| Upload actie (Smart Actions) | **Inline upload sheet** met FileUpload component — geen navigatie naar /medialib |
| Credits card | **Hergebruik CreditsSheetContent** van ProfileHubPage — DRY, lazy-loaded |
| Match-day mode | **Prominent** — header wordt countdown, card krijgt accent, smart actions gefilterd |

---

## Doel

Dashboard transformeren naar een **volledig iOS-style command center** waar:
1. **Alles inline opent** — geen navigatie weg van het dashboard
2. **Inhoud aansluit** bij de webapp — juiste cards voor de juiste rollen
3. **Consistente UX** — zelfde sheet-stacking patroon als ProfileHubPage

**Kernprincipe:** Het dashboard is het startscherm. Alle informatie en acties zijn bereikbaar via taps → sheets → child sheets, zonder context-verlies.

---

## Huidige staat

### Wat werkt ✅
- **ActiveMatchCard** → MatchSheet → LineupSheet / ContentSheet (volledig iOS-style)
- **AIQueueCard** → opent NavigationSheet met queue details
- **ContentBreakdownCard** → opent NavigationSheet met breakdown
- **ContentOverviewCard** → opent NavigationSheet met inventory
- **MemberContentProgressCard** → opent NavigationSheet met member lijst
- **AssetsOverviewCard** → opent NavigationSheet met asset status
- **Pull-to-refresh** — PullToRefresh wrapper op hele pagina
- **TanStack Query** — caching, deduplicatie, stale-while-revalidate

### Wat niet klopt ❌

| Probleem | Impact |
|----------|--------|
| **SmartActionsCard navigeert weg** | Breekt command center patroon |
| **SquadReadinessCard navigeert weg** | Inconsistent met sheet-cards |
| **CreditsTrendCard navigeert weg** | Inconsistent |
| **OrgStatsCard navigeert weg** | Inconsistent |
| **ActivityFeed in sidebar** | Op mobiel onzichtbaar of slecht bereikbaar |
| **Te veel cards** | 8-10 cards tegelijk = information overload |
| **Geen role-optimized layout** | Coach ziet bijna alles, maar prioriteit is onduidelijk |
| **Content items → CreateWizard** | Opent los van dashboard context (geen sheet-stack) |
| **Geen match-day modus** | Dashboard mist urgentie op wedstrijddagen |

---

## Fasering

### Fase H0 — Dashboard Layout Herstructurering
> **Effort:** 4-6 uur

**Doel:** Dashboard content reorganiseren per rol, met duidelijke secties.

#### Layout (mobiel — enkele kolom)

```
┌─────────────────────────────┐
│  Header (welkom + context)  │
├─────────────────────────────┤
│  ⚡ Active Match Card       │  ← Altijd bovenaan (als er een is)
├─────────────────────────────┤
│  📊 Status Strip            │  ← Compacte horizontale rij
│  [Squad] [Credits] [Queue]  │     3 mini-kaartjes, tap → sheet
├─────────────────────────────┤
│  🎯 Smart Actions           │  ← Max 3 prioritized actions
│  "Maak lineup" "Upload X"   │     Alles opent als sheet/wizard
├─────────────────────────────┤
│  📅 Upcoming Matches        │  ← Volgende 3-5 wedstrijden
│  (compact list, tap → sheet)│     Tap → zelfde MatchSheet als Active
├─────────────────────────────┤
│  📈 Content Progress        │  ← Gecombineerde breakdown
│  (pre/during/post progress) │     Tap → detail sheet
├─────────────────────────────┤
│  👥 Team Readiness          │  ← Member assets + content progress
│  (compact, merged card)     │     Tap → member detail sheet
└─────────────────────────────┘
```

#### Desktop — twee kolommen

```
┌───────────────────────┬──────────────────┐
│  Active Match         │  Upcoming Matches│
│  Status Strip         │  (feed-style)    │
│  Smart Actions        │                  │
│  Content Progress     │  Activity Feed   │
│  Team Readiness       │  (timeline)      │
└───────────────────────┴──────────────────┘
```

#### Rol-filtering

| Card | Coach | Org Admin | Player |
|------|:-----:|:---------:|:------:|
| Active Match | ✅ | ✅ | ✅ (read-only) |
| Status Strip: Squad | ✅ | ✅ | ❌ |
| Status Strip: Credits | ❌ | ✅ | ❌ |
| Status Strip: AI Queue | ✅ | ✅ | ❌ |
| Smart Actions | ✅ | ✅ | ❌ |
| Upcoming Matches | ✅ | ✅ | ✅ |
| Content Progress | ✅ | ✅ | ❌ |
| Team Readiness | ✅ | ✅ | ❌ |

#### Taken
- [ ] Dashboard layout refactor: verwijder `twoCol` op mobiel, enkele kolom
- [ ] Merge ContentBreakdownCard + ContentOverviewCard → één `ContentProgressCard`
- [ ] Merge MemberContentProgressCard + AssetsOverviewCard → één `TeamReadinessCard`
- [ ] `UpcomingMatchesCard` toevoegen (compact list, volgende 3-5 matches)
- [ ] ActivityFeed verplaatsen naar desktop sidebar-only, vervangen door UpcomingMatches op mobiel
- [ ] Rol-filtering toepassen per sectie

---

### Fase H1 — Alle Cards → Sheet Pattern
> **Effort:** 4-6 uur

**Doel:** Elke card die nu navigeert omzetten naar iOS-style sheet.

#### Cards om te converteren

| Card | Nu | Straks |
|------|-----|--------|
| **SmartActionsCard** | `navigate()` naar pagina's | Tap action → `teamreel:open-quick-create` event of sheet |
| **SquadReadinessCard** | `navigate()` naar squad | Tap → sheet met member overzicht |
| **CreditsTrendCard** | `navigate()` naar /credits | Tap → sheet met credit details (zoals ProfileHubPage) |
| **OrgStatsCard** | `navigate()` naar org | Verwijderen — data past in status strip |
| **UpcomingMatchesCard** | `navigate()` naar match | Tap match → zelfde MatchSheet als ActiveMatchCard |

#### Patroon (consistent met ProfileHubPage)

```tsx
// Elk card volgt dit patroon:
const [sheetOpen, setSheetOpen] = useState(false);

<CompactCard onClick={() => setSheetOpen(true)} />
<NavigationSheet
  isOpen={sheetOpen}
  onClose={() => setSheetOpen(false)}
  title="Card Detail"
>
  <DetailContent />
</NavigationSheet>
```

#### Taken
- [ ] SmartActionsCard: acties openen CreateWizard event of inline sheet
- [ ] SquadReadinessCard: tap → NavigationSheet met member lijst
- [ ] CreditsTrendCard: tap → NavigationSheet met balance + recent transactions
- [ ] UpcomingMatchesCard: tap match → MatchSheet hergebruik (ActiveMatchCard-stijl)
- [ ] OrgStatsCard: merge in status strip of verwijderen

---

### Fase H2 — UpcomingMatchesCard + MatchSheet Hergebruik
> **Effort:** 3-4 uur

**Doel:** Lijst van aankomende wedstrijden die **dezelfde MatchSheet** openen als ActiveMatchCard.

#### Concept

```
╔═══════════════════════════════════╗
║  📅 Komende wedstrijden           ║
╠═══════════════════════════════════╣
║  Za 22 mrt · 15:30               ║
║  Helden 6 vs Tegenstander        ║
║  📍 De Boekweit · 6e klasse      ║
║  [72% ready] ──────────── →      ║
╠───────────────────────────────────╣
║  Za 29 mrt · 14:00               ║
║  Helden 6 vs Ander Team          ║
║  📍 Sportpark · 6e klasse        ║
║  [0% ready] ───────────── →      ║
╠───────────────────────────────────╣
║  Za 5 apr · 15:30                ║
║  Uitteam vs Helden 6             ║
║  📍 Uitlocatie · 6e klasse       ║
║  [0% ready] ───────────── →      ║
╚═══════════════════════════════════╝
```

- Tap op een wedstrijd → opent MatchSheet (inline) met lineup/content acties
- MatchSheet logic wordt geëxtract uit ActiveMatchCard naar herbruikbare hook
- Readiness % per match = content done subtypes / totaal items

#### Taken
- [ ] Extract MatchSheet logic uit ActiveMatchCard naar `useMatchSheet` hook
- [ ] `UpcomingMatchesCard` component: fetcht volgende 5 matches, compact list
- [ ] Per match: readiness progress bar, datum, tegenstander, locatie
- [ ] Tap match → open MatchSheet met die wedstrijd (hergebruik hook)
- [ ] Readiness % berekening client-side (contentDoneSubtypes / CONTENT_TYPES total)

---

### Fase H3 — Smart Actions Verbetering
> **Effort:** 2-3 uur

**Doel:** SmartActionsCard opent alles inline in plaats van navigeren.

#### Huidige acties en hun conversie

| Actie | Nu | Straks |
|-------|-----|--------|
| "Tenue foto genereren" | navigate → season?tab=media | → `teamreel:open-quick-create` event met flow |
| "Foto's uploaden" | navigate → /medialib | → open upload sheet inline |
| "Lineup invullen" | navigate → match page | → open MatchSheet → LineupSheet |
| "Content aanmaken" | navigate → season?tab=media | → `teamreel:open-quick-create` event |

#### Taken
- [ ] Alle navigate-acties vervangen door sheet/event patterns
- [ ] Upload actie: open simple file-upload sheet (niet hele medialib pagina)
- [ ] Lineup actie: dispatch `teamreel:open-match-sheet` event → dashboard opent MatchSheet
- [ ] Content actie: dispatch `teamreel:open-quick-create` event

---

### Fase H4 — Match-day Mode & Match Readiness
> **Effort:** 3-4 uur

**Doel:** Dashboard herkent wedstrijddagen en past layout/urgentie aan.

#### Match-day Mode triggers
- Active match `start_time` is vandaag → match-day mode
- Header toont wedstrijd-countdown ipv "Welkom, Naam"
- ActiveMatchCard krijgt prominent styling (grotere kaart, accent border)
- Smart Actions toont alleen match-gerelateerde acties

#### Match Readiness Score
- Berekening: `contentDoneSubtypes.length / totalPhaseItems * 100`
- Visueel: progress ring op ActiveMatchCard (SVG `stroke-dashoffset`)
- Kleur: rood (< 30%), oranje (30-70%), groen (> 70%)
- Compact percentage badge op UpcomingMatchesCard per match

#### Taken
- [ ] Match-day detection in DashboardPage (check active match date)
- [ ] Conditional header: countdown timer op wedstrijddagen
- [ ] ActiveMatchCard: readiness ring (SVG cirkel)
- [ ] Match-day accent styling (border, glow effect)
- [ ] UpcomingMatchesCard: readiness % per match

---

### Fase H5 — Polish & Consistency Pass
> **Effort:** 2-3 uur

**Doel:** Alle dashboard sheets consistent maken met ProfileHubPage patterns.

#### Consistency checklist
- [ ] Alle sheets: consistent `NavigationSheet` met `title`, `onClose`, `onBack`
- [ ] Alle sheets: lazy-loaded content via `React.lazy()` + `Suspense`
- [ ] Alle sheets: proper `aria-label`, `aria-expanded` attributes
- [ ] Card tap feedback: haptic + scale animation (`.card:active { transform: scale(0.98) }`)
- [ ] Sheet stacking: max 2 deep (card → sheet → child sheet)
- [ ] Status strip: consistent mini-card styling (icon + value + chevron)
- [ ] Dark mode: alle nieuwe components met CSS variables
- [ ] Mobile: alle content single-column, geen horizontal overflow

---

## Technische architectuur

### Sheet stacking patroon

```
Dashboard
 ├─ ActiveMatchCard (tap)
 │   └─ MatchSheet (NavigationSheet)
 │       ├─ LineupSheet (‹ Vorige)
 │       └─ Phase items → CreateWizard (event)
 ├─ UpcomingMatchesCard
 │   └─ MatchSheet (hergebruikt hook)
 │       └─ (zelfde children)
 ├─ Status Strip
 │   ├─ SquadCard → SquadSheet
 │   ├─ CreditsCard → CreditsSheet
 │   └─ QueueCard → QueueSheet
 ├─ SmartActionsCard
 │   └─ Actions → CreateWizard events / inline sheets
 ├─ ContentProgressCard (tap)
 │   └─ ContentProgressSheet (NavigationSheet)
 └─ TeamReadinessCard (tap)
     └─ TeamReadinessSheet (NavigationSheet)
         └─ MemberDetailSheet (‹ Vorige)
```

### Herbruikbare hooks

| Hook | Verantwoordelijkheid |
|------|---------------------|
| `useMatchSheet(match)` | Sheet state + lineup/content counts + actions (geëxtract uit ActiveMatchCard) |
| `useMatchReadiness(matchId)` | Content done subtypes → readiness % |
| `useUpcomingMatches(projectId)` | Volgende 5 matches met readiness |

### Key design tokens

```css
/* Status strip mini-cards */
--status-card-height: 72px;
--status-card-gap: var(--space-2);

/* Match-day mode */
--matchday-accent: var(--color-amber-400);
--matchday-glow: 0 0 0 2px rgba(251, 191, 36, 0.3);

/* Readiness ring */
--readiness-red: var(--color-red-500);
--readiness-orange: var(--color-amber-400);
--readiness-green: var(--color-green-500);
```

---

## Metriek targets

| Metric | Huidig | Target |
|--------|-------:|-------:|
| Cards dat weg navigeert | 4 | 0 |
| Cards met inline sheets | 6 | 10 (alle) |
| Dashboard cards totaal | 8-10 | 6-7 (gemerged) |
| Match-day prominentie | geen | countdown + accent |
| Upcoming matches zichtbaar | 0 (sidebar only) | 3-5 (main col) |
| Readiness score | niet zichtbaar | per match % |

---

## Niet in scope

- **Gamification engine** (streaks, badges, leaderboard) — apart roadmap item (#21)
- **Backend API wijzigingen** — alles client-side berekend
- **PWA / offline** — niet van toepassing (besluit: responsive webapp)
- **Social sharing** — apart gepland (B54)
- **Onboarding wizard** — apart gepland

---

## Tech Debt Prevention

### Design system alignment (geen custom UI primitives)

| Wat | Gebruik | NIET doen |
|-----|---------|-----------|
| Card wrappers | `Card` van `@django-core/design-system` | Custom `div` met border-radius |
| Tabs in sheets | `Tabs/TabList/Tab/TabPanel` van design system | Custom tab buttons met state |
| Progress bars | `Progress` van design system | Custom `div` met width% |
| File upload | `FileUpload` van design system | Custom `<input type="file">` |
| Loading states | `Spinner` van design system | Custom CSS spinners |
| Sheet component | `NavigationSheet` (app-level) | Custom modals of portals |
| Kleuren | CSS variables (`--color-*`, `--bg-*`, `--text-*`) | Hardcoded `#hex` of `rgb()` |
| Spacing | CSS variables (`--space-*`, `var(--radius-*)`) | Magic pixel numbers |

### Hergebruik patronen (DRY)

| Pattern | Bron | Hergebruikt door |
|---------|------|-----------------|
| `useMatchSheet` hook | Geëxtract uit ActiveMatchCard (H2) | ActiveMatchCard, UpcomingMatchesCard |
| `MatchSheet` component | Geëxtract uit ActiveMatchCard (H2) | ActiveMatchCard, UpcomingMatchesCard |
| `CreditsSheetContent` | `pages/config/CreditsSheetContent.tsx` (N1) | ProfileHubPage, CreditsTrendCard |
| `teamreel:open-quick-create` event | MobileBottomNav (C3) | ActiveMatchCard, SmartActionsCard |
| `teamreel:open-match-sheet` event | **Nieuw** (H3) | SmartActionsCard |
| `ReadinessRing` component | **Nieuw** (H4) | ActiveMatchCard, UpcomingMatchesCard |
| `useMatchDayMode` hook | **Nieuw** (H4) | DashboardPage, SmartActionsCard |

### Anti-patterns (vermijden)

1. **Geen inline styles in sheets** — AIQueueCard sheet used inline styles. Alle nieuwe sheets → CSS modules
2. **Geen `navigate()` vanuit dashboard** — alles via events + sheets (na H1-H3)
3. **Geen dubbele data fetching** — TanStack Query deduplicatie via `queryKeys`
4. **Geen 3-deep sheet stacking** — max 2: card → sheet → child sheet
5. **Geen component props drilling >2 niveaus** — gebruik hooks of context
6. **Geen lazy imports zonder Suspense fallback** — altijd Spinner
