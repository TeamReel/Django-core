# 325 — B58 — Content Calendar

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend (TeamReel Product Feature) |
| Impact | 🟡 important |
| Effort | ~30 uur |

## Wat

Planning tool voor content creators: ContentPlan model met status-workflow (idea → planned → in_progress → review → published), auto-suggesties op basis van aankomende wedstrijden, kalender-integratie met wedstrijdprogramma, toewijzing aan gebruikers, due date tracking, herinneringen, en batch-planning voor een heel seizoen.

## Waarom belangrijk

Zonder planning is content-creatie reactief: "Oh, er is morgen een wedstrijd, snel een line-up maken." Met een content calendar wordt het proactief: het systeem suggereert automatisch welke content wanneer nodig is. Dit verlaagt stress voor vrijwilligers en verhoogt de content-output per club.

## Past in TeamReel / CoreApp

- **TeamReel**: Perfecte match. Wedstrijdkalender is er al → content calendar legt daar content-plannen overheen. "2 dagen voor wedstrijd: aankondiging. Ochtend wedstrijddag: line-up. Na wedstrijd: uitslag." Automatiseerbaar via templates.
- **CoreApp**: Content planning/scheduling is een generiek CMS-pattern. Het model (ContentPlan met workflow states) is herbruikbaar voor elk product met geplande content.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B58-content-calendar

We bouwen een content planning systeem in de Django 5 + DRF backend.

[feature summary]
Content calendar met planning, auto-suggesties, workflow management, en batch-planning rond het wedstrijdprogramma.

[goals]
- ContentPlan model: title, content_type, planned_date, status workflow (idea→planned→in_progress→review→published)
- Auto-suggest templates op basis van aankomende wedstrijden (2 dagen voor: aankondiging, wedstrijddag: line-up, na: uitslag)
- Kalender overlay met bestaand wedstrijdprogramma (Activity model)
- Assignment: toewijzing aan user, due date tracking
- Reminders: overdue alerts via notifications
- Batch planning: plan content voor heel seizoen in één keer

[non-goals]
- Content creation/editing (dat is de generative pipeline)
- Multi-level approval chains (dat is B66)
- Resource/capaciteitsplanning

[tech context]
- Backend: Django 5, DRF, PostgreSQL, Celery
- Activities: bestaand Activity model met wedstrijddata
- Content generation: GenerationRequest model
- Notifications: B17 (als beschikbaar)
- Tests: pytest + factory_boy
```

### Plan

```
/spec-kitty.plan feature=B58-content-calendar

[tech choices]
- Model: ContentPlan met FSM-achtige status transitions (simple enum + validation)
- Suggestions: Celery task die weekly upcoming matches scant en ContentPlans aanmaakt
- Calendar API: date-range filtered endpoint (start_date, end_date)
- Batch: bulk_create ContentPlans vanuit template-mapping per wedstrijd
- Reminders: Celery-beat taak die overdue plans detecteert

[models]
- ContentPlan: project FK, title, content_type, planned_date, status (enum), assigned_to (user FK), related_activity FK (nullable), generation_request FK (nullable)
- ContentPlanTemplate: name, content_type, days_before_match, template FK

[api endpoints]
- GET /api/v1/content-calendar/?start=&end= — kalender view
- POST /api/v1/content-calendar/ — plan aanmaken
- PATCH /api/v1/content-calendar/{id}/ — status update
- POST /api/v1/content-calendar/{id}/assign/ — toewijzen
- GET /api/v1/content-calendar/suggestions/ — auto-suggesties
- POST /api/v1/content-calendar/bulk/ — batch aanmaken

[files to create]
- src/content_calendar/ — nieuwe Django app
- src/content_calendar/suggestions.py — auto-suggest logica
- src/content_calendar/tasks.py — reminder + suggestion Celery tasks
- tests/test_content_calendar/
```

### Research

```
/spec-kitty.research feature=B58-content-calendar

Onderzoek de volgende punten:

1. Hoe ziet het Activity model eruit? Welke velden zijn er voor datum, tegenstander, status?
2. Welke content types worden er gegenereerd? Check GenerationRequest model voor type-velden.
3. Is er al een wedstrijd-kalender view in de frontend of API?
4. Hoe worden Celery-beat periodic tasks geconfigureerd in het project?
5. Welk notification systeem is beschikbaar voor reminders?
```
