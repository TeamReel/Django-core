# H13 — Multi-Role Tonen & Toewijzen in Selectie UI

| | |
|---|---|
| Status | ✅ DONE |
| Effort | ~4 uur |
| Afhankelijkheid | — |

## Context

Backend ondersteunt al meerdere rollen per member (`ProjectFunctionalRoleAssignment` met unique constraint op `project, user, role`). De frontend toont nu maar één rol per lid. Dit moet uitgebreid worden zodat:

1. Leden meerdere rollen kunnen hebben (bijv. Keeper + Speler)
2. In de Selectie UI alle rollen zichtbaar zijn
3. De role picker meerdere selecties toestaat

## Bestaande backend

**Model**: `ProjectFunctionalRoleAssignment`
```python
class ProjectFunctionalRoleAssignment(TimeStampedModel):
    project = FK(Project)
    user = FK(User)
    role = CharField(choices=FUNCTIONAL_ROLE_CHOICES)
    # UniqueConstraint: (project, user, role)
```

**API**: `POST /api/v1/projects/{id}/functional-roles/assign/`
```json
{ "user_id": "...", "role": "keeper" }
```

## Implementatie

### 1. HubSelectieTab: groepeer per primaire rol, toon badges voor extra rollen

**Bestand**: `demo/src/pages/identity/HubSelectieTab.tsx`

Huidige groepering: Keepers / Spelers / Staf (1 rol per lid)

Nieuwe aanpak:
- Lid verschijnt in groep van primaire rol
- Badge toont extra rollen: `[Bram Gerrits] 🧤 + 👟` (keeper + speler)

```tsx
// Compute all roles per member
const memberRoles = useMemo(() => {
  const map = new Map<string, string[]>();
  for (const m of members) {
    const userId = m.user?.id || m.user_id;
    const roles = m.functional_roles || [m.functional_role].filter(Boolean);
    map.set(userId, roles);
  }
  return map;
}, [members]);

// In render:
<span className={s.roleChip}>
  {primaryRole}
  {extraRoles.length > 0 && (
    <span className={s.extraRoles}>+{extraRoles.length}</span>
  )}
</span>
```

### 2. Role Picker: multi-select

**Bestand**: `demo/src/pages/identity/HubSelectieTab.tsx` (RolePickerPopover)

Verander van single-select naar multi-select:

```tsx
// State: Set<string> instead of string
const [selectedRoles, setSelectedRoles] = useState<Set<string>>(
  new Set(member.functional_roles || [member.functional_role])
);

// Toggle role on click
const toggleRole = (role: string) => {
  const newRoles = new Set(selectedRoles);
  if (newRoles.has(role)) {
    newRoles.delete(role);
  } else {
    newRoles.add(role);
  }
  setSelectedRoles(newRoles);
};

// Save: call API for each role change
const saveRoles = async () => {
  const currentRoles = new Set(member.functional_roles || []);
  const toAdd = [...selectedRoles].filter(r => !currentRoles.has(r));
  const toRemove = [...currentRoles].filter(r => !selectedRoles.has(r));

  for (const role of toAdd) {
    await assignRole(member.user_id, role);
  }
  for (const role of toRemove) {
    await unassignRole(member.user_id, role);
  }
};
```

### 3. API aanpassen voor unassign

**Check**: Bestaat `DELETE /functional-roles/unassign/` endpoint?

Als niet: voeg toe in backend
```python
@action(detail=False, methods=['post'])
def unassign(self, request, project_pk=None):
    user_id = request.data.get('user_id')
    role = request.data.get('role')
    ProjectFunctionalRoleAssignment.objects.filter(
        project_id=project_pk, user_id=user_id, role=role
    ).delete()
    return Response(status=204)
```

### 4. Visual design

```
┌─────────────────────────────────┐
│ 🧤 Keepers                      │
├─────────────────────────────────┤
│ [Avatar] Bram Gerrits  [🧤+👟]  │  ← keeper + ook speler
│ [Avatar] Diederik      [🧤]    │  ← alleen keeper
├─────────────────────────────────┤
│ 👟 Spelers                      │
├─────────────────────────────────┤
│ [Avatar] Jan           [👟]    │
│ [Avatar] Piet          [👟+🏃]  │  ← speler + invaller
└─────────────────────────────────┘
```

## Acceptatiecriteria

- [ ] Leden kunnen meerdere rollen hebben (keeper + speler)
- [ ] Selectie UI toont alle rollen per lid (badge of chips)
- [ ] Role picker is multi-select (checkboxes of toggle)
- [ ] Rol toevoegen: API call `/assign/`
- [ ] Rol verwijderen: API call `/unassign/`
- [ ] Lid verschijnt in groep van primaire rol (eerste toegewezen)
- [ ] WCAG: checkboxes accessible, focus visible
- [ ] TypeScript 0 errors
