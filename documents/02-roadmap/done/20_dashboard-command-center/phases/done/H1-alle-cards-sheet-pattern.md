# H1 — Alle Cards → Sheet Pattern

> **Status:** ✅ Voltooid
> **Geschatte effort:** 4-6 uur
> **Geschatte omvang:** ~300 regels gewijzigd

## Doel

Elke dashboard card die nu weg-navigeert omzetten naar inline NavigationSheet. Na deze fase: **0 cards die navigeren, alles opent als sheet**.

## Probleem

Na H0 zijn er nog 3 cards die `navigate()` gebruiken:
1. **SquadReadinessCard** → navigeert naar squad page
2. **CreditsTrendCard** → navigeert naar /credits
3. **SmartActionsCard** → navigeert naar diverse pagina's (volledige refactor in H3)

Plus de nieuwe **UpcomingMatchesCard** (H0 placeholder) die in H2 MatchSheet hergebruik krijgt.

## Conversies

### 1. SquadReadinessCard → Sheet

**Nu:** `onClick → navigate('/teams/{slug}/squad')`
**Straks:** `onClick → setSheetOpen(true)` → NavigationSheet met member overzicht

**Sheet inhoud:**
- Totaal selectie: "X spelers" badge
- Per member: avatar, naam, rol (keeper/speler/staf)
- Compact progress indicator per member (assets/content readiness)
- Footer: "Bekijk volledige selectie →" knop (navigeert naar squad voor diepere acties)

**Data:** Hergebruikt bestaande `useProjectMembers` hook — geen nieuwe API calls.

```tsx
// SquadReadinessCard — sheet pattern
const [sheetOpen, setSheetOpen] = useState(false);

// Card preview (bestaand, onClick wijzigt)
<div className={styles.summaryCard} onClick={() => setSheetOpen(true)}>
  {/* ... icon + count + label + chevron ... */}
</div>

// Sheet (nieuw)
<NavigationSheet
  isOpen={sheetOpen}
  onClose={() => setSheetOpen(false)}
  title="Selectie"
  icon={<Users size={18} />}
>
  {/* Member list met avatars + rollen */}
  {/* Footer: "Bekijk volledige selectie →" */}
</NavigationSheet>
```

**Rationale voor "Bekijk volledige selectie" link:** De squad page biedt CRUD-acties (verwijderen, rollen wijzigen) die te complex zijn voor een sheet. Sheet = read-only overzicht + quick actions. Navigatie als escape hatch voor power users.

### 2. CreditsTrendCard → Sheet (hergebruik CreditsSheetContent)

**Nu:** `onClick → navigate('/credits')`
**Straks:** `onClick → setSheetOpen(true)` → NavigationSheet met `CreditsSheetContent`

**Besluit:** Hergebruik `CreditsSheetContent` van ProfileHubPage. Bevat al:
- Scope switcher (personal/org wallet)
- Balance tab met recent transactions
- Transactions tab met filters
- Lazy-loaded via `React.lazy()` + `Suspense`

```tsx
import { lazy, Suspense } from 'react';

const CreditsSheetContent = lazy(() =>
  import('../../pages/config/CreditsSheetContent').then(m => ({ default: m.CreditsSheetContent }))
);

// In CreditsTrendCard:
<NavigationSheet
  isOpen={sheetOpen}
  onClose={() => setSheetOpen(false)}
  title="Credits"
  icon={<CreditCard size={18} />}
>
  <Suspense fallback={<Spinner size="md" />}>
    <CreditsSheetContent />
  </Suspense>
</NavigationSheet>
```

**DRY principe:** Geen duplicatie — exact dezelfde component als ProfileHubPage. Als CreditsSheetContent verbetert, profiteren beide locaties.

### 3. OrgStatsCard → StatusStrip integratie

**Nu:** Standalone tall card met navigatie naar org detail
**Straks:** Verwijderd. Key stats (teams count, matches count) integreren in de bestaande StatusStrip als 4e mini-card, alleen zichtbaar voor org-level admins.

```tsx
// In DashboardPage.tsx summaryGrid:
{isOrgLevel && !isTeamScope && <OrgOverviewMiniCard />}
```

De `OrgOverviewMiniCard` wordt een simpele versie in DashboardSummaries.tsx:
- Icon: TrendingUp
- Value: "{X} teams"
- Label: "Organisatie"
- Tap: opent NavigationSheet met org stats (clubs, teams, matches, leden grid)

### 4. SmartActionsCard → Stub (volledige conversie in H3)

In H1 alleen: `navigate()` vervangen door `() => {}` placeholder met console.warn. Volledige smart actions sheet-ificatie gebeurt in H3 met CreateWizard events en inline upload sheet.

## Consistent patroon (alle cards)

Na H1 volgt elke dashboard card dit exacte patroon:

```tsx
// 1. State
const [sheetOpen, setSheetOpen] = useState(false);

// 2. Card preview (compact, tappable)
<div className={styles.card} onClick={() => setSheetOpen(true)} role="button" tabIndex={0}>
  {/* Icon + value/title + chevron */}
</div>

// 3. Sheet (expanded detail)
<NavigationSheet
  isOpen={sheetOpen}
  onClose={() => setSheetOpen(false)}
  title="Card Titel"
  icon={<IconComponent size={18} />}
>
  {/* Detail content — lazy-loaded where heavy */}
</NavigationSheet>
```

**Geen uitzonderingen.** Elk card is een tap target → sheet.

## Design system alignment

| Component | Bron | Gebruik |
|-----------|------|---------|
| `NavigationSheet` | `demo/src/components/ui` | Alle sheets (consistent API) |
| `Spinner` | `@django-core/design-system` | Suspense fallback voor lazy-loaded content |
| `Badge` | `@django-core/design-system` | Count badges in sheets |
| CSS variables | `--bg-secondary`, `--text-*`, `--border-*` | Alle kleuren via tokens |

## Bestanden

| Bestand | Actie |
|---------|-------|
| `demo/src/components/dashboard/DashboardSummaries.tsx` | SquadReadinessCard + CreditsTrendCard: replace navigate → sheet |
| `demo/src/components/dashboard/DashboardSummaries.module.css` | Member list styling in SquadSheet |
| `demo/src/components/dashboard/SmartActionsCard.tsx` | Stub: disable navigate, placeholder handlers |
| `demo/src/pages/DashboardPage.tsx` | Remove OrgStatsCard standalone, add OrgOverviewMiniCard to summaryGrid |

## Afhankelijkheden

- **H0 moet eerst:** Layout restructurering + merged cards
- **CreditsSheetContent:** Bestaat al in `demo/src/pages/config/CreditsSheetContent.tsx` — alleen importeren
- **useProjectMembers:** Bestaande hook — geen nieuwe data layer nodig

## Acceptatiecriteria

- [ ] SquadReadinessCard opent NavigationSheet met member overzicht
- [ ] CreditsTrendCard opent NavigationSheet met CreditsSheetContent (hergebruikt van ProfileHubPage)
- [ ] OrgStatsCard verwijderd als standalone — key stat in StatusStrip mini-card
- [ ] SmartActionsCard: navigate uitgeschakeld (stub voor H3)
- [ ] **0 cards navigeren weg** — alles opent als sheet
- [ ] CreditsSheetContent is lazy-loaded met Suspense + Spinner fallback
- [ ] Squad sheet toont member lijst met avatars + rollen
- [ ] "Bekijk volledige selectie" link als escape hatch in squad sheet
- [ ] Alle sheets: NavigationSheet met title, icon, onClose
- [ ] TypeScript clean, Vite build succesvol
- [ ] Dark mode correct (CSS variables)
