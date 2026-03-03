# Phase 42 — Inline Styles: Volgende 10 Bestanden

**Track:** E2 (Inline Style Elimination)
**Status:** 📋 Planned
**Geschatte inline styles:** ~400

## Aanpak

1. Sorteer resterende bestanden op aantal inline styles (hoog → laag)
2. Pak de top 10 aan
3. Dezelfde methode als Phase 41: utility classes, CSS Modules, primitive props

## Checklist

- [ ] Top 10 bestanden geïdentificeerd
- [ ] Per bestand: inline styles → className/primitives
- [ ] ~400 inline styles verwijderd
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
