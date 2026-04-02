# 266 — D07 — Tool-Call Logging Infrastructure

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend (Observability) |
| Impact | 🟡 important |
| Effort | ~15 uur |

## Wat

Secure logging van AI agent tool calls met automatische secret redaction en audit trail. Structured logging in JSON-formaat (tool name, args, result, duration, agent_id), query interface met filters, en retention policies voor automatische archivering.

## Waarom belangrijk

AI agents voeren tool calls uit die kosten geld (API calls), data wijzigen, en security-gevoelig zijn. Zonder logging is debugging onmogelijk, zijn kosten niet traceerbaar, en is er geen audit trail voor compliance. Secret redaction voorkomt dat API keys en tokens in logs terechtkomen.

## Past in TeamReel / CoreApp

- **TeamReel**: De generative pipeline maakt OpenAI/Gemini calls, FFmpeg calls, en file operations. Logging geeft inzicht in kosten, faalpercentage, en performance per generatie-type.
- **CoreApp**: Tool-call logging is platform-agnostisch — elk product met AI agents, external API integrations of background jobs heeft gestructureerde logging nodig. Past in de Observability laag.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=D07-tool-call-logging

We bouwen gestructureerde logging voor AI/tool calls in de Django 5 backend.

[feature summary]
Secure, structured logging van alle AI agent tool calls met automatische secret redaction, query interface, en retention policies.

[goals]
- Alle tool calls gelogd met structured JSON format (tool, args, result, duration, agent_id)
- Secret redaction voor 10+ common patterns (API keys, tokens, passwords, PII)
- Query interface met filters (agent, tool, date, success/failure)
- Retention policy: auto-archive logs >90 dagen
- Integratie met bestaande audit logging (als B09 beschikbaar)

[non-goals]
- Real-time log streaming (ELK/Grafana — infra concern)
- Application-level logging (dat is standaard Python logging)
- Cost tracking per API call (dat is een apart billing concern)

[tech context]
- Backend: Django 5, DRF, PostgreSQL, Celery
- AI pipeline: src/generative/ met OpenAI + Gemini calls
- Video pipeline: src/video/ met FFmpeg calls
- Bestaande logging: Python structlog (als aanwezig) of standaard logging
- Tests: pytest
```

### Plan

```
/spec-kitty.plan feature=D07-tool-call-logging

[tech choices]
- Model: ToolCallLog met structured JSONField voor args/result
- Redaction: regex-based SecretRedactor class (API key patterns, bearer tokens, etc.)
- Middleware: decorator @log_tool_call voor functies die external calls maken
- Async: logging via Celery task om main thread niet te blokkeren
- Query: DRF ViewSet met django-filter voor filtering
- Retention: Celery-beat task archive_old_logs (maandelijks)

[models]
- ToolCallLog: tool_name, agent_id, args_redacted (JSON), result_summary, duration_ms, status, created_at
- ToolCallLogArchive: zelfde velden, voor gearchiveerde logs

[api endpoints]
- GET /api/v1/tool-logs/ — lijst met filters (agent, tool, date range, status)
- GET /api/v1/tool-logs/{id}/ — detail view
- GET /api/v1/tool-logs/stats/ — aggregatie (calls per tool, faalpercentage)

[files to create/modify]
- src/tool_logging/ — nieuwe Django app
- src/generative/services.py — @log_tool_call decorator toevoegen
- tests/test_tool_logging/ — redaction tests, query tests
```

### Research

```
/spec-kitty.research feature=D07-tool-call-logging

Onderzoek de volgende punten:

1. Welke external calls worden er nu gemaakt in src/generative/ en src/video/? Maak een inventaris.
2. Welke secrets/tokens worden er gebruikt in de codebase (settings, env vars)?
3. Bestaat er al een audit logging mechanisme (B09)? Zo ja, hoe integreren?
4. Wat is het verwachte volume aan tool calls per dag? (schatting op basis van generaties)
5. Is er al structlog of een ander structured logging framework in gebruik?
```
