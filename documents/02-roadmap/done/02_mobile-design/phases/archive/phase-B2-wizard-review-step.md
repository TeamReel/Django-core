# Phase B2 — Wizard Review Step

**Track:** B (Wizard Polish)
**Status:** 📋 Planned

## Doel

Review-stap toevoegen aan MatchWizard vóór generatie. Grotere preview + samenvatting van keuzes. Voorkomt "generate spijt" — gebruiker ziet wat er gegenereerd wordt.

## Huidige flow

```
Stap 1: Match selectie → Stap 2: Content type → Stap 3: Lineup → Generate (direct)
```

## Gewenste flow

```
Stap 1: Match selectie → Stap 2: Content type → Stap 3: Lineup → Stap 4: Review → Generate
```

## Review-stap bevat

| Sectie | Wat tonen |
|--------|----------|
| **Match** | Tegenstander, datum, tijd, competitie |
| **Content type** | Naam + thumbnail (groter: 120×160) |
| **Lineup** | Opgestelde spelers (als relevant) |
| **Template** | Welk template gebruikt wordt |
| **Geschatte kosten** | Credits die het kost |
| **Generate knop** | Groot, prominent, onderaan |
| **Terug knop** | "Aanpassen" om terug te gaan |

## Taken

- [ ] Nieuwe wizard stap 4: ReviewStep component
- [ ] Samenvatting van alle eerdere keuzes
- [ ] Grotere content preview (template thumbnail 120×160)
- [ ] Credits kosten inschatting tonen
- [ ] "Genereer" CTA knop (primary, full-width op mobile)
- [ ] "Aanpassen" link om terug te gaan
- [ ] MatchWizard: stappen-count van 3 → 4

## Checklist

- [ ] ReviewStep component gebouwd
- [ ] Alle keuzes samengevat
- [ ] Preview thumbnail getoond
- [ ] Credits kosten zichtbaar
- [ ] Flow getest: match → type → lineup → review → generate
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
