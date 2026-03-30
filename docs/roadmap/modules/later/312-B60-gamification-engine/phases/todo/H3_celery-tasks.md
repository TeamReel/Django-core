# H3 — Celery Tasks

> **Effort:** ~1 uur | **Impact:** Dagelijkse herberekening en batch processing

## Doel

Celery tasks voor periodieke herberekening van leaderboard en batch readiness updates.

## To do

- [ ] `recalculate_leaderboard` task (Celery beat, dagelijks):
  - Per organisatie + actief seizoen
  - Bereken gemiddelde MatchReadiness score per team
  - Update `ClubLeaderboard` records met nieuwe rankings
  - Queue: `default`
- [ ] `recalculate_team_readiness` task (on-demand):
  - Herbereken alle MatchReadiness scores voor een team
  - Nuttig na bulk content import of data correctie
  - Queue: `default`
- [ ] `check_streak_risk` task (Celery beat, dagelijks):
  - Vind teams met actieve streaks en een wedstrijd binnen 48u
  - Waar readiness < 100%: stuur "streak at risk" notificatie
  - Voorkomt dat coaches hun streak verliezen zonder waarschuwing
  - Queue: `default`
- [ ] Celery beat schedule toevoegen aan settings
- [ ] Retry policy: max 3 retries met exponential backoff
- [ ] Idempotency: tasks zijn safe om meerdere keren te draaien

## Done criteria

- [ ] Leaderboard wordt dagelijks herberekend
- [ ] Streak risk waarschuwingen worden verstuurd
- [ ] Tasks zijn idempotent en retry-safe
- [ ] Unit tests voor elke task
