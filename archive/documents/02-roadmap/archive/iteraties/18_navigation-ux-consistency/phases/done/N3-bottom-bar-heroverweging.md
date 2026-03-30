# N3 — Bottom Bar Heroverweging

> **Status:** ✅ Klaar
> **Datum:** 2026-03-13

## Probleem

Bottom bar had verwarrende/inconsistente labels:
- **"Season"** tab: Dynamisch label (wisselde tussen "Team" en "Season"), verwarrend zonder context, fallback naar dashboard
- **"Gallery"** tab: Navigeert naar `/studio` — naamgeving mismatch

## Layout: voor → na

```
VOOR: [ Home ] [ Season/Team ] [ +Create ] [ Gallery ] [ Profile ]
NA:   [ Home ] [ My Team     ] [ +Create ] [ Studio  ] [ Profile ]
```

## Wijzigingen

### 1. "Gallery" → "Studio"
Label klopt nu met de route (`/studio`) en de feature naam (AI Studio).

### 2. "Season/Team" → "My Team" (stabiel label)
- Verwijderd: dynamische label-logica (`isOnTeamPage ? 'Team' : 'Season'`)
- Nu altijd "My Team" — duidelijk voor de gebruiker

### 3. Betere fallback bij geen team
- **Voorheen:** Geen team geselecteerd → navigeert naar dashboard (nutteloos, Home doet hetzelfde)
- **Nu:** Geen team geselecteerd → `/directory?tab=clubs` (helpt gebruiker een team te kiezen)
- `isActive` voor Home-tab: `/directory` verwijderd (nu onderdeel van My Team-tab)

## Bestanden
- `demo/src/components/MobileBottomNav.tsx` — label rename, fallback path, isActive logic
