# Q002 — ConfirmDialog migratie: window.confirm() → useConfirm()

| | |
|---|---|
| Status | ✅ DONE |
| Bron | UI Review (trash UX audit) |
| Impact | 🟡 important |
| Effort | ~2 uur |

## Wat
Er bestaat een gestylede `ConfirmDialog` component (`demo/src/components/ui/ConfirmDialog.tsx`) met:
- `useConfirm()` hook — imperatieve API: `const ok = await confirm({ title, message, variant: 'danger' })`
- `ConfirmProvider` — al gemount in `AppShell.tsx`
- Support voor danger-variant (rode knop)
- Aanpasbare labels (confirmLabel, cancelLabel)

Maar deze wordt bijna nergens gebruikt. Op **30+ plekken** wordt nog `window.confirm()` aangeroepen:
- Niet-gestyled (browser-native, past niet bij de app)
- Niet-toegankelijk (blokkeert screen readers)
- Niet-consistent met de rest van de UI

## Scope
Alle `window.confirm()` calls in `demo/src/` vervangen door `useConfirm()`.

**Let op:** Q001 (taalconsistentie) kan gelijktijdig worden uitgevoerd — bij de migratie meteen de Nederlandse teksten gebruiken.

## Checklist
- [x] Alle `window.confirm()` calls inventariseren (grep)
- [x] Per bestand: `import { useConfirm } from '@/components/ui/ConfirmDialog'` toevoegen
- [x] `window.confirm(msg)` → `await confirm({ title, message, confirmLabel, cancelLabel, variant })`
- [x] Specifiek voor danger-acties (delete): `variant: 'danger'` gebruiken
- [x] ConfirmDialog default labels aanpassen naar Nederlands ("Bevestigen" / "Annuleren")
- [x] Tests: `npx tsc --noEmit` + `npx vite build`
- [x] Verify: grep op `window.confirm` — 0 resultaten

## Bekende locaties (30+ calls)
| Bestand | Aantal | Context |
|---------|--------|---------|
| `useSquadPageData.ts` | 1 | Membership delete |
| `useCompetitionMutations.ts` | 1 | Membership delete |
| `SeasonHierarchyTab.tsx` | 1 | Competition delete (inline) |
| `SeasonCompetitionsTab.tsx` | 1 | Competition delete (inline) |
| `useUsersListData/handlers.ts` | 2 | Org membership + project membership |
| `useTeamsListData.ts` | 1 | Project delete |
| `useClubsData.ts` | 1 | Project delete |
| `useContentTemplatesData.ts` | 1 | Template delete |
| `useOrgActions.ts` | 1 | Organisation delete |
| `useUserDetailApi.ts` | 1 | User delete |
| `UsersTableActions.tsx` | 2 | User delete + org remove |
| `UserDetailMembershipTabs.tsx` | 3 | Fed/club/team unlink |
| `UserDetailActivityTabs.tsx` | 1 | Match delete |
| `MatchRow.tsx` | 1 | Match delete |
| `files/index.tsx` | 1 | File delete |
| `AppBackgroundsPage.tsx` | 1 | Background delete |
| `TrashSheetContent.tsx` | 2 | Permanent delete + empty trash |
| `useSettingsPage.ts` | 2 | Permanent delete + empty trash |
| `AssetSubComponents.tsx` | 1 | Asset delete |
| `AssetsTabSeasonLevel.tsx` | 1 | Asset delete |
| `MediaAssetCard.tsx` | 2 | Media delete |
| `useProjectsPageData.ts` | 1 | Project delete |

## Reeds gemigreerd (referentie)
- `useMatchActions.ts` — gebruikt `useConfirm()` met Dutch labels ✅
- `ClubOrganisationDetailPage.tsx` — gebruikt `useConfirm()` ✅
- `FederationsList.tsx` — gebruikt `useConfirm()` ✅
- `OrganisationsPage.tsx` — gebruikt `useConfirm()` ✅
