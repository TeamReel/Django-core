# Security & Access Control

> Alle documentatie over authenticatie, autorisatie, permissies en hiërarchische toegang.

Last updated: 2026-03-21

---

## Documentatie in deze map

| Document | Onderwerp |
|----------|-----------|
| [permission-layers.md](permission-layers.md) | De 3-laags permissieketen: authenticatie → membership → workflow |
| [permission-testing-guide.md](permission-testing-guide.md) | Herbruikbare testpatronen voor RBAC-endpoints |

## Gerelateerde documentatie (elders)

| Document | Locatie | Onderwerp |
|----------|---------|-----------|
| [rbac-permissions.md](../features/rbac-permissions.md) | `features/` | RBAC datamodel: Permission, Role, RoleAssignment, evaluator |
| [project-hierarchy.md](../features/project-hierarchy.md) | `features/` | Project hiërarchie, ProjectMembership, rollen (admin/editor/viewer) |
| [workflow-engine.md](../features/workflow-engine.md) | `features/` | Workflow state machine, transitie-permissies, hooks |

---

## Overzicht: Hoe toegang werkt in TeamReel

TeamReel gebruikt **drie onafhankelijke autorisatielagen** die samen bepalen wat een gebruiker kan doen:

```
Request binnenkomst
  │
  ├─ Laag 1: IsAuthenticated (DRF)
  │    └─ Niet ingelogd? → 401
  │
  ├─ Laag 2: IsProjectMember (DRF permission + queryset)
  │    └─ Geen membership op project of parent? → 404
  │
  └─ Laag 3: WorkflowEngine (business logic)
       └─ Rol niet in transitie-permissions? → actie faalt silently
```

### Hiërarchie

```
Organisation
  └── Club (parent_project = NULL)
      ├── Team A (parent_project = Club)
      └── Team B (parent_project = Club)
```

- **Naar beneden**: Club Admin kan team-video's goedkeuren ✅
- **Naar boven**: Team Admin kan NIET bij club-resources ❌
- **Lateraal**: Team A Admin kan NIET bij Team B ❌

### Rollen

| Rol | Permissies |
|-----|-----------|
| `admin` | Volledige toegang: approve, reject, beheer |
| `editor` | Content bewerken en goedkeuren |
| `viewer` | Alleen bekijken — workflow-acties worden geweigerd |

---

## Toekomstige onderwerpen

Documentatie die hier kan worden toegevoegd:

- **API Authentication** — JWT flow, token refresh, session management
- **Org-scoping** — Hoe multi-tenancy werkt op queryset-niveau
- **Rate limiting** — API throttling configuratie
- **Audit logging** — Welke acties worden gelogd en hoe
- **CORS & CSP** — Cross-origin en content security policies
