# B75: Match Day Automation

**Priority:** 🔥 Bouwen
**Phase:** —
**Status:** 📋 ROADMAP
**Module ID:** 351
**Category:** Backend + Frontend (TeamReel Product Feature)

## Description

## 351. B75 – Match Day Automation

**Doel**: Automatisch content genereren op basis van wedstrijdfases — pre-match, during-match en post-match — zonder dat een vrijwilliger handmatig een generatie hoeft te starten.

**Waarom TeamReel**: De kernbelofte is "in minuten, automatisch". Nu moet een gebruiker handmatig naar de AI Studio gaan en een generatie starten. Met automations triggert het platform zelf content op basis van events: wedstrijd aangemaakt → aankondiging, opstelling ingevuld → line-up graphic, score update → goal celebration, wedstrijd afgelopen → uitslag graphic.

**Wat moet er gebeuren**:

### AutomationRule Model
- **AutomationRule model**:
  - Fields: project FK (team), trigger_type (enum), content_template FK, enabled (bool)
  - Trigger types: `match_created`, `lineup_confirmed`, `score_updated`, `match_finished`, `period_started`
  - Configuratie: delay (timedelta), require_approval (bool), auto_publish (bool)
  - Scope: per team instelbaar (niet globaal)

### Triggers & Events
- **Event detection**:
  - Signal-based: luister naar Activity save/update signals
  - Match aangemaakt + datum in toekomst → trigger `match_created`
  - ActivityParticipation bulk-created (opstelling) → trigger `lineup_confirmed`
  - Activity.score_home / score_away gewijzigd → trigger `score_updated`
  - Activity.status → completed → trigger `match_finished`
- **Debounce**: voorkom dubbele triggers bij rapid updates (30s window)

### AutomationExecution
- **AutomationExecution model**:
  - Fields: rule FK, activity FK, status (pending/queued/generating/completed/failed/skipped)
  - Timing: triggered_at, started_at, completed_at
  - Result: generation_request FK (koppeling naar bestaande ContentGeneration pipeline)
  - Audit: triggered_by (system/manual), skip_reason (optioneel)

### Celery Integration
- Automation executions via `default` queue
- Respecteer bestaande credit-systeem (geen generatie als credits op)
- Rate limiting: max 1 automation per rule per 5 minuten

### Frontend: Automation Settings
- Settings pagina per team: `/settings/automations`
- Toggle per trigger type: aan/uit
- Koppel content template per trigger
- Preview: "Bij volgende wedstrijd wordt automatisch een [line-up graphic] gemaakt"

### Afhankelijkheden
- `activities` app (signals op Activity model)
- `content_generation` app (GenerationRequest)
- `credits` app (balance check)
- B66 Approval Workflow (optioneel: automation → approval queue)

### Scope & Effort
- **Effort**: ~40 uur
- **Lagen**: Backend models + signals, Celery tasks, Frontend settings UI
- **Risico**: Signal-cascade bij bulk imports → debounce cruciaal
