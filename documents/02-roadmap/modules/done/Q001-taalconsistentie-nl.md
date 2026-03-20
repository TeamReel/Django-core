# Q001 — Taalconsistentie: alle Engelse strings naar Nederlands

| | |
|---|---|
| Status | ✅ DONE |
| Bron | UI Review (trash UX audit) |
| Impact | 🟡 important |
| Effort | ~3 uur |

## Wat
De app is Nederlandstalig, maar op veel plekken staan nog Engelse teksten:
- **24+ `window.confirm()` berichten** in het Engels ("Are you sure you want to delete...")
- **40+ knoplabels** in het Engels ("View", "Edit", "Delete", "Cancel", "Confirm")
- **Foutmeldingen** in het Engels ("Error deleting season")
- **UI-teksten** zoals "Loading matches…", "No matches.", "Participants:", "Matches:"

Dit zorgt voor een inconsistente gebruikerservaring.

## Scope
Alleen de frontend (`demo/src/`). Backend API responses blijven Engels (standaard voor APIs).

## Checklist
- [x] Alle `window.confirm()` berichten vertalen naar Nederlands
- [x] Alle knoplabels vertalen (View→Bekijken, Edit→Bewerken, Delete→Verwijderen, Cancel→Annuleren)
- [x] Foutmeldingen in catch-blokken vertalen
- [x] Overige UI-teksten (pills, loading states, empty states) vertalen
- [x] Verify: grep op veelvoorkomende Engelse termen om restanten te vinden
- [x] Tests: `npx tsc --noEmit` + `npx vite build`

## Bekende locaties (uit audit)
| Bestand | Wat |
|---------|-----|
| `SeasonHierarchyTab.tsx` | View/Edit/Delete knoppen, "Participants:", "Matches:", "Loading matches…", "No matches." |
| `CompetitionMatchesTable.tsx` | View/Edit knoppen |
| `CompetitionHierarchyTab.tsx` | View/Edit knoppen, "Participants:" |
| `ProjectSeasonSquadPage.tsx` | View/Edit/Delete knoppen |
| `ProjectCompetitionDetailPage.tsx` | View/Edit/Delete knoppen |
| `UserDetailPage.tsx` | View/Edit/Delete knoppen |
| `UserDetailMembershipTabs.tsx` | View/Edit/Delete (3x), Engelse confirm berichten |
| `UserDetailActivityTabs.tsx` | View/Edit/Delete, Engelse confirm |
| `TeamsListTable.tsx` | View/Edit knoppen |
| `useSquadPageData.ts` | Engelse confirm voor membership delete |
| `useCompetitionMutations.ts` | Engelse confirm voor membership delete |
| `useUsersListData/handlers.ts` | Engelse confirm berichten |
| `useTeamsListData.ts` | Engelse confirm |
| `useClubsData.ts` | Engelse confirm |
| `useContentTemplatesData.ts` | Engelse confirm |
| `useOrgActions.ts` | Engelse confirm |
| `useUserDetailApi.ts` | Engelse confirm |
| `UsersTableActions.tsx` | Engelse confirm |
| `MatchRow.tsx` | Engelse confirm |
| `files/index.tsx` | Engelse confirm |
| `AppBackgroundsPage.tsx` | Engelse confirm |
| `ProjectsPage.tsx` | Cancel knop |
| `UserEditModal.tsx` | Cancel knop |
| `ApprovalsJobList.tsx` | Cancel knop |
| `SquadMemberMobileList.tsx` | Edit knop |
| `FavoritesPage.tsx` | title="Remove" |
| `RecentsPage.tsx` | title="Remove" |
