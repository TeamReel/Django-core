# S1 — Archive Cleanup

**Status:** 🔲 Todo
**Effort:** 1 uur
**Scope:** 6 files importeren uit `_archive/`, 4 archive files

---

## Doel

`pages/_archive/` bevat oude code die niet meer actief is. Maar 6 actieve files importeren nog types/utils uit archive bestanden. Dit moet opgeruimd worden.

## Importerende files

1. `hooks/useDirectoryFilters.ts`
2. `pages/identity/useClubOrgHierarchy.ts`
3. `pages/identity/useTeamDetailData.ts`
4. `pages/identity/directory/useClubsData.ts`
5. `pages/identity/directory/useTeamsListData.ts`
6. `pages/identity/useClubOrgDetailData.tsx`

## Aanpak

1. Identificeer wat er geïmporteerd wordt uit `_archive/`
2. Verplaats benodigde types/utils naar `types/` of `utils/`
3. Update imports in de 6 files
4. Verifieer dat `_archive/` niet meer geïmporteerd wordt
5. Optioneel: verwijder `_archive/` als het niet meer nodig is

## Verificatie

- [ ] `grep -r '_archive' src/ --include='*.ts' --include='*.tsx' | grep -v '_archive/'` retourneert 0
- [ ] `npx vite build` slaagt
- [ ] Routes naar archive pages nog intact (als ze bestaan)
