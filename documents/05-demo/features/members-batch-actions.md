# Members Batch Actions

**Last Updated:** 2026-02-27
**Status:** Implemented
**Related:** [RBAC Permissions](rbac-permissions.md) | [Project Hierarchy](project-hierarchy.md)

---

## Overzicht

Batch-acties op de Members pagina maken het mogelijk om meerdere leden tegelijk te selecteren en acties uit te voeren. Dit werkt op drie niveaus:

1. **Organisatie pagina** (`/knvb?tab=members`) — overzicht alle members
2. **Club pagina** (`/knvb/asc?tab=members`) — club-level batch acties
3. **Team pagina** (`/knvb/asc/helden-6?tab=members`) — team-level batch acties

---

## Beschikbare Batch Acties

### Rol Wijzigen

**Club pagina** (clubLocked):
| Actie | API-effect | RBAC resultaat |
|-------|-----------|----------------|
| → Club Admin | `PATCH /projects/{club_id}/members/{pm_id}/ { role: "admin" }` | Club Admin rol |
| → Supporter | `PATCH /projects/{club_id}/members/{pm_id}/ { role: "viewer" }` | Supporter rol |

**Team pagina** (teamLocked):
| Actie | API-effect | RBAC resultaat |
|-------|-----------|----------------|
| → Team Admin | `PATCH /projects/{team_id}/members/{pm_id}/ { role: "admin" }` | Team Admin rol |
| → Team Member | `PATCH /projects/{team_id}/members/{pm_id}/ { role: "viewer" }` | Team Member rol |

> **RBAC Sync:** Het backend sync automatisch de RBAC RoleAssignment bij elke role-wijziging via `sync_rbac_for_membership()`.

### Toewijzen aan Team (alleen club-pagina)

Voegt geselecteerde members toe aan een team als viewer (Team Member).

| API | Body |
|-----|------|
| `POST /projects/{team_id}/members/` | `{ user_id: <int>, role: "viewer" }` |

### Verwijderen

**Club pagina:** `DELETE /organisations/{slug}/members/{membership_id}/`
**Team pagina:** `DELETE /projects/{team_id}/members/{pm_id}/`

---

## RBAC Mapping

De batch acties sluiten direct aan bij de RBAC config:

```
Club pagina:
  admin  → Club Admin (21/23 permissions)
  viewer → Supporter  (1/23 permissions)

Team pagina:
  admin  → Team Admin  (17/23 permissions)
  viewer → Team Member (7/23 permissions)
```

Dit volgt de bestaande logica uit `sync_rbac_for_membership()`:
- ProjectMembership `role=admin` op club (parent=NULL) → Club Admin
- ProjectMembership `role=viewer` op club (parent=NULL) → Supporter
- ProjectMembership `role=admin` op team (parent≠NULL) → Team Admin
- ProjectMembership `role=viewer` op team (parent≠NULL) → Team Member

---

## UI Pattern

### Select-and-Act toolbar

1. **Checkbox kolom** — eerste kolom in de tabel
2. **Select All** — checkbox in de header selecteert/deselecteert alle zichtbare rijen
3. **Batch toolbar** — verschijnt boven de tabel wanneer ≥1 rij geselecteerd is:
   - `{n} geselecteerd` — teller
   - `→ Club Admin` / `→ Team Admin` — primary button
   - `→ Supporter` / `→ Team Member` — secondary button
   - `Toewijzen aan team…` — dropdown (alleen club-pagina)
   - `Verwijderen` — danger button (rechts)

4. **Bevestigingsmodal** — opent bij elke batch actie met:
   - Titel (actie type)
   - Beschrijving (hoeveel members, wat wordt gewijzigd)
   - Annuleren / Bevestigen knoppen
   - Loading state tijdens uitvoering

### Visuele feedback

- Geselecteerde rijen krijgen een blauwe achtergrond (`rgba(59,130,246,0.08)`)
- Selectie wordt automatisch gewist na een batch actie of wanneer de data herlaad wordt
- Batch knoppen zijn disabled tijdens uitvoering

---

## Voorbeeld Flow

### Club Admin wijzigt rollen

1. Ga naar `/knvb/asc?tab=members`
2. Vink 5 members aan
3. Klik `→ Club Admin`
4. Bevestigingsmodal: "Weet je zeker dat je de rol van 5 member(s) wilt wijzigen naar Club Admin?"
5. Klik `Bevestigen`
6. Backend: 5× PATCH `/api/v1/projects/{asc_id}/members/{pm_id}/ { role: "admin" }`
7. RBAC sync: 5× `sync_rbac_for_membership()` → Club Admin role toewijzing
8. Tabel herlaadt, selectie gewist

### Team Admin wijst members toe aan team

1. Ga naar `/knvb/asc?tab=members`
2. Vink 3 members aan
3. Selecteer team in `Toewijzen aan team…` dropdown
4. Bevestigingsmodal: "Weet je zeker dat je 3 member(s) wilt toewijzen aan Helden 6?"
5. Klik `Bevestigen`
6. Backend: 3× POST `/api/v1/projects/{helden6_id}/members/ { user_id, role: "viewer" }`
7. Tabel herlaadt

---

## Technische Details

### Component: `MemberBatchActionModal` + `useMemberBatchAction` hook

Batch-logica is geïsoleerd in dedicated bestanden (gerefactored uit `UsersList.tsx`):

- `pages/identity/MemberBatchActionModal.tsx` — UI component
- `pages/identity/useMemberBatchAction.ts` — State + API logica
- `pages/identity/memberBatchAction.types.ts` — Type definities
- `pages/identity/memberBatchAction.styles.ts` — Styling

**Hook state (`useMemberBatchAction`):**
- `selectedIds: Set<string>` — geselecteerde user IDs
- `batchUpdating: boolean` — loading state
- `batchConfirm: { action, role?, teamId?, teamName? } | null` — confirmation modal state

**Batch execution functions:**
- `executeBatchRoleChange(newRole)` — PATCH membership role
- `executeBatchAssignTeam(teamId)` — POST new team membership
- `executeBatchDelete()` — DELETE membership

### API Endpoints Gebruikt

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PATCH | `/api/v1/projects/{id}/members/{pm_id}/` | Update membership role |
| POST | `/api/v1/projects/{id}/members/` | Add user to project |
| DELETE | `/api/v1/projects/{id}/members/{pm_id}/` | Remove from team |
| DELETE | `/api/v1/organisations/{slug}/members/{id}/` | Remove from org |

### Backend RBAC Sync

De `update()` methode in `ProjectMembershipViewSet` roept automatisch `sync_rbac_for_membership()` aan wanneer de rol wijzigt. Dit zorgt ervoor dat RBAC RoleAssignments altijd consistent zijn met de ProjectMembership rollen.
