# H5 — Polish & Consistency Pass

> **Status:** ✅ Voltooid
> **Geschatte effort:** 2-3 uur
> **Geschatte omvang:** ~100 regels gewijzigd (verspreid over veel bestanden)

## Doel

Alle dashboard componenten consistent maken met profileHubPage patterns, design system tokens, en accessibility standaarden. Geen nieuwe functionaliteit — alleen kwaliteit.

## Consistency checklist

### 1. Lazy-loading voor zware sheet content

Alle sheets met >100 regels content → `React.lazy()` + `Suspense` met `Spinner` fallback.

**Huidige staat na H0-H4:**

| Sheet | Content LOC | Lazy-load nodig? |
|-------|------------:|:----------------:|
| MatchSheet | ~150 | ✅ Ja |
| ContentProgressSheet (tabs) | ~200 | ✅ Ja |
| TeamReadinessSheet (tabs) | ~200 | ✅ Ja |
| CreditsSheet | Al lazy (hergebruik) | ✅ Al gedaan |
| SquadSheet | ~80 | ❌ Nee (light) |
| AIQueueSheet | ~60 | ❌ Nee (light) |
| UploadSheet | ~80 | ❌ Nee (light) |

**Pattern (consistent met ProfileHubPage):**
```tsx
import { lazy, Suspense } from 'react';
import { Spinner } from '@django-core/design-system';

const MatchSheetContent = lazy(() =>
  import('./MatchSheetContent').then(m => ({ default: m.MatchSheetContent }))
);

// In render:
<NavigationSheet isOpen={open} onClose={close} title="...">
  <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}><Spinner size="md" /></div>}>
    <MatchSheetContent match={match} {...props} />
  </Suspense>
</NavigationSheet>
```

### 2. Accessibility (WCAG 2.1 AA)

**Alle cards:**
- [ ] `role="button"` op tappable cards
- [ ] `tabIndex={0}` voor keyboard navigatie
- [ ] `onKeyDown` handler: Enter/Space → open sheet
- [ ] `aria-expanded={sheetOpen}` op card wanneer sheet open is
- [ ] `aria-haspopup="dialog"` op card (verwijst naar sheet)

**Alle sheets (al grotendeels via NavigationSheet):**
- [ ] `role="dialog"` ✅ (al in NavigationSheet)
- [ ] `aria-modal="true"` ✅ (al in NavigationSheet)
- [ ] `aria-label={title}` ✅ (al in NavigationSheet)
- [ ] Focus trap ✅ (al in NavigationSheet)
- [ ] Escape key ✅ (al in NavigationSheet)

**ReadinessRing:**
- [ ] `role="progressbar"` op SVG
- [ ] `aria-valuenow={percent}`
- [ ] `aria-valuemin={0}` / `aria-valuemax={100}`
- [ ] `aria-label="Wedstrijd gereedheid: X%"`

**Countdown timer:**
- [ ] `aria-live="polite"` op countdown element (update elke minuut)
- [ ] `aria-label="Aftelling tot wedstrijd"` op countdown badge

### 3. Card tap feedback

Consistent tactile feedback op alle tappable cards:

```css
/* Shared card interaction — toevoegen aan alle dashboard card classes */
.card[role="button"] {
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.card[role="button"]:active {
  transform: scale(0.98);
}

.card[role="button"]:hover {
  box-shadow: var(--shadow-sm);
}

.card[role="button"]:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .card[role="button"] {
    transition: none;
  }
  .card[role="button"]:active {
    transform: none;
  }
}
```

**Toepassen op:** ActiveMatchCard, ContentProgressCard, TeamReadinessCard, UpcomingMatchesCard match items, SmartActionsCard action items, StatusStrip mini-cards.

### 4. Sheet stacking consistentie

**Regel:** Max 2 diep (card → sheet → child sheet). Nooit 3 diep.

Verifiëren na H0-H4:

| Stack | Diepte | OK? |
|-------|:------:|:---:|
| ActiveMatch → MatchSheet → LineupSheet | 2 | ✅ |
| ActiveMatch → MatchSheet → CreateWizard (event) | 1 + wizard | ✅ (apart venster) |
| UpcomingMatch → MatchSheet → LineupSheet | 2 | ✅ |
| ContentProgress → ContentProgressSheet | 1 | ✅ |
| TeamReadiness → TeamReadinessSheet | 1 | ✅ |
| SmartActions → UploadSheet | 1 | ✅ |
| SmartActions → CreateWizard (event) | 0 + wizard | ✅ (apart venster) |
| Squad → SquadSheet | 1 | ✅ |
| Credits → CreditsSheet | 1 | ✅ |
| AIQueue → AIQueueSheet | 1 | ✅ |

**Geen 3-diep stacks.** ✅

### 5. StatusStrip consistent styling

Alle mini-cards in de StatusStrip (Squad, AI Queue, Credits, Org) moeten exact dezelfde afmetingen:

```css
.summaryCard {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  min-height: 72px;
  /* Tap feedback (see section 3) */
}

.cardIcon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cardValue {
  font-size: var(--font-size-lg);
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-primary);
}

.cardLabel {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  line-height: 1.2;
}
```

### 6. Dark mode audit

**Checklist:** Geen hardcoded kleuren in nieuwe H0-H4 components.

| Token | Light | Dark | Gebruik |
|-------|-------|------|---------|
| `--bg-primary` | #fff | #1a1a2e | Card backgrounds |
| `--bg-secondary` | #f5f5f5 | #252540 | Sheet stat blocks, alternate rows |
| `--text-primary` | #1a1a2e | #f5f5f5 | Headings, values |
| `--text-secondary` | #666 | #999 | Labels, subtitles |
| `--border-primary` | #e0e0e0 | #333 | Card borders, dividers |
| `--color-amber-400` | #fbbf24 | #fbbf24 | Match-day accent, readiness orange |
| `--color-green-500` | #22c55e | #22c55e | Readiness good |
| `--color-red-500` | #ef4444 | #ef4444 | Readiness poor, alerts |

**Regel:** Als een kleur niet in de bovenstaande lijst staat en het is een `#hex` of `rgb()` → vervangen door CSS variable.

### 7. Mobile overflow check

- [ ] Alle cards: `overflow: hidden` of `overflow-x: hidden`
- [ ] Geen horizontale scroll op het dashboard
- [ ] StatusStrip: `flex-wrap: wrap` op small screens (niet overflow-x scroll)
- [ ] Text truncation via `text-overflow: ellipsis` op match titles, member names

## Bestanden

Verspreid over alle dashboard componenten:

| Bestand | Wijziging |
|---------|-----------|
| `demo/src/components/dashboard/*.tsx` | aria attributen, role, tabIndex, onKeyDown |
| `demo/src/components/dashboard/*.module.css` | tap feedback, focus-visible, reduced-motion |
| `demo/src/components/dashboard/ReadinessRing.tsx` | `role="progressbar"` + aria-value* |
| `demo/src/components/dashboard/MatchSheet.tsx` | Lazy-load content |
| `demo/src/components/dashboard/ContentProgressCard.tsx` | Lazy-load tab content |
| `demo/src/components/dashboard/TeamReadinessCard.tsx` | Lazy-load tab content |
| `demo/src/pages/DashboardPage.tsx` | `aria-live="polite"` op countdown |
| `demo/src/pages/DashboardPage.module.css` | Dark mode audit + tap feedback shared |
| `demo/src/components/dashboard/DashboardSummaries.module.css` | StatusStrip consistency |

## Afhankelijkheden

- **H0-H4 moeten eerst allemaal af** — polish is de laatste stap

## Test protocol

### Handmatig testen

1. **Tab navigatie:** Tab door alle dashboard cards → alle focussable, focus ring zichtbaar
2. **Enter/Space:** Open sheet via keyboard op elke card
3. **Sheet Escape:** Druk Escape → sheet sluit
4. **Dark mode:** Toggle theme → geen gebroken kleuren
5. **Reduced motion:** Enable `prefers-reduced-motion: reduce` → geen animaties
6. **Mobile (375px):** Geen horizontale scroll, alle cards single column
7. **Screen reader:** VoiceOver/NVDA → correcte announce van readiness percentage + countdown

### Vite build check

```bash
cd demo && pnpm build
```

Moet slagen zonder TypeScript errors of warnings.

## Acceptatiecriteria

- [ ] Alle heavy sheets lazy-loaded met Suspense + Spinner
- [ ] Alle tappable cards: `role="button"`, `tabIndex={0}`, keyboard handlers
- [ ] Alle cards: `aria-expanded`, `aria-haspopup="dialog"`
- [ ] ReadinessRing: `role="progressbar"` + aria-value attributen
- [ ] Countdown: `aria-live="polite"`
- [ ] Card tap feedback: scale(0.98) op :active, shadow op :hover, focus ring op :focus-visible
- [ ] `prefers-reduced-motion` gerespecteerd op alle animaties
- [ ] Sheet stacking: max 2 diep, geen uitzonderingen
- [ ] StatusStrip: consistent 72px height, token-based spacing
- [ ] Dark mode: 0 hardcoded kleuren in nieuwe components
- [ ] Mobile: 0 horizontale overflow
- [ ] Vite build succesvol, 0 TypeScript errors
