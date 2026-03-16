# D0 — Lineup Sheet + Back Navigatie

> **Status:** ✅ Klaar
> **Datum:** 2026-03-14

## Doel

Inline opstelling bewerken vanuit het dashboard via een iOS-style stacked sheet, plus universele `‹ Vorige` back-navigatie voor child sheets.

## Probleem

De "Opstelling" knop in de MatchSheet navigeerde weg naar de match detail pagina. Gebruiker verliest dashboard-context voor een eenvoudige actie (lineup invullen). Bovendien had NavigationSheet geen back-navigatie — alleen een × close button.

## Oplossing

### 1. `useLineupSheet.ts` (144 regels) — Standalone hook

Eigen data layer, onafhankelijk van de match detail page orchestrator:
- Fetch squad via `/projects/{id}/members/`
- Load bestaande lineup uit `match.metadata.lineup`
- Save lineup via PATCH `/activities/{id}/`
- Managed state: formation, slots, squad, benchStatus, saving/success

### 2. `LineupSheet.tsx` (55 regels) — Sheet wrapper

- Lazy-load `MatchLineupTab` via `React.lazy()` (code splitting)
- `Suspense` fallback met loading indicator
- `onBack` prop → doorgifte naar NavigationSheet

### 3. NavigationSheet `onBack` prop

Universeel iOS-patroon voor child sheets:

| Sheet | Links | Rechts |
|-------|-------|--------|
| Root sheet | — | × Close |
| Child sheet | ‹ Vorige | (verborgen, layout behouden) |

CSS: `.backButton` met `var(--app-primary)` kleur, touch feedback, hover state.

### 4. ActiveMatchCard integratie

- `lineupSheetOpen` state
- Opstelling knop: close MatchSheet → open LineupSheet
- LineupSheet `onBack`: close LineupSheet → open MatchSheet

### 5. Media knop verwijderd

Er is geen match-level media tab. De "Content" knop dekt alles (gegenereerde assets per subtype). Media knop verwijderd om verwarring te voorkomen.

## Gewijzigde bestanden

| Bestand | Wijziging |
|---------|-----------|
| `demo/src/components/dashboard/useLineupSheet.ts` | **Nieuw** — standalone lineup hook |
| `demo/src/components/dashboard/LineupSheet.tsx` | **Nieuw** — NavigationSheet wrapper |
| `demo/src/components/dashboard/ActiveMatchCard.tsx` | LineupSheet state + wire, Media knop verwijderd |
| `demo/src/components/ui/NavigationSheet.tsx` | `onBack` prop + `ChevronLeft` import |
| `demo/src/components/ui/NavigationSheet.module.css` | `.backButton` styling |

## Commits

| Hash | Beschrijving |
|------|-------------|
| `22f24f0b` | LineupSheet component + ActiveMatchCard wiring |
| `75b9402c` | Fix: missing useLineupSheet.ts in commit |
| `1aa758f0` | NavigationSheet `onBack` prop + LineupSheet back navigatie |
| `8d8d6486` | Media knop verwijderd uit MatchSheet |

## Verificatie

- TypeScript: ✅ `tsc --noEmit` clean
- Build: ✅ `vite build` in 8.86s
- Railway: ✅ deployed
