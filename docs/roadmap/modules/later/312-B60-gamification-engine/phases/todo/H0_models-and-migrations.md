# H0 — Models + Migrations

> **Effort:** ~2 uur | **Impact:** Foundation voor alle gamification features

## Doel

Django app `gamification` aanmaken met alle 6 models, migraties, admin registratie en factories.

## To do

- [ ] Django app `gamification` aanmaken in `src/gamification/`
- [ ] `ReadinessConfig` model:
  - Fields: `id` (UUID), `team` (FK → Project, unique), `required_content_types` (JSONField, default `["flyer", "lineup", "match_summary"]`), `created_at`, `updated_at`
  - Constraint: one config per team (project)
- [ ] `MatchReadiness` model:
  - Fields: `id` (UUID), `match` (FK → Activity), `team` (FK → Project), `organisation` (FK), `score` (IntegerField 0-100), `completed_types` (JSONField), `total_required` (IntegerField), `updated_at`
  - Unique constraint: `(match, team)`
  - Indexes: `(organisation, team)`, `(team, -updated_at)`
- [ ] `TeamStreak` model:
  - Fields: `id` (UUID), `team` (FK → Project), `season` (FK → Period, null), `organisation` (FK), `current_streak` (IntegerField, default 0), `longest_streak` (IntegerField, default 0), `last_match_date` (DateField, null), `updated_at`
  - Unique constraint: `(team, season)`
- [ ] `Achievement` model:
  - Fields: `id` (UUID), `slug` (unique), `name`, `description`, `icon` (CharField), `category` (choices: content/streak/season/team), `threshold` (IntegerField), `is_active` (BooleanField, default True), `created_at`
  - 10 built-in fixtures (seed data)
- [ ] `AchievementUnlock` model:
  - Fields: `id` (UUID), `achievement` (FK), `team` (FK → Project), `organisation` (FK), `unlocked_at` (auto_now_add), `unlocked_by` (FK → User, null)
  - Unique constraint: `(achievement, team)` — kan maar 1x unlocked worden
- [ ] `ClubLeaderboard` model:
  - Fields: `id` (UUID), `organisation` (FK), `season` (FK → Period, null), `team` (FK → Project), `rank` (IntegerField), `average_score` (DecimalField), `total_matches` (IntegerField), `updated_at`
  - Unique constraint: `(organisation, season, team)`
  - Index: `(organisation, season, rank)`
- [ ] App toevoegen aan `INSTALLED_APPS` in settings
- [ ] Admin registratie voor alle models
- [ ] Model factories aanmaken voor tests
- [ ] `makemigrations` + `migrate` lokaal testen

## Done criteria

- [ ] `python manage.py makemigrations gamification` genereert migratie
- [ ] `python manage.py migrate` slaagt
- [ ] `python manage.py check` geen errors
- [ ] Admin interface toont alle 6 models
- [ ] Factories werken in pytest
