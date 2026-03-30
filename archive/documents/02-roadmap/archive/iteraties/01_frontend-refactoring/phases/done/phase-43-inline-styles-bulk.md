# Phase 43 — Inline Styles: Bulk Sweep

**Track:** E3+E4 (Inline Style Elimination)
**Status:** 📋 Planned
**Geschatte inline styles:** ~2400 (alles wat over is)

## Aanpak

1. Bestanden met <20 inline styles in bulk aanpakken (E3: ~600)
2. Overige bestanden (E4: ~1800)
3. Scripted approach: zoek/vervang patronen voor veelvoorkomende inline styles
4. Handmatige review voor complexe gevallen

## Checklist

- [ ] Bestanden met <20 inline styles geconverteerd
- [ ] Overige bestanden geconverteerd
- [ ] `style={{}}` count = **0** (of <10 met goede reden)
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
