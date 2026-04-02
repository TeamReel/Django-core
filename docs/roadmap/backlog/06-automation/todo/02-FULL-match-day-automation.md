# 351 — B75 — Match Day Automation

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend + Frontend (TeamReel Product Feature) |
| Impact | 🔴 critical |
| Effort | ~40 uur |

## Wat

Automatisch content genereren op basis van wedstrijdfases — pre-match, during-match en post-match — zonder handmatige actie. AutomationRule model per team met trigger types (match_created, lineup_confirmed, score_updated, match_finished), configureerbare delay en auto-publish opties. Signal-based event detection met debounce, AutomationExecution tracking, en frontend settings UI.

## Waarom belangrijk

De kernbelofte van TeamReel is "in minuten, automatisch." Nu moet een gebruiker handmatig naar de AI Studio gaan. Met automations triggert het platform zelf: wedstrijd aangemaakt → aankondiging, opstelling ingevuld → line-up graphic, uitslag → scoregraphic. Dit is het verschil tussen een tool en een platform.

## Past in TeamReel / CoreApp

- **TeamReel**: Dit IS de core value proposition. Een coach hoeft alleen de opstelling in te vullen — TeamReel doet de rest. Match day automation maakt TeamReel van "handig hulpmiddel" naar "onmisbare teamgenoot." Elke competitor die dit eerder bouwt wint de markt.
- **CoreApp**: Event-driven automation is een generiek pattern (triggers → actions). Het model (AutomationRule + execution tracking) is herbruikbaar voor elke applicatie met workflow automation.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B75-match-day-automation

We bouwen match day content automation in Django 5 + DRF + React 18.

[feature summary]
Event-driven content generatie met AutomationRule model, signal-based triggers, Celery execution, en frontend settings UI.

[goals]
- AutomationRule model: project FK, trigger_type (enum), content_template FK, enabled, delay, require_approval, auto_publish
- Triggers: match_created, lineup_confirmed, score_updated, match_finished, period_started
- Signal-based event detection op Activity model saves/updates
- Debounce: voorkom dubbele triggers (30s window)
- AutomationExecution: tracking per trigger (status, timing, generation result)
- Credit check: geen generatie als credits op
- Rate limiting: max 1 automation per rule per 5 minuten
- Frontend settings: /settings/automations — toggle per trigger, template koppeling

[non-goals]
- Complex workflow chains (trigger A → trigger B)
- Conditional logic in automations (if score > 5 then...)
- Custom trigger definitie door gebruikers
- Real-time notifications (dat is B63)

[tech context]
- Backend: Django 5, DRF, PostgreSQL, Celery
- Activities: bestaand Activity model met signals
- Content generation: GenerationRequest + pipeline (src/generative/)
- Credits: bestaand credit systeem
- Templates: GenerationTemplate model
- Frontend: React 18, TypeScript
- Tests: pytest + factory_boy
```

### Plan

```
/spec-kitty.plan feature=B75-match-day-automation

[tech choices]
- Signals: Django post_save/post_delete op Activity + ActivityParticipation
- Debounce: Redis key met TTL (30s) per (rule_id, activity_id) combinatie
- Execution: Celery task op default queue met ETA (voor delay)
- Credit check: pre-check in Celery task, skip als onvoldoende
- Status tracking: AutomationExecution model met full audit
- Approval: optioneel doorsturen naar B66 Approval Workflow queue

[models]
- AutomationRule: project FK, trigger_type (enum), content_template FK, enabled, delay (timedelta), require_approval, auto_publish, created_by FK
- AutomationExecution: rule FK, activity FK, status (pending/queued/generating/completed/failed/skipped), timestamps, generation_request FK, skip_reason

[api endpoints]
- GET /api/v1/automations/ — lijst regels voor project
- POST /api/v1/automations/ — regel aanmaken
- PATCH /api/v1/automations/{id}/ — regel wijzigen (enable/disable)
- DELETE /api/v1/automations/{id}/ — regel verwijderen
- GET /api/v1/automations/{id}/executions/ — execution history
- POST /api/v1/automations/{id}/test/ — test-run met dummy data

[frontend]
- demo/src/pages/AutomationSettings.tsx — settings pagina per team
- demo/src/components/automation/AutomationRuleCard.tsx — per-trigger toggle

[files to create]
- src/automations/ — nieuwe Django app
- src/automations/signals.py — Activity signal handlers
- src/automations/tasks.py — Celery execution tasks
- demo/src/pages/AutomationSettings.tsx + .module.css
- tests/test_automations/
```

### Research

```
/spec-kitty.research feature=B75-match-day-automation

Onderzoek de volgende punten:

1. Welke signals bestaan er al op het Activity model? Check src/activities/ voor existing signal handlers.
2. Hoe werkt de content generation pipeline? Hoe start je een generatie programmatisch?
3. Hoe werkt het credit systeem? Check src/credits/ voor balance check patterns.
4. Welke GenerationTemplate types bestaan er? (line-up, uitslag, aankondiging)
5. Hoe werkt debouncing/deduplicatie in de bestaande Celery setup? Is Redis beschikbaar als lock?
```
