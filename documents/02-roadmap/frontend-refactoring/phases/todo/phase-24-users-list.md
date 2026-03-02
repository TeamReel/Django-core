# Phase 24 — UsersList.tsx

**Track:** B (Page Decomposition)
**Status:** 📋 Planned
**Bestand:** `demo/src/pages/identity/UsersList.tsx`
**Huidige regels:** 1540

## Doel

Onder 500 regels brengen door filters, user card en bulk actions te extraheren.

## Aanpak

1. Extract types naar `usersListTypes.ts`
2. Extract filter logic naar `useUsersListFilters.ts` hook
3. Extract `UserCard` component
4. Extract bulk action handlers
5. Thin JSX shell overblijven

## Checklist

- [ ] Types geëxtraheerd
- [ ] Filter hook geëxtraheerd
- [ ] UserCard component geëxtraheerd
- [ ] Bulk actions geëxtraheerd
- [ ] Bestand < 500 regels
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
