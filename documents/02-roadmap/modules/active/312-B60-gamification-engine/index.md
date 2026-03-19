# 312-B60 — Gamification Engine

> **Status:** In uitvoering
> **Start:** 2026-03-19
> **Scope:** `src/gamification/`, `demo/src/components/dashboard/`, `demo/src/hooks/`
> **Dependencies:** B30 (Activities), B31 (Content Generation), B35 (MediaLib), B17 (Notifications), B62 (Activity Feed)

## Doel

Team- en club-level gamification met content streaks, match readiness scores, achievements en leaderboards. Stimuleert coaches om consistent content te maken voor elke wedstrijd. Vervangt de huidige client-side berekeningen (`useContentStreak`) met een server-side engine die scores persistent opslaat en auto-updatet via signals.

## Huidige staat

### Wat werkt (frontend, client-side berekend)
- `ReadinessRing` component: circulaire SVG progress indicator (0-100%)
- `ContentStreakWidget`: flame icon + streak teller met milestone tiers (bronze/silver/gold)
- `MediaReadinessCard`: hierarchische media completeness (club/team/members)
- `SquadReadinessCard`: squad readiness per wedstrijd
- `useContentStreak` hook: client-side berekening van streak via API calls naar `/activities/` + `/media/items/`
- `ProgressRing` chart component: herbruikbare circulaire progress

### Wat ontbreekt (backend)
- Geen server-side MatchReadiness model (nu client-side berekend per page load)
- Geen persistent TeamStreak model (nu per request vanuit 15 matches berekend)
- Geen Achievement/Badge systeem
- Geen ClubLeaderboard
- Geen ReadinessConfig (vereiste content types per team)
- Geen signal handlers voor auto-updates bij content creatie
- Geen Celery tasks voor periodieke herberekening

## Design beslissingen

| Vraag | Besluit |
|-------|--------|
| Server-side of client-side? | Server-side — persistent models, signals, Celery recalc |
| Team-level of player-level? | Team-level (per product besluit) |
| Streak definitie? | Configureerbaar per team via `ReadinessConfig` (default: flyer + lineup + match_summary) |
| Leaderboard scope? | Per club, per seizoen, auto-reset |
| Achievement revocatie? | Nee — eenmaal unlocked, altijd unlocked |
| Readiness score berekening? | Percentage van vereiste content-types die aangemaakt zijn per wedstrijd |
| Welke frontend componenten hergebruiken? | `ReadinessRing`, `ContentStreakWidget`, `ProgressRing` — aanpassen om server-data te consumeren |
| API prefix? | `/api/v1/gamification/` |

## Fasering

| Fase | Titel | Effort | Status | Doc |
|------|-------|--------|--------|-----|
| H0 | Models + Migrations | ~2 uur | todo | [H0](phases/todo/H0_models-and-migrations.md) |
| H1 | Signals + Auto-update | ~2 uur | todo | [H1](phases/todo/H1_signals-and-auto-update.md) |
| H2 | API Endpoints | ~2 uur | todo | [H2](phases/todo/H2_api-endpoints.md) |
| H3 | Celery Tasks | ~1 uur | todo | [H3](phases/todo/H3_celery-tasks.md) |
| H4 | Frontend Integratie | ~3 uur | todo | [H4](phases/todo/H4_frontend-integration.md) |
| H5 | Tests + Polish | ~2 uur | todo | [H5](phases/todo/H5_tests-and-polish.md) |

> Wanneer een fase klaar is: verplaats doc van `phases/todo/` naar `phases/done/`.

## Acceptatiecriteria (geheel)

- [ ] `MatchReadiness` model: per-match score (0-100%) gebaseerd op voltooide content types
- [ ] `TeamStreak` model: opeenvolgende wedstrijden met baseline content compleet
- [ ] `Achievement` model: 10 built-in badges met configureerbare thresholds
- [ ] `AchievementUnlock` model: team-level badge tracking met notification trigger
- [ ] `ClubLeaderboard`: seizoensranking van teams op gemiddelde readiness
- [ ] `ReadinessConfig`: per-team configureerbare vereiste content types
- [ ] Signal-driven auto-updates bij content creatie en match completion
- [ ] Celery task voor dagelijkse leaderboard herberekening
- [ ] Frontend componenten consumeren server-data i.p.v. client-side berekening
- [ ] Achievement unlock triggert B17 notificatie
- [ ] Build passes (`npx tsc --noEmit` + `npx vite build`)
- [ ] Backend tests met pytest (>80% coverage voor gamification app)
- [ ] No new `any` types
- [ ] Alle interactieve elementen accessible (keyboard + screen reader)
- [ ] Mobile-first responsive design
- [ ] `prefers-reduced-motion` gerespecteerd voor animaties
