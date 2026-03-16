# H2 — Season Progress + Gamification

> **Status:** ✅ Done
> **Commit:** `2270ca41`

## Wat is gedaan

### NextStepCard (nieuw component)
- Context-aware suggestie bovenaan dashboard
- Prioriteitslogica:
  1. Items op review wachten → "Bekijk reviews" → `/approvals`
  2. Eerstvolgende wedstrijd zonder opstelling → "Invullen" → opent match-sheet
  3. Wedstrijd met <3 content items → "Content maken" → opent quick-create
  4. Alles goed → groene "Alles staat klaar! 🎉" card
- Gebruikt `useClosestMatch`, `useQueueCounts`
- Returnt `null` als geen project context

### SeasonProgressCard (nieuw component)
- Seizoensvoortgang met progress bar + statistieken
- Toont: gespeeld/totaal wedstrijden, content-items, aankomende wedstrijden
- Haalt data op via `/activities/` API + `useGenerativeRequests` + `useUpcomingMatches`
- Progress bar met percentage
- Returnt `null` als geen project of geen wedstrijden

### Integratie in DashboardPage
- NextStepCard: bovenaan mainCol (voor ActiveMatchCard)
- SeasonProgressCard: na ContentProgressCard, voor SmartActionsCard

## Bestanden
- `demo/src/components/dashboard/NextStepCard.tsx` (nieuw)
- `demo/src/components/dashboard/NextStepCard.module.css` (nieuw)
- `demo/src/components/dashboard/SeasonProgressCard.tsx` (nieuw)
- `demo/src/components/dashboard/SeasonProgressCard.module.css` (nieuw)
- `demo/src/components/dashboard/index.ts` (exports toegevoegd)
- `demo/src/pages/DashboardPage.tsx` (imports + JSX)
