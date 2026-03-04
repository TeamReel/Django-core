# Phase C3 — Match Content Grid

**Track:** C (Page Refinement)
**Status:** 📋 Planned

## Doel

Match detail pagina toont een grid van alle gegenereerde content (thumbnails). Visueel overzicht van wat al gemaakt is voor deze match.

## Taken

- [ ] Content grid section op match detail pagina
- [ ] Thumbnails laden vanuit GenerationJob results
- [ ] Grid layout: 3 kolommen op mobile, 4-5 op desktop
- [ ] Klik op thumbnail → content detail pagina
- [ ] Empty state: "Nog geen content. Maak je eerste match-flyer →" (SmartEmptyState)
- [ ] Status badges op thumbnails: pending/approved/rejected
- [ ] "Content maken" FAB of knop als er al content is

## Checklist

- [ ] Content grid gebouwd
- [ ] Thumbnails laden correct
- [ ] Responsive grid
- [ ] Klik navigeert naar detail
- [ ] Empty state met CTA
- [ ] Status badges
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
