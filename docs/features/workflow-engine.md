# Workflow Engine

> Last updated: 2026-03-21

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
| `definition` | JSON | `{states: [{name, is_initial}], transitions: [{from_state, to_state, action, permissions, validators}]}` |
| `is_active` | bool | Soft-delete (twee managers: `objects` = active, `all_objects` = alles) |

> **Let op:** Het `permissions` veld in transities bevat `ProjectMembership.Role` waarden (`admin`, `editor`, `viewer`), NIET RBAC permissie-strings.

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
   └─ ProjectPermissionOverride eerst (per-project role override)
   └─ Fallback: transition.permissions[] (lijst van geldige rollen)
   └─ Lege lijst = system transitie (geen auth nodig)
   └─ Project creators hebben impliciete toegang
   └─ Check ProjectMembership.role op exact project
   └─ Hiërarchie: als project een team is, check ook parent club membership
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
  → Initial state: "processing"

Video klaar:
  → processing_complete (system transitie, geen auth)
  → State: processing → ready_for_review

Reviewer klikt "Approve":
  → VideoJobViewSet.approve()
  → WorkflowEngine.execute_transition(instance, "approve", user)
  → Permission check: user moet 'admin' of 'editor' role hebben
  → State: ready_for_review → approved
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
- [../security/permission-layers.md](../security/permission-layers.md) — De 3-laags permissieketen (auth → membership → workflow)

---

## RBAC ↔ Workflow Permission Alignment

De workflow engine gebruikt **ProjectMembership.Role** waarden (`admin`, `editor`, `viewer`) in transitie-permissions — NIET de RBAC `Permission` strings uit de `permissions` app.

### Twee permissie-systemen

| Systeem | Check methode | Waarden |
|---------|--------------|---------|
| **RBAC (permissions app)** | `RoleAssignment` → `Role` → `Permission` | `content.approve`, `org.manage_settings`, etc. |
| **Workflow Engine** | `ProjectMembership.role in transition.permissions[]` | `admin`, `editor`, `viewer` |

### Workflow Permission Matrix

| Workflow | Transitie | Permissions | Welke RBAC rollen? |
|----------|-----------|-------------|-------------------|
| **Video Approval** | `processing_complete` | `[]` (system) | Iedereen (automatisch) |
| **Video Approval** | `approve` | `["admin", "editor"]` | Team/Club/Land Admin |
| **Video Approval** | `reject` | `["admin", "editor"]` | Team/Club/Land Admin |
| **Content Approval** | `submit` | `["admin", "editor", "viewer"]` | Alle leden |
| **Content Approval** | `approve` / `reject` / `revise` | `["admin", "editor"]` | Team/Club/Land Admin |
| **Invoice Approval** | `approve` / `reject` | `["admin"]` | Alleen Admin |
| **Support Ticket** | alle | `[]` (system) | Iedereen |

### Mapping naar RBAC rollen

| RBAC Rol | ProjectMembership.role | Kan approven? | Kan submitten? |
|----------|----------------------|---------------|----------------|
| Land Admin | `admin` (org) | ✅ | ✅ |
| Club Admin | `admin` (club project) | ✅ | ✅ |
| Team Admin | `admin` (team project) | ✅ | ✅ |
| Team Member | `viewer` (team) | ❌ | ✅ |
| Supporter | `viewer` (club) | ❌ | ❌ (geen project membership op team) |

### Hiërarchie-enforcement

De workflow engine respecteert de club/team hiërarchie:

| Scenario | Resultaat |
|----------|-----------|
| Team Admin approvet video van eigen team | ✅ Direct membership match |
| Club Admin approvet video van child team | ✅ Parent project membership check |
| Team Admin approvet workflow op club-niveau | ❌ Geen upward traversal |
| Club Viewer approvet video van child team | ❌ Role `viewer` ∉ `["admin", "editor"]` |

De check werkt als volgt:
1. Zoek `ProjectMembership(user, project)` op het exacte project
2. Als niet gevonden EN project heeft een `parent_project` → zoek ook op parent
3. In beide gevallen moet `membership.role in required_roles`

Dit is consistent met hoe ViewSets (projecten, matches, leden) ook de hiërarchie checken.

### ProjectPermissionOverride

Per-project overrides zijn mogelijk via `ProjectPermissionOverride`:

```python
# Stel dat een club wil dat alleen admins content submitten:
ProjectPermissionOverride.objects.create(
    project=club_project,
    workflow=content_template,
    action_name="submit",
    required_roles=["admin"]
)
```

Dit overschrijft de standaard permissions uit de workflow definitie.
