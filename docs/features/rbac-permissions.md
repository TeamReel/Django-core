# RBAC Permission System

> Last updated: 2026-03-21

## Overview

De `permissions` app implementeert **hiërarchisch Role-Based Access Control**. Permissies worden geregistreerd door apps bij startup, gecombineerd in rollen, en geëvalueerd met caching en audit logging.

---

## Data Model (3 models)

### Permission

| Veld | Type | Doel |
|------|------|------|
| `permission` | CharField(100) | Unique, format `resource.action` (bijv. `projects.delete`) |
| `resource_type` | CharField(50) | bijv. `project`, `organisation` |
| `is_sensitive` | bool | Triggert audit logging |

Validatie: pattern `^[a-z_]+\.[a-z_]+$`.

### Role

| Veld | Type | Doel |
|------|------|------|
| `name` | CharField(100) | |
| `scope` | choices | `global`, `organization`, `project` |
| `permissions` | M2M → Permission | |

Unique: `(name, scope)`.

### RoleAssignment

| Veld | Type | Doel |
|------|------|------|
| `user` | FK → User | |
| `role` | FK → Role | RESTRICT |
| `scope` | CharField | Moet matchen met `role.scope` |
| `target_organization` | FK → Organisation | Verplicht als scope=organization |
| `target_project` | FK → Project | Verplicht als scope=project |
| `assigned_by` | FK → User | Audit trail |

Unique: `(user, scope, target_organization, target_project)`.

---

## Permission Registry

Apps registreren permissies bij startup in `AppConfig.ready()`:

```python
from permissions.registry import permission_registry

permission_registry.register(
    permission="projects.delete",
    resource_type="project",
    description="Delete a project",
    is_sensitive=True
)
```

Thread-safe (threading.Lock), trackt caller module via `inspect`.

**Geregistreerde permissies (selectie):**
- `org.invite_users`, `org.remove_users`, `org.manage_settings`, `org.delete`
- `projects.create`, `projects.view`, `projects.update`, `projects.delete`, `projects.archive`
- `permissions.create_role`, `permissions.assign_role`, `permissions.view_roles`
- `content.view_library`, `content.generate_content`, `content.approve_content`
- `settings.view`, `settings.edit`

---

## Permission Evaluator

```python
from permissions.evaluator import check_permission, check_permissions_batch

# Single check
allowed = check_permission(user_id, "projects.delete", project_id, "project")

# Batch check (single DB query)
results = check_permissions_batch(user_id, ["projects.view", "projects.delete"], project_id, "project")
# → {"projects.view": True, "projects.delete": False}
```

### Evaluatie-volgorde:

1. Check cache (TTL-based)
2. Query alle `RoleAssignment` voor user (prefetched permissions)
3. **Global scope** → altijd van toepassing
4. **Organization scope** → van toepassing op org + alle projects van die org
5. **Project scope** → alleen exact project match
6. **Wildcard `*`** → superuser short-circuit
7. Cache resultaat + audit event
8. **Fail closed** (deny bij error)

---

## Supporting Modules

| Module | Doel |
|--------|------|
| `cache.py` | `get_cached_evaluation()` / `set_cached_evaluation()` — TTL caching |
| `audit.py` | Integration met audit app (B09 fallback) |
| `sync.py` | Synchroniseer registry → DB Permission tabel |
| `signals.py` | Cache invalidatie bij RoleAssignment wijzigingen |

---

## API Endpoints

| Methode | Endpoint | Doel |
|---------|----------|------|
| CRUD | `/permissions/roles/` | Role beheer |
| CRUD | `/permissions/role-assignments/` | Role toewijzingen |
| GET | `/permissions/current/` | Huidige user's effectieve permissies |

---

## Gerelateerde docs

- [project-hierarchy.md](project-hierarchy.md) — ProjectMembership.role bepaalt basis-toegang
- [workflow-engine.md](workflow-engine.md) — Workflow transities checken permissies
- [architecture.md](../architecture/overview.md) — App overzicht
- [../security/permission-layers.md](../security/permission-layers.md) — De 3-laags permissieketen
- [../security/permission-testing-guide.md](../security/permission-testing-guide.md) — Testpatronen voor RBAC-endpoints

---

## Workflow Engine Permissies

> **Let op:** De workflow engine heeft een apart permissie-model. Zie [workflow-engine.md — RBAC Alignment](workflow-engine.md#rbac--workflow-permission-alignment) voor de volledige mapping.

De workflow engine checkt **`ProjectMembership.role`** (niet RBAC `Permission` strings):

| Actie | Geldige rollen | Match met RBAC |
|-------|---------------|----------------|
| Video/Content approve | `admin`, `editor` | ≈ `content.approve` (Team/Club/Land Admin) |
| Content submit | `admin`, `editor`, `viewer` | ≈ `content.create` (alle leden) |
| Invoice approve | `admin` | Alleen Admin |
| System transities | `[]` (leeg) | Geen auth nodig |
