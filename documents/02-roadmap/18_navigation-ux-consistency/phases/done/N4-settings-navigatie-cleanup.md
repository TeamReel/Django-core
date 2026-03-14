# N4 — Settings Navigatie Cleanup

> **Status:** ✅ Klaar
> **Datum:** 2026-03-13

## Probleem

Losse pagina's die beter als redirect of inline content zouden werken:
- **SettingsLandingPage** (`/settings`): Preferences tile linkte naar `/preferences?tab=profile` (nu verouderd)
- **BillingPage** (`/billing`): Puur placeholder — aparte pagina niet nodig

## Wijzigingen

### 1. SettingsLandingPage Preferences link → `/profile`
Tile wijst nu naar `/profile` ipv `/preferences?tab=profile` (consistent met N2).

### 2. `/billing` → redirect naar `/profile`
Placeholder content niet waard als aparte pagina. BillingPage code blijft intact in codebase maar is niet meer bereikbaar via navigatie. BillingPage import verwijderd uit `appRouteGroups.tsx`.

## Bestanden
- `demo/src/pages/SettingsLandingPage.tsx` — Preferences tile path
- `demo/src/appRouteGroups.tsx` — `/billing` route redirect + BillingPage import verwijderd
