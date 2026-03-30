# H1 — Content Pipeline Indicator

> **Status:** ✅ Done
> **Commit:** `2270ca41`

## Wat is gedaan

### ContentPipelineCard (nieuw component)
- Horizontale 3-staps pipeline: In productie → Te reviewen → Goedgekeurd
- Gebruikt `useQueueCounts()` — geen extra API calls
- Elke stap klikbaar → navigeert naar `/content?tab=${tab}`
- Pulse-animatie op review-stap wanneer items wachten
- Returnt `null` als geen content-activiteit (graceful degradation)
- "Alles" knop linkt naar `/content`

### Integratie in DashboardPage
- Geplaatst na UpcomingMatchesCard, voor summaryGrid

## Bestanden
- `demo/src/components/dashboard/ContentPipelineCard.tsx` (nieuw)
- `demo/src/components/dashboard/ContentPipelineCard.module.css` (nieuw)
- `demo/src/components/dashboard/index.ts` (export toegevoegd)
- `demo/src/pages/DashboardPage.tsx` (import + JSX)
