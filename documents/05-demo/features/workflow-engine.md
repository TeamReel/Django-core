# Workflow Engine

> Last updated: 2026-03-12

## Overview

De `workflows` app implementeert een **state machine engine** voor approval flows. Primair gebruikt voor video-goedkeuring, maar generiek toepasbaar op elk model.

---

## Data Model (4 models)

### WorkflowTemplate

Definieert states en transities als JSON.

| Veld | Type | Doel |
|------|------|------|
| `name` | CharField(200) | Unique, indexed |
| `version` | CharField(50) | |
| `definition` | JSON | `{states: [{name, is_initial}], transitions: [{from_state, to_state, action, required_permission, validators}]}` |
| `is_active` | bool | Soft-delete (twee managers: `objects` = active, `all_objects` = alles) |

Validatie: exact 1 `is_initial` state, alle transitie-states moeten bestaan in states lijst.

### WorkflowInstance

Actieve workflow gekoppeld aan een business object (GenericFK).

| Veld | Type | Doel |
|------|------|------|
| `workflow` | FK → WorkflowTemplate | PROTECT |
| `workflow_snapshot` | JSON | Immutable kopie van definition bij aanmaak |
| `project` | FK → Project | Scope |
| `content_type` / `object_id` | GenericFK | Gekoppeld object (bijv. VideoJob) |
| `current_state` | CharField(100) | Huidige state, geïndexeerd |
| `context` | JSON | Willekeurige data, max 64KB |
| `version` | int | Optimistic locking |

### TransitionHistory

Immutable audit trail van state changes.

| Veld | Type | Doel |
|------|------|------|
| `from_state` / `to_state` | str | |
| `action` | str | Bijv. `approve`, `reject`, `submit` |
| `actor` | FK → User | |
| `comment` | text | |
| `task_id` | UUID | Celery task ID voor async hooks |
| `context_snapshot` | JSON | Kopie van context op moment van transitie |

**Immutable:** `save()` raises `ValueError` als pk al bestaat.

### ProjectPermissionOverride

Per-project override van transitie-permissies.

| Veld | Type | Doel |
|------|------|------|
| `project` | FK → Project | |
| `workflow` | FK → WorkflowTemplate | |
| `action_name` | str | Bijv. `approve` |
| `required_roles` | JSON | Array: `["admin", "coach"]` |

Unique: `(project, workflow, action_name)`.

---

## WorkflowEngine

Stateless engine (`src/workflows/services/engine.py`):

### create_instance()

```python
WorkflowEngine.create_instance(workflow, project, content_object, user, context)
```
- Slaat immutable workflow snapshot op
- Zet initial state
- Logt audit event

### get_available_actions()

```python
WorkflowEngine.get_available_actions(instance, user) → [action]
```
- Filtert transities vanuit huidige state op gebruikersmachtigingen

### execute_transition()

```python
WorkflowEngine.execute_transition(instance, action, user, comment, context_updates)
```

Atomic met `select_for_update`:

```
1. Valideer huidige state
2. Permission check:
   └─ ProjectPermissionOverride eerst
   └─ Fallback: transition.required_permission
   └─ Project creators hebben impliciete toegang
   └─ Anders: check ProjectMembership.role
3. Run validators (uit ValidatorRegistry)
4. Fire hooks:
   └─ on_exit(old_state)
   └─ async hooks via Celery (execute_workflow_hooks)
   └─ Record TransitionHistory
   └─ Update current_state
   └─ on_transition(action)
   └─ on_enter(new_state)
5. Increment version (optimistic locking)
```

---

## Registries

### ValidatorRegistry

```python
@ValidatorRegistry.validator("require_output_file")
def validate_output(instance, context):
    ...
```

### HookRegistry

Drie hook types: `on_enter`, `on_exit`, `on_transition`:

```python
@HookRegistry.hook("on_enter", "approved")
def on_approved(instance, context):
    ...
```

---

## Gebruik: Video Approval

De video app is de primaire gebruiker:

```
VideoJob aangemaakt
  → VideoService.create_job() maakt WorkflowInstance aan
  → Workflow template: "Video Approval"
  → Initial state: "pending_review"

Reviewer klikt "Approve":
  → VideoJobViewSet.approve()
  → WorkflowEngine.execute_transition(instance, "approve", user)
  → State: pending_review → approved
  → Hook: auto-create MediaItem + link naar Activity
```

---

## Celery Task

| Task | Config | Doel |
|------|--------|------|
| `execute_workflow_hooks` | max_retries=3, exponential backoff | Async hook functies uitvoeren |

---

## API Endpoints

| Methode | Endpoint | Doel |
|---------|----------|------|
| CRUD | `/workflows/templates/` | WorkflowTemplate beheer |
| GET | `/workflows/instances/` | Actieve workflow instances |
| POST | `/workflows/instances/{id}/transition/` | State transitie uitvoeren |
| GET | `/workflows/instances/{id}/history/` | TransitionHistory |
| CRUD | `/workflows/permission-overrides/` | Project permission overrides |
| GET | `/workflows/content-types/` | ContentType lookup (voor GenericFK) |

---

## Gerelateerde docs

- [video-processing.md](video-processing.md) — VideoJob approval flow
- [notification-routing.md](notification-routing.md) — Workflows triggeren notificaties
- [rbac-permissions.md](rbac-permissions.md) — Permission checks in transities
