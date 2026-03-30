# Phase B1 — Wizard Thumbnails

**Track:** B (Wizard Polish)
**Status:** 📋 Planned

## Doel

Content-type cards in de MatchWizard format-stap krijgen thumbnail previews. Gebruikers zien visueel wat ze gaan genereren voordat ze kiezen.

## Huidige situatie

- Stap 2 (content type keuze): alleen tekst labels + iconen
- Geen visuele preview van het eindresultaat
- Gebruiker moet "blind" kiezen

## Gewenste situatie

- Elke content-type card toont een thumbnail (48×64 of 64×64)
- Thumbnails komen van `ContentTemplate.preview_image` (server-side)
- Fallback: default icoon per type als geen preview beschikbaar
- Cards worden visueler: thumbnail links, titel + beschrijving rechts

## Taken

- [ ] Backend: check of `ContentTemplate` model `preview_image` field heeft
- [ ] API: preview_image URL meesturen in content templates endpoint
- [ ] MatchWizard stap 2: cards redesign met thumbnail slot
- [ ] Lazy loading voor thumbnails (below-fold)
- [ ] Fallback icoon per content type (intro, lineup, match-flyer, etc.)
- [ ] Responsive: thumbnails kleiner op mobile, groter op desktop

## Bestaande componenten

| Component | Locatie | Hergebruiken |
|-----------|---------|-------------|
| `MatchWizard` | `components/MatchWizard.tsx` | ✅ Stap 2 aanpassen |
| `ContentGenerationModal` | `pages/identity/ContentGenerationModal/` | ✅ Template data |
| `Skeleton` thumbnail variant | `components/Skeleton.tsx` | ✅ Loading state |

## Checklist

- [ ] Content template thumbnails beschikbaar via API
- [ ] Wizard cards tonen thumbnails
- [ ] Fallback iconen voor alle types
- [ ] Lazy loading werkend
- [ ] Responsive
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
