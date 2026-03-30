# H1 — Signals + Auto-update

> **Effort:** ~2 uur | **Impact:** Readiness scores en streaks updaten automatisch bij content creatie

## Doel

Signal handlers die MatchReadiness en TeamStreak automatisch bijwerken wanneer content wordt aangemaakt of een match wordt afgesloten.

## To do

- [ ] Signal handler: `post_save` op `ContentItem` (status → completed)
  - Zoek bijbehorende match (via `activity` FK op content of media)
  - Haal `ReadinessConfig` op voor het team (of gebruik defaults)
  - Tel voltooide content types voor die match
  - Update of create `MatchReadiness` record met nieuwe score
- [ ] Signal handler: `post_save` op `MediaItem` (state → processed)
  - Zelfde logica als ContentItem signal
  - Check `extraction_metadata.asset_type` tegen required types
- [ ] Streak evaluatie functie:
  - Trigger: wanneer MatchReadiness score verandert
  - Logica: tel opeenvolgende matches (nieuwste eerst) met score = 100%
  - Update `TeamStreak.current_streak` en `longest_streak`
- [ ] Achievement check pipeline:
  - Na elke MatchReadiness of TeamStreak update
  - Check alle actieve achievements tegen huidige state
  - Bij threshold bereikt: create `AchievementUnlock` + trigger notificatie
- [ ] Notification dispatch bij achievement unlock (B17 integratie):
  - `contextual_notifications` aanroepen met achievement details
  - Activity feed event loggen (B62 integratie)
- [ ] Helper functie: `recalculate_match_readiness(match, team)` — voor handmatige herberekening

## Done criteria

- [ ] Content aanmaken voor een match updatet MatchReadiness score automatisch
- [ ] Streak wordt bijgewerkt wanneer een match 100% readiness bereikt
- [ ] Achievement unlock genereert notificatie
- [ ] Activity feed event wordt gelogd bij achievement unlock
- [ ] Geen N+1 queries in signals (gebruik `select_related`)
- [ ] Unit tests voor elke signal handler
