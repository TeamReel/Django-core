# Phase 27 — Package Cleanup

**Track:** G (Package Cleanup)
**Status:** 📋 Planned
**Effort:** ~1 sessie (3 kleine taken)

## Doel

getCsrfToken consolidatie, ThemeProvider dedup, en 3 ongebruikte packages archiveren.

---

## Taak 1: getCsrfToken() consolidatie (~30 min)

**Focus:** `@django-core/api-client` (295 regels)

Demo heeft 5+ gekopieerde `getCsrfToken()` functies in `adapters/`.

- [ ] Zoek alle `getCsrfToken` definities in `demo/src/adapters/`
- [ ] Vervang door import uit `@django-core/api-client`
- [ ] Adopteer `normalizeError()` als gedeelde error handler
- [ ] Test dat API calls nog werken

## Taak 2: ThemeProvider deduplicatie (~30 min)

**Focus:** `@django-core/design-system` vs `@django-core/theme-system`

Demo gebruikt theme-system's ThemeProvider. DS exporteert er ook een (ongebruikt).

- [ ] Verwijder of depreceer DS ThemeProvider export
- [ ] Documenteer dat `@django-core/theme-system` de enige ThemeProvider is

## Taak 3: Archiveer ongebruikte packages (~15 min)

| Package | Actie |
|---------|-------|
| `@django-core/notifications-hub` | `mv packages/notifications-hub archive/packages/` |
| `@django-core/permissions` | `mv packages/permissions archive/packages/` |
| `@django-core/resource-alerts` | `mv packages/resource-display-alerts archive/packages/` |

- [ ] Verplaats 3 packages naar `archive/packages/`
- [ ] Verwijder dependencies uit `demo/package.json`
- [ ] Verwijder uitgecommentarieerde import in `main.tsx`
- [ ] Verwijder `Toast` import uit archive page (`TemplatesPage.tsx`)
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
