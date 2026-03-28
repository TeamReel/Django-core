# H4 — Test Coverage Uitbreiding

> **Effort:** ~6 uur | **Impact:** 4 business-critical apps krijgen basis test coverage, veilig refactoren wordt mogelijk

## Context

15 van 27 Django apps hebben 0 tests. De meest kritieke apps — `content_generation` (templates, items, approval flow), `notifications` (gebruikerscommunicatie), `contextual_notifications` (smart routing), en `workflows` (proces-orchestratie) — draaien in productie zonder enige test coverage.

Na H0 (security hardening) en H1 (N+1 fixes) moeten de fixes ook met tests afgedekt worden.

## To do

### content_generation (~2 uur)
- [ ] `tests/__init__.py`, `tests/conftest.py` — fixtures voor ContentTemplate, ContentItem, ContentApproval
- [ ] `tests/test_models.py` — model constraints, state transitions, approval flow
- [ ] `tests/test_api.py` — ViewSet CRUD, permission checks, org-scoping
- [ ] Verify: permission mixin werkt correct (ContentTemplatePermissionMixin etc.)

### notifications (~1 uur)
- [ ] `tests/__init__.py`, `tests/conftest.py`
- [ ] `tests/test_models.py` — notification creation, delivery tracking
- [ ] `tests/test_tasks.py` — delivery pipeline, cleanup tasks

### contextual_notifications (~1 uur)
- [ ] `tests/__init__.py`, `tests/conftest.py`
- [ ] `tests/test_models.py` — routing rules, quiet hours
- [ ] `tests/test_tasks.py` — routing_tasks, delivery scheduling

### workflows (~1 uur)
- [ ] `tests/__init__.py`, `tests/conftest.py`
- [ ] `tests/test_models.py` — workflow definitions, step execution
- [ ] `tests/test_api.py` — workflow API endpoints

### Security regression tests (~1 uur)
- [ ] Tests voor H0 fixes: verify 401 op gelocked endpoints
- [ ] Tests voor H1 fixes: `assertNumQueries` op user list endpoint

## Done criteria

- [ ] content_generation: ≥15 tests, models + API
- [ ] notifications: ≥10 tests, models + tasks
- [ ] contextual_notifications: ≥10 tests, models + tasks
- [ ] workflows: ≥10 tests, models + API
- [ ] Security regression: ≥5 tests voor auth changes
- [ ] Alle tests groen (3307 + ~50 nieuw = ~3350+)
