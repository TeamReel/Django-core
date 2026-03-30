# 343 — F31 Member Summary Sheet Refactor

| | |
|---|---|
| Status | ✅ DONE |
| Type | Refactor |
| Bron | Code Review `855098c8` |
| Impact | 🟡 important |
| Effort | ~2,5 uur |
| Lagen | Frontend (types, TSX, CSS) + Backend (API sync) |

## Context

Na de 6 fixes aan MemberSummarySheet (commits `76b1d64a` t/m `855098c8`) is het component functioneel correct maar heeft technische schuld opgebouwd:

- TSX 643 regels (richtlijn: max 500)
- CSS 416 regels (richtlijn: max 150)
- Losse typering voor `avatar_url` (via `Record<string, unknown>` cast)
- `media.profile.url` en `User.avatar` zijn twee losse bronnen voor dezelfde data
- `object-position: top` geldt voor alle thumbnails (suboptimaal voor close-ups)

## Design beslissingen

| Beslissing | Keuze | Waarom |
|-----------|-------|--------|
| Type fix avatar_url | Extend `SquadMember.user` interface | Elimineert unsafe casts, API levert dit veld al |
| Helper extractie | Nieuw bestand `memberAssetHelpers.ts` | Houdt component shell clean, helpers zijn puur/testbaar |
| CSS split | Sub-modules per section | Past bij bestaande conventie (.module.css per component) |
| Backend sync | Signal op `User.avatar` save | Eénmalige sync, geen dubbele bron meer nodig |
| object-position | CSS class per asset type | Fullbody: top, close-up: center, rest: center |

## Fasering

| Fase | Naam | Bestanden | Effort |
|------|------|-----------|--------|
| H0 | Type-safety & quick wins | `squadTabTypes.ts`, `MemberSummarySheet.tsx`, `.module.css` | ~30 min |
| H1 | Component opsplitsen | Nieuw: `memberAssetHelpers.ts`, CSS refactor | ~1 uur |
| H2 | Backend avatar sync | `src/accounts/`, `src/projects/` | ~1 uur |

## Acceptatiecriteria

- [ ] `avatar_url` is getypt in `SquadMember.user` — geen `Record<string, unknown>` casts
- [ ] TSX < 500 regels (helpers in apart bestand)
- [ ] CSS < 200 regels per module
- [ ] `object-position` verschilt per asset type (fullbody: top, rest: center)
- [ ] Bij avatar upload wordt `media.profile.url` in membership metadata gesynchroniseerd
- [ ] `npx tsc --noEmit` clean
- [ ] Bestaande functionaliteit ongewijzigd (geen regressies)

## Risico's

- Backend sync raakt membership metadata JSONB — zorgvuldig testen met bestaande data
- CSS split kan specificity issues veroorzaken — test dark mode + mobile
