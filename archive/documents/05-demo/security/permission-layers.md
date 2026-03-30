# Permission Layers — De 3-laags permissieketen

> Hoe authenticatie, membership en workflow-permissies samenwerken voor API-endpoints.

Last updated: 2026-03-21

---

## Context

Elke API-request in TeamReel doorloopt **drie onafhankelijke permissielagen**. Dit document beschrijft hoe ze samenwerken, specifiek voor endpoints die workflow-acties triggeren (zoals video approve/reject).

## De drie lagen

### Laag 1: IsAuthenticated (DRF)

**Check:** Is de gebruiker ingelogd?

| Resultaat | HTTP Response |
|-----------|--------------|
| Niet ingelogd | `401 Unauthorized` |
| Ingelogd | Ga door naar laag 2 |

**Code:** Standaard DRF `IsAuthenticated` permission class op elke ViewSet.

### Laag 2: IsProjectMember (DRF permission + queryset)

**Check:** Heeft de gebruiker een `ProjectMembership` op het project (of het parent project)?

Twee sub-checks werken samen:

#### a) Permission class: `IsProjectMember`

```python
# src/video/permissions.py

def _has_project_access(user, project_id) -> bool:
    """Check membership op project OF parent project."""
    # 1. Direct membership?
    if ProjectMembership.objects.filter(
        project_id=project_id, user=user, deleted_at__isnull=True
    ).exists():
        return True
    # 2. Parent project membership? (hiërarchie)
    parent_id = Project.objects.values_list("parent_project_id", flat=True).get(pk=project_id)
    if parent_id:
        return ProjectMembership.objects.filter(
            project_id=parent_id, user=user, deleted_at__isnull=True
        ).exists()
    return False
```

#### b) Queryset filtering: `get_queryset()`

```python
# src/video/views/job.py — VideoJobViewSet.get_queryset()

# Haal directe project-IDs op
direct_ids = ProjectMembership.objects.filter(
    user=user, deleted_at__isnull=True
).values_list("project_id", flat=True)

# Voeg child projects toe (hiërarchie naar beneden)
child_ids = Project.objects.filter(
    parent_project_id__in=direct_ids
).values_list("id", flat=True)

all_project_ids = set(direct_ids) | set(child_ids)
return VideoJob.objects.filter(project_id__in=all_project_ids)
```

| Resultaat | HTTP Response |
|-----------|--------------|
| Geen membership (direct of parent) | `404 Not Found` (object niet in queryset) |
| Wel membership | Ga door naar laag 3 |

**Let op:** Queryset filtering geeft 404 (niet 403) — het object bestaat simpelweg niet in de gefilterde set. Dit is by design: het lekt geen informatie over het bestaan van resources.

### Laag 3: WorkflowEngine (business logic)

**Check:** Heeft de gebruiker de juiste **rol** voor de workflow-transitie?

```python
# src/workflows/services/engine.py — _check_permission()

# Transition permissions bevatten rollen: ["admin", "editor"]
# Check membership-rol op project of parent project
membership = ProjectMembership.objects.filter(
    project=project, user=user, deleted_at__isnull=True
).first()
if membership and membership.role in transition.permissions:
    return True
# Hiërarchie fallback: check parent project
if project.parent_project:
    parent_membership = ProjectMembership.objects.filter(
        project=project.parent_project, user=user, deleted_at__isnull=True
    ).first()
    if parent_membership and parent_membership.role in transition.permissions:
        return True
```

| Resultaat | Gedrag |
|-----------|--------|
| Rol niet in permissions | HTTP 200 maar workflow faalt silently — state verandert niet |
| Rol wel in permissions | Transitie succesvol — state verandert |

**Let op:** Dit is een "best-effort" model — de endpoint geeft 200 maar de workflow transitie wordt alleen uitgevoerd als de rol matcht.

---

## Voorbeeld: Video Approve endpoint

| Gebruiker | Laag 1 | Laag 2 | Laag 3 | Resultaat |
|-----------|--------|--------|--------|-----------|
| Anoniem | ❌ 401 | — | — | Geen toegang |
| Non-member | ✅ | ❌ 404 | — | Video niet gevonden |
| Team Viewer | ✅ | ✅ | ❌ | HTTP 200, maar workflow blijft op `ready_for_review` |
| Team Editor | ✅ | ✅ | ✅ | HTTP 200, workflow → `approved` |
| Team Admin | ✅ | ✅ | ✅ | HTTP 200, workflow → `approved` |
| Club Admin → team video | ✅ | ✅ (parent) | ✅ (parent) | HTTP 200, workflow → `approved` |
| Team Admin → club video | ✅ | ❌ 404 | — | Niet in queryset (geen upward access) |

---

## Hiërarchie-regels

```
                          ┌─────────────┐
                          │  Club Admin  │
                          └──────┬──────┘
                    ✅ naar beneden │
                          ┌──────▼──────┐
                          │  Team Video  │
                          └─────────────┘

                          ┌─────────────┐
                          │  Team Admin  │
                          └──────┬──────┘
                    ❌ naar boven  │
                          ┌──────▼──────┐
                          │  Club Video  │ ← 404
                          └─────────────┘
```

- **Naar beneden werkt op alle drie de lagen**: permission class, queryset, én workflow engine
- **Naar boven is geblokkeerd op laag 2**: queryset bevat alleen directe + child projecten
- **Soft-deleted memberships worden genegeerd**: `deleted_at__isnull=True` op alle queries

---

## Bronbestanden

| Bestand | Functie |
|---------|---------|
| [src/video/permissions.py](../../../src/video/permissions.py) | `_has_project_access()`, `IsProjectMember` |
| [src/video/views/job.py](../../../src/video/views/job.py) | `VideoJobViewSet.get_queryset()`, approve/reject actions |
| [src/workflows/services/engine.py](../../../src/workflows/services/engine.py) | `WorkflowEngine._check_permission()` |
| [tests/video/test_approval_permissions.py](../../../tests/video/test_approval_permissions.py) | 12 integratie tests |

## Gerelateerde docs

- [permission-testing-guide.md](permission-testing-guide.md) — Testpatronen voor RBAC-endpoints
- [../features/rbac-permissions.md](../features/rbac-permissions.md) — RBAC datamodel
- [../features/project-hierarchy.md](../features/project-hierarchy.md) — Project hiërarchie & membership
- [../features/workflow-engine.md](../features/workflow-engine.md) — Workflow engine
