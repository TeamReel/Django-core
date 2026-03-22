# H4 — MatchSummarySheet: wedstrijd-preview in NavigationSheet

> **Effort:** ~3 uur | **Impact:** Wedstrijd-tap blijft op de hub — iOS-consistent met Homepage MatchSheet + NavigationSheet infra-upgrade

## Doel

Wanneer een gebruiker op een wedstrijd tapt (in Wedstrijden-tab of Overview), opent een `NavigationSheet` met een compacte wedstrijd-preview. De gebruiker blijft op de hub en kan optioneel doorklikken naar de volledige MatchDetailPage.

## Patroon

Consistent met bestaande patterns:
- **Homepage**: `MatchSheet` (NavigationSheet) — card tap opent match detail in sheet
- **Profiel**: `ProfileSheet` (NavigationSheet) — row tap opent content in sheet
- **Beide**: mobiel = full-screen slide-up, desktop = side-panel van rechts

## NavigationSheet infra-upgrade (cross-cutting)

Deze fase voegt drie premium features toe aan `NavigationSheet` zelf — geldt daarna voor **alle** sheets in de app (MatchSummarySheet, MemberSummarySheet, en bestaande Homepage/Profiel sheets).

### 1. Browser back = sheet sluiten

Huidige staat: **geen enkele sheet** in de codebase gebruikt history state. Browser-back navigeert weg van de pagina terwijl een sheet open is.

Fix in `NavigationSheet.tsx`:
```tsx
useEffect(() => {
  if (!isOpen) return;
  // Push dummy state zodat back-button de sheet sluit
  window.history.pushState({ sheet: true }, '');
  const handlePopState = () => onClose();
  window.addEventListener('popstate', handlePopState);
  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}, [isOpen, onClose]);
```

Consistent patroon: `MobileFilterSheet` sluit ook via overlay-click en escape — history state is de browser-back equivalent.

### 2. Haptic feedback bij sheet open

Huidige staat: `useHapticFeedback` bestaat al, alleen gebruikt in `MobileBottomNav` (light) en `MobileFilterSheet` (medium bij swipe-drempel).

Fix in `NavigationSheet.tsx`:
```tsx
const haptic = useHapticFeedback();
useEffect(() => {
  if (isOpen) haptic.light(); // Subtiele tap bij openen
}, [isOpen]);
```

### 3. Swipe-to-dismiss (mobiel)

Huidige staat: `MobileFilterSheet` heeft swipe-to-dismiss (100px drag drempel + `haptic.medium()`). `NavigationSheet` mist dit.

Fix in `NavigationSheet.tsx` — zelfde patroon als `MobileFilterSheet`:
- Touch event handlers op de sheet header (drag handle area)
- `translateY(dragY)` transform tijdens drag
- Bij >100px drag: `haptic.medium()` + `onClose()`
- Bij <100px: spring terug (snap back)
- Alleen op mobiel (<640px viewport)

---

## Nieuw component: `MatchSummarySheet`

Locatie: `demo/src/pages/identity/MatchSummarySheet.tsx` + `.module.css`

### Props

```tsx
interface MatchSummarySheetProps {
  match: MatchRecord | null;
  isOpen: boolean;
  onClose: () => void;
  matchDisplayTitle: (m: MatchRecord) => string;
  matchDetailPath: string;    // voor "Ga naar wedstrijd" link
  isAdmin?: boolean;          // toon admin-acties
}
```

### Content layout

```
+----------------------------------+
|  [<] Wedstrijd                   |  <-- NavigationSheet header
+----------------------------------+
|                                  |
|       [Home logo]  [Away logo]   |  <-- Team crests (als beschikbaar)
|     ASC Helden 6  vs  RKC 3     |  <-- Team namen
|            2 - 1                 |  <-- Score (als gespeeld)
|          AFGELOPEN               |  <-- Status badge
|                                  |
+- INFO --------------------------+
| [Calendar]  Za 22 mrt 14:00     |
| [MapPin]    Sportpark Zuid       |
| [Trophy]    Competitie naam     |
+----------------------------------+
|                                  |
|  [ Ga naar wedstrijd        > ] |  <-- Primary action → navigate
|                                  |
+----------------------------------+
```

### Data

Alles uit bestaande `MatchRecord`:
- `matchDisplayTitle(m)` — tegenstander naam
- `m.start_time` / `m.date` / `m.metadata.date` — datum
- `m.metadata.venue` — locatie
- `m.metadata.score_home` / `m.metadata.score_away` — score
- `m.metadata.status` — status (scheduled/finished/live)
- `m.period?.name` — competitienaam
- Team logos: niet in scope (later uitbreidbaar als brand profile crest data beschikbaar is)

### Gedrag

- Sheet opent met `NavigationSheet` animatie (slide-up / slide-in)
- "Ga naar wedstrijd" knop → `navigate(matchDetailPath)` + `onClose()`
- Escape / overlay click / drag = sluiten
- Als `match === null` → sheet toont niets

## Checklist

### NavigationSheet infra-upgrade
- [x] History state: `pushState` bij open, `popstate` listener sluit sheet
- [x] Haptic feedback: `haptic.light()` bij sheet open
- [x] Swipe-to-dismiss: touch drag op mobiel, 100px drempel, `haptic.medium()` bij dismiss
- [x] Swipe alleen op mobiel (<640px), niet op desktop
- [x] Verifieer: bestaande sheets (Homepage MatchSheetFlow, Profile) blijven werken

### MatchSummarySheet component
- [x] `MatchSummarySheet` component aanmaken
- [x] CSS module met design tokens
- [x] Score hero met status badge
- [x] Info sectie met datum, locatie, competitie
- [x] "Ga naar wedstrijd" primary action knop
- [x] Toon "nog niet gespeeld" state als geen score
- [x] `NavigationSheet` wrapping met `isOpen`/`onClose`
- [x] TypeScript strict, geen `any`
- [x] Touch targets >= 44x44px
- [x] `:focus-visible` op interactieve elementen
