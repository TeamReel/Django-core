# N2 — Desktop/Mobile Profile Unificatie

> **Status:** ✅ Klaar
> **Datum:** 2026-03-13

## Probleem

Desktop en mobile hadden twee compleet verschillende profile-ervaringen:
- **Mobile** bottom nav → `/profile` (ProfileHubPage) — iOS Settings-style, alles inline
- **Desktop** avatar dropdown → `/preferences?tab=profile` (PreferencesPage) — tabbed layout met PageHeader

## Oplossing

ProfileHubPage als single source of truth voor alle gebruikers:

### 1. Avatar dropdown → `/profile`
`ProfileAvatarDropdown.tsx` — alle drie menu items wijzen nu naar `/profile`:
- "My Profile" → `/profile`
- "Preferences" → `/profile`
- "Credits" → `/profile`

### 2. `/preferences` → redirect naar `/profile`
`appRouteGroups.tsx` — `<Navigate to="/profile" replace />` ipv `<PreferencesPage />`

## Impact
- **Consistentie:** Eén profile-ervaring voor desktop + mobile
- **PreferencesPage code intact:** Lazy import blijft in `appLazyImports.ts` maar is niet meer bereikbaar via navigatie
- **Geen verlies:** ProfileHubPage bevat dezelfde functionaliteit (theme, taal, timezone, profiel edit, avatar, wachtwoord, credits sheet, notifications sheet, memberships sheet)
- **Audit tab / Notification Channels** (alleen in PreferencesPage): Admin-level detail, later via admin hub bereikbaar

## Bestanden
- `demo/src/components/ProfileAvatarDropdown.tsx` — 3 navigatie-links geüpdatet
- `demo/src/appRouteGroups.tsx` — `/preferences` route → redirect, PreferencesPage import verwijderd
