# H6 — Frontend Trash Integratie

> **Effort:** ~4 uur | **Impact:** Trash sectie in Settings + undo toast bij deletes

## Doel

Trash functionaliteit toegankelijk maken in de frontend:
1. Settings pagina krijgt "Prullenbak" sectie
2. Delete acties tonen toast met "Ongedaan maken" knop

## To do

### API Client
- [ ] `demo/src/api/trash.ts` — API client voor trash endpoints
  ```typescript
  export const trashApi = {
    list(opts?: ListOptions): Promise<TrashItem[]>,
    restore(id: string): Promise<void>,
    permanentDelete(id: string): Promise<void>,
    emptyTrash(): Promise<void>,
    getStats(): Promise<TrashStats[]>,
  }
  ```
- [ ] Types toevoegen: `TrashItem`, `TrashStats`, `ContentTypeDetail`

### useTrash Hook
- [ ] `demo/src/hooks/useTrash.ts` — Data fetching + mutations
  - State: `items`, `stats`, `isLoading`, `error`
  - Actions: `restore(id)`, `permanentDelete(id)`, `emptyTrash()`
  - Refetch na mutations

### Settings Trash Sectie
- [ ] Nieuwe sectie in `SettingsPage.tsx` → "Prullenbak"
- [ ] Sectie UI:
  - Stats per type (badge counts)
  - List van trashed items (responsive cards)
  - Filter dropdown op content type
  - Restore knop per item
  - Permanent delete knop (admin only)
  - Empty trash knop (admin only)
- [ ] Empty state: "Prullenbak is leeg"
- [ ] Pagination (max 20 items per page)
- [ ] CSS Module: `TrashSection.module.css`

### Toast met Undo
- [ ] Toast component uitbreiden met action button support
- [ ] Na soft-delete actie: "Verplaatst naar prullenbak" + [Ongedaan maken]
- [ ] Undo onClick → calls `trashApi.restore()`
- [ ] Toast auto-dismiss na 5 seconden
- [ ] Bij undo success: "Hersteld" toast

## Patterns

```tsx
// Toast met undo
const handleDelete = async (item: Item) => {
  const trashItem = await api.delete(`/items/${item.id}/`);
  toast.info('Verplaatst naar prullenbak', {
    action: {
      label: 'Ongedaan maken',
      onClick: async () => {
        await trashApi.restore(trashItem.id);
        toast.success('Hersteld');
      },
    },
    duration: 5000,
  });
};
```

```tsx
// Settings sectie patroon
<SettingsSection title="Prullenbak" icon={<TrashIcon />}>
  <TrashStats stats={stats} />
  <TrashFilters value={filter} onChange={setFilter} />
  <TrashList
    items={filteredItems}
    onRestore={handleRestore}
    onDelete={handlePermanentDelete}
    isAdmin={isAdmin}
  />
</SettingsSection>
```

## Done criteria

- [ ] API client werkt met alle trash endpoints
- [ ] Settings pagina toont "Prullenbak" sectie
- [ ] Trash items worden correct getoond met metadata
- [ ] Filter op content type werkt
- [ ] Restore werkt via UI
- [ ] Permanent delete werkt (admin only zichtbaar)
- [ ] Empty trash werkt (admin only zichtbaar)
- [ ] Delete acties tonen toast met undo knop
- [ ] Undo herstelt item succesvol
- [ ] Toast verdwijnt na 5 seconden
- [ ] Responsive op mobile
- [ ] Geen TypeScript errors (`npx tsc --noEmit`)
