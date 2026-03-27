# Phase N1 — Bottom Nav Routing Audit

**Track:** N (Navigation)
**Layer:** 2 — Navigation
**Status:** Todo
**Depends on:** P1–P5 (pages moeten responsive zijn)

## Doel

Bottom nav tabs auditen en fixen: edge cases (geen actieve match/season), fallback routes, tab highlight logica.

## Taken

- [ ] Audit 5 tabs: klopt `isActive()` logica voor alle routes?
- [ ] Edge case: geen actieve match → Match tab fallback
- [ ] Edge case: geen actieve season → Season tab fallback
- [ ] Gallery tab: `/studio` route → kloppen sub-routes?
- [ ] Home tab: highlight bij `/recents`, `/favorites`?
- [ ] Tab transition: haptic feedback bij tap
- [ ] Badge op tab (optioneel): unread count op Gallery?

## Checklist

- [ ] Alle 5 tabs navigeren correct
- [ ] Edge cases afgehandeld (geen data → graceful fallback)
- [ ] `isActive()` consistent met alle route-patronen
- [ ] `npx tsc --noEmit` — pass
- [ ] Gecommit + pushed
