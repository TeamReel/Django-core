# Project Hierarchy & Membership

> Last updated: 2026-03-12

## Overview

De `projects` app is de ruggengraat van TeamReel's data-hiërarchie. Clubs en teams zijn beide `Project` records, genest via `parent_project`. Elk project heeft leden met rollen, uitnodigingen, promoties, en functionele rollen.

---

## Data Model (5 models)

### Project

| Veld | Type | Doel |
|------|------|------|
| `organisation` | FK → Organisation | Tenant |
| `parent_project` | FK → self | NULL = club (root), gezet = team (child) |
| `name` | CharField(200) | Case-insensitive unique binnen scope |
| `slug` | SlugField(200) | Auto-generated, unique per (org, parent) |
| `team_type` | choices | `regular`, `legends` |
| `sport` | FK → Sport | Nullable; teams erven van parent |
| `is_active` | bool | Soft-delete |
| `is_private` | bool | Beperkt tot expliciete leden |
| `metadata` | JSON | Stadium, stad, etc. |

**Hiërarchie:**
```
Organisation
  └── Club (parent_project = NULL)
      ├── Heren 1 (parent_project = Club)
      ├── Heren 2
      └── Dames 1
```

**Auto-create:** Bij club aanmaak maakt `post_save` signal automatisch team "Heren 1" + BrandProfile met 6 default tokens.

### ProjectMembership

| Veld | Type | Doel |
|------|------|------|
| `project` | FK → Project | |
| `user` | FK → User | |
| `period` | FK → Period | Optioneel seizoen-scope |
| `role` | choices | `viewer`, `editor`, `admin` |
| `assignment_reason` | choices | `manual`, `invitation`, `promotion`, `org_default` |
| `metadata` | JSON | positie, shirtnummer, teamreel_assets |
| `deleted_at` | datetime | Soft-delete |

**Constraint:** unique `(project, user, period)` voor actieve records. Last-admin bescherming in `clean()`.

### ProjectInvite

| Veld | Type | Doel |
|------|------|------|
| `email` | EmailField | |
| `role` | str | Rol bij acceptatie |
| `token` | CharField(64) | Secure, unique |
| `status` | choices | `pending → accepted / cancelled / expired` |
| `expires_at` | datetime | |

### ProjectMembershipPromotion

| Veld | Type | Doel |
|------|------|------|
| `from_role` / `to_role` | str | Bijv. viewer → editor |
| `status` | choices | `pending → accepted / declined / expired / cancelled` |
| `is_suspicious` | bool | Gemarkeerd bij snelle promoties |
| `expires_at` | datetime | Default 3 dagen |

### ProjectFunctionalRoleAssignment

Domein-rollen (los van RBAC):

| Veld | Type | Doel |
|------|------|------|
| `role` | choices | `coach`, `player`, `keeper`, `assistant`, `verzorger`, `supporter`, `manager` |
| `assignment_reason` | choices | `manual`, `imported` |

Een gebruiker kan meerdere functionele rollen per team hebben.

---

## Signals

| Signal | Trigger | Actie |
|--------|---------|-------|
| `post_save(Project)` | Club aanmaak (parent=None) | Auto-create "Heren 1" team + BrandProfile + 6 default tokens |
| `post_save/delete(ProjectMembership)` | Lidmaatschap wijziging | Invalideer permissions cache. Bij delete: cleanup FunctionalRoleAssignment |
| `post_save(Project)` | Privacy wijziging | Invalideer alle project permission cache |

---

## Services

| Service | Doel |
|---------|------|
| `permission_resolution.py` | Resolve effective permissions voor project context |
| `membership_service.py` | Lidmaatschap logica |
| `invitation_service.py` | Uitnodiging flow |
| `promotion_service.py` | Promotie aanvraag/acceptatie |
| `cache_service.py` | Permission cache invalidatie |

---

## Gerelateerde docs

- [branding-tokens.md](branding-tokens.md) — BrandProfile wordt auto-created bij club aanmaak
- [active-context.md](active-context.md) — UserActiveContext navigeert door project hiërarchie
- [rbac-permissions.md](rbac-permissions.md) — Rollen en permissies per project
- [members-batch-actions.md](members-batch-actions.md) — Batch operaties op project members
