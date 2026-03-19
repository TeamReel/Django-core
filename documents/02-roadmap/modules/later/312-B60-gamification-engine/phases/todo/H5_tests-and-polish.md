# H5 — Tests + Polish

> **Effort:** ~2 uur | **Impact:** Kwaliteitsborging en productie-gereedheid

## Doel

Volledige test coverage voor backend, seed data voor achievements, en documentatie.

## To do

- [ ] **Backend tests (pytest):**
  - Model tests: CRUD voor alle 6 models, constraints, defaults
  - Signal tests: content creatie triggert readiness update, streak update, achievement unlock
  - API tests: alle endpoints met correcte responses, org-scoping, permissions
  - Celery task tests: leaderboard recalc, streak risk check
  - Edge cases: lege data, geen config, seizoen zonder matches
- [ ] **Seed data:**
  - Management command `seed_achievements` met 10 built-in achievements:
    1. `first_content` — Eerste content-item gegenereerd
    2. `match_ready` — 100% content voor een wedstrijd
    3. `streak_3` — 3 wedstrijden streak
    4. `streak_5` — 5 wedstrijden streak
    5. `streak_10` — 10 wedstrijden streak
    6. `streak_25` — 25 wedstrijden streak (seizoen)
    7. `early_bird` — Content klaar 24u voor wedstrijd
    8. `season_complete` — Alle wedstrijden > 80% in een seizoen
    9. `photo_pro` — Alle spelerfoto's geupload
    10. `content_machine_50` — 50 content-items gegenereerd
- [ ] **Frontend tests:**
  - Hook tests met MSW (Mock Service Worker)
  - Component snapshot tests voor LeaderboardCard, AchievementGrid
- [ ] **Admin polish:**
  - List display, filters, search fields voor alle models
  - Inline voor AchievementUnlock op Achievement admin
- [ ] **Documentatie:**
  - README.md in `src/gamification/`
  - API documentatie in docstrings
  - Update `documents/05-demo/ai-context-index.md`

## Done criteria

- [ ] pytest coverage > 80% voor `src/gamification/`
- [ ] Seed command draait succesvol
- [ ] Admin interface is bruikbaar voor support
- [ ] Documentatie is up-to-date
- [ ] Geen regressions in bestaande tests
