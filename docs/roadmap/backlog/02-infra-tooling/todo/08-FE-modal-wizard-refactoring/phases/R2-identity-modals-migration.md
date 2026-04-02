# R2 — Identity Modals → Shared Modal Component

| | |
|---|---|
| Status | 📋 TODO |
| Impact | 🔴 critical |
| Effort | ~12 uur |
| Risico | Middel — veel bestanden, visuele regressie mogelijk |

## Wat

Migreer alle 25+ identity modals naar de shared `ui/Modal` component. Momenteel bouwt elke modal zijn eigen overlay, backdrop, close-handling en layout — inconsistent en foutgevoelig.

## Huidige situatie

Geen enkele modal in `demo/src/pages/identity/` importeert `ui/Modal`. Elke modal heeft:
- Eigen `styles.overlay` of `styles.modalBackdrop` CSS class
- Eigen Escape-key handling (of geen!)
- Eigen focus trap (of geen!)
- Eigen scroll-lock (of geen!)
- Inconsistente sizing, animaties, close-buttons

## Doel

Elke identity modal:
1. Importeert `Modal` uit `components/ui/Modal`
2. Gebruikt `size` prop (sm/md/lg/xl) i.p.v. eigen CSS breedte
3. Krijgt automatisch: backdrop, Escape-key, focus trap, scroll-lock, animatie
4. Eigen CSS bevat alleen **content** styling, niet overlay/backdrop/positioning

## Scope: 25+ bestanden

### CRUD Modals (Org/Club/Team)
| Bestand | Huidige overlay |
|---------|----------------|
| `OrganisationDetailModal.tsx` | `styles.modalBackdrop` |
| `OrganisationEditModal.tsx` | `styles.overlay` |
| `OrganisationCreateModal.tsx` | `styles.overlay` |
| `OrgEditMemberRoleModal.tsx` | `styles.overlay` |

### CRUD Modals (Project/Period)
| Bestand | Huidige overlay |
|---------|----------------|
| `ProjectDetailModal.tsx` | `styles.modalBackdrop` |
| `ProjectEditModal.tsx` | `styles.overlay` |
| `ProjectCreateModal.tsx` | `modal-backdrop` (global class) |
| `PeriodDetailModal.tsx` | `styles.overlay` |
| `PeriodEditModal.tsx` | `styles.overlay` |
| `PeriodCreateModal/Content.tsx` | `styles.overlay` |

### CRUD Modals (User/Member)
| Bestand | Huidige overlay |
|---------|----------------|
| `UserDetailModal.tsx` | `styles.overlay` |
| `UserEditModal.tsx` | `styles.overlay` |
| `CreateUserModal.tsx` | `styles.overlay` |
| `AddMemberModal/index.tsx` | `modal-backdrop` + `modalStyles.backdrop` |
| `InviteMemberModal.tsx` | `styles.overlay` |
| `LinkUserModal.tsx` | `modal-backdrop` (global class) |
| `AssignUserToOrgModal.tsx` | `styles.overlay` |
| `SeasonSquadAddMemberModal.tsx` | `styles.overlay` |
| `MemberBatchActionModal.tsx` | `styles.overlay` |

### Match/Season
| Bestand | Huidige overlay |
|---------|----------------|
| `MatchCreateModal.tsx` | `modal-backdrop` + `styles.backdrop` |
| `MatchDetailModal.tsx` | `styles.overlay` |
| `detail/SeasonPickerModal.tsx` | `styles.overlay` |

### Speciale modals
| Bestand | Huidige overlay |
|---------|----------------|
| `ContentGenerationModal/index.tsx` | `styles.overlay` |

## Aanpak per modal

```tsx
// VOOR:
return (
  <div className={styles.overlay} onClick={onClose}>
    <div className={styles.modal} onClick={e => e.stopPropagation()}>
      <button className={styles.closeButton} onClick={onClose}>×</button>
      <h2>{title}</h2>
      {/* content */}
    </div>
  </div>
);

// NA:
return (
  <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
    {/* content — geen overlay/backdrop/close-button nodig */}
  </Modal>
);
```

## Checklist

- [ ] Audit `ui/Modal` capabilities: welke size presets, header slots, footer slots
- [ ] Migreer Org modals (4 stuks)
- [ ] Migreer Project/Period modals (6 stuks)
- [ ] Migreer User/Member modals (9 stuks)
- [ ] Migreer Match/Season modals (3 stuks)
- [ ] Migreer ContentGenerationModal
- [ ] Verwijder ongebruikte CSS classes (.overlay, .modalBackdrop, .modal-backdrop)
- [ ] Verwijder global `modal-backdrop` class als niet meer nodig
- [ ] `npx tsc --noEmit` slaagt
- [ ] `npx vite build` slaagt
- [ ] Visuele check: elk gemigreerd modal openen, Escape-key, click-outside, focus trap
- [ ] Accessibility: `:focus-visible` op alle interactieve elementen
