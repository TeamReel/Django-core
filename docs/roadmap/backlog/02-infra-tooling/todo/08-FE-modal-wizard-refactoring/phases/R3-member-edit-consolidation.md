# R3 — Member Edit Modals Consolideren

| | |
|---|---|
| Status | 📋 TODO |
| Impact | 🟡 important |
| Effort | ~6 uur |
| Risico | Middel — API-interface verschilt per consumer |

## Wat

Consolideer 3 bijna-identieke member role edit modals naar 1 generieke `MemberRoleEditModal`.

## Huidige situatie: 3 modals

### 1. `MembershipEditModal.tsx` (periods/)
- **Fields**: Access role (admin/viewer), 7 functional roles (coach, player, keeper, assistant, verzorger, supporter, manager)
- **API**: Callback `onSave({ role, functional_roles })` — parent doet API call
- **Gebruikt door**: `ProjectSeasonSquadPage.tsx`
- **Overlay**: Eigen `styles.overlay`

### 2. `EditMemberModal.tsx` (periods/)
- **Fields**: Access role (radio cards: admin/viewer), 4 functional roles (goalkeeper, player, coach, assistant)
- **API**: Roept `projectsApi.updateMember()` direct aan
- **Gebruikt door**: `SeasonSquadTab.tsx`
- **Overlay**: Eigen `s.modalOverlay`

### 3. `CompetitionMembershipEditModal.tsx` (periods/)
- **Fields**: Access role (admin/viewer), 7 functional roles — identiek aan #1
- **API**: Callback `onSave({ role, functional_roles })` — parent doet API call
- **Gebruikt door**: `ProjectCompetitionDetailPage.tsx`
- **Overlay**: Eigen `styles.overlay`

## Verschilanalyse

| Aspect | MembershipEdit | EditMember | CompetitionMembershipEdit |
|--------|---------------|------------|--------------------------|
| Role options | admin/viewer | admin/viewer | admin/viewer |
| Functional roles | 7 | 4 | 7 |
| API pattern | callback | direct call | callback |
| Overlay | standalone | standalone | standalone |

**Conclusie**: `MembershipEditModal` en `CompetitionMembershipEditModal` zijn **identiek**. `EditMemberModal` verschilt in aantal functional roles en API pattern.

## Doel: 1 generieke modal

```tsx
<MemberRoleEditModal
  isOpen={isOpen}
  onClose={onClose}
  member={member}
  functionalRoleOptions={roleOptions}  // Configurable per context
  onSave={handleSave}                  // Unified callback pattern
/>
```

## Aanpak

1. Maak `MemberRoleEditModal.tsx` in `demo/src/components/` (of `demo/src/pages/periods/`)
2. Gebruik shared `Modal` component (R2 moet eerst)
3. `functionalRoleOptions` als prop → context bepaalt welke roles beschikbaar zijn
4. Unified `onSave({ role, functional_roles })` callback
5. Migreer alle 3 consumers
6. Verwijder de 3 oude modals + hun CSS modules

## Checklist

- [ ] Nieuwe `MemberRoleEditModal` component met configureerbare roles
- [ ] Migreer `ProjectSeasonSquadPage.tsx` → nieuwe modal
- [ ] Migreer `SeasonSquadTab.tsx` → nieuwe modal (API call wrappen in callback)
- [ ] Migreer `ProjectCompetitionDetailPage.tsx` → nieuwe modal
- [ ] Verwijder `MembershipEditModal.tsx`
- [ ] Verwijder `EditMemberModal.tsx`
- [ ] Verwijder `CompetitionMembershipEditModal.tsx`
- [ ] Verwijder bijbehorende CSS modules
- [ ] `npx tsc --noEmit` slaagt
- [ ] `npx vite build` slaagt
- [ ] Test: member role bewerken werkt in seizoen squad, competition detail
